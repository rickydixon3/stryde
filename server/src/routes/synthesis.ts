// AI synthesis route -- its own router, mounted separately from activitiesRoutes
// at /synthesis in index.ts, since this route calls an external paid API
// (Claude) rather than just reading from Supabase like the routes in
// activities.ts.
//
// Post-compute-once-migration: this route no longer fetches or touches
// activity_streams at all. EF, drift, and effort_level are precomputed at
// sync time and stored directly on the activities table (see
// utils/sync.ts's syncStreams and the one-time backfill script), so every
// signal here is built from plain SELECTs, not live computation from raw
// streams.
//
// Caching: synthesis is expensive (a real LLM call, plus signal
// aggregation) and rarely needs to change moment-to-moment, so results are
// cached on the users table (cached_synthesis, cached_synthesis_at) and
// only recomputed when EITHER the cache is from a previous calendar day OR
// a new run has been logged since the cache was written -- whichever comes
// first invalidates it. cached_synthesis stores {headline, detail,
// signalFacts} as a JSON string -- signalFacts is cached alongside the text
// so the frontend's badge (derived from signalFacts' flags) stays
// consistent with the cached headline/detail, rather than going
// stale/contradictory on a cache hit.
//
// Response format: the Anthropic call returns { headline, detail } as JSON
// (see synthesisPrompt.ts's Output Format section). The model sometimes
// wraps this in markdown code fences despite being told not to, so the
// response is defensively stripped of fences before parsing -- same
// pattern used in scripts/testSynthesis.ts.
//
// Compliance note: this is a plain backend -> Claude API call (fetch to
// api.anthropic.com), not an agent/tool-use pattern -- required per Strava API
// Agreement §5.16(b), which prohibits MCP-server/agent-mediated exposure of
// Strava-derived data.

import { Router } from 'express';
import { supabase } from '../supabase';
import { AuthenticatedRequest, requireAuth } from '../middleware/requireAuth';

import { computeBaselines } from '../utils/baselines';
import { computeConsecutiveHardDays } from '../signals/consecutiveHardDays';
import { aggregateDriftValues } from '../signals/cardiacDrift';
import { computeSingleSessionSpike } from '../signals/singleSessionSpike';
import { computeEfSummary } from '../signals/efSummary';
import { getEFResults } from '../utils/efPipeline';

import { buildSignalFacts, SignalResults } from '../signals/signalFactBuilder';
import { SYNTHESIS_SYSTEM_PROMPT } from '../signals/synthesisPrompt';

const router = Router();

interface SynthesisContent {
  headline: string;
  detail: string;
  signalFacts: import('../signals/signalFact').SignalFact[];
}

function parseAsUtc(dateStr: string): Date {
  const hasTimezone = /Z|[+-]\d{2}:?\d{2}$/.test(dateStr);
  return new Date(hasTimezone ? dateStr : dateStr + 'Z');
}

function isCacheValid(cachedAt: string | null, mostRecentActivityDate: string | null): boolean {
  if (!cachedAt) return false;

  const cachedDate = parseAsUtc(cachedAt);
  const now = new Date();
  const isSameCalendarDay =
    cachedDate.getUTCFullYear() === now.getUTCFullYear() &&
    cachedDate.getUTCMonth() === now.getUTCMonth() &&
    cachedDate.getUTCDate() === now.getUTCDate();

  if (!isSameCalendarDay) return false;

  if (mostRecentActivityDate) {
    const newestRun = parseAsUtc(mostRecentActivityDate);
    if (newestRun > cachedDate) return false;
  }

  return true;
}

// Defensive: strip markdown code fences if the model wraps its JSON
// despite being told not to -- observed in real testing. Shared logic
// with scripts/testSynthesis.ts's parser.
function parseAnthropicResponse(rawText: string): { headline: string; detail: string } | null {
  const stripped = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(stripped);
    if (typeof parsed.headline !== 'string' || typeof parsed.detail !== 'string') {
      return null;
    }
    return { headline: parsed.headline, detail: parsed.detail };
  } catch {
    return null;
  }
}

// Parses the cached blob (headline + detail + signalFacts, written by
// this route itself) -- different shape from parseAnthropicResponse,
// which only ever sees headline/detail since the model doesn't know
// about signalFacts.
function parseCachedContent(rawText: string): SynthesisContent | null {
  try {
    const parsed = JSON.parse(rawText);
    if (
      typeof parsed.headline !== 'string' ||
      typeof parsed.detail !== 'string' ||
      !Array.isArray(parsed.signalFacts)
    ) {
      return null;
    }
    return parsed as SynthesisContent;
  } catch {
    return null;
  }
}

router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('resting_hr, max_hr, cached_synthesis, cached_synthesis_at')
      .eq('id', req.userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: allActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', req.userId);

    if (!allActivities) {
      return res.status(500).json({ error: 'Failed to load activities' });
    }

    const mostRecentActivityDate = allActivities.length > 0
      ? allActivities.reduce((latest, a) =>
          new Date(a.start_date) > new Date(latest) ? a.start_date : latest,
          allActivities[0].start_date
        )
      : null;

    // --- Cache check ---
    if (isCacheValid(user.cached_synthesis_at, mostRecentActivityDate)) {
      const cached = user.cached_synthesis ? parseCachedContent(user.cached_synthesis) : null;
      if (cached) {
        return res.json({
          headline: cached.headline,
          detail: cached.detail,
          signalFacts: cached.signalFacts,
          cached: true,
        });
      }
      // Cached value exists but failed to parse (e.g. written before this
      // headline/detail/signalFacts format existed) -- fall through and
      // recompute rather than serve garbage.
    }

    // --- Cache miss: recompute from scratch ---

    const baselines = computeBaselines(allActivities);

    const trainingLoad = computeConsecutiveHardDays(allActivities, baselines);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const recentActivitiesForDrift = allActivities.filter(
      a => new Date(a.start_date) >= sevenDaysAgo
    );
    const cardiacDrift = aggregateDriftValues(recentActivitiesForDrift);

    const sessionSpike = computeSingleSessionSpike(allActivities);

    const { results: efResults } = await getEFResults(req.userId);
    const efSummary = computeEfSummary(efResults);

    const signalResults: SignalResults = {
      trainingLoad,
      cardiacDrift,
      sessionSpike,
      efSummary,
    };

    const signalFacts = buildSignalFacts(signalResults);

    if (signalFacts.length === 0) {
      return res.json({
        headline: null,
        detail: null,
        reason: 'No viable signal data available yet.',
        cached: false,
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not set');
      return res.status(500).json({ error: 'Synthesis is not configured' });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        temperature: 0.2,
        system: SYNTHESIS_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: JSON.stringify({ signalFacts }) },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error(`Anthropic API error: ${anthropicResponse.status} ${errText}`);
      return res.status(502).json({ error: 'Synthesis request failed' });
    }

    const data = await anthropicResponse.json();
    const textBlocks = (data.content ?? [])
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text);

    const rawText = textBlocks.join('\n');
    const parsed = parseAnthropicResponse(rawText);

    if (!parsed) {
      console.error('Failed to parse synthesis response as JSON:', rawText);
      return res.status(502).json({ error: 'Synthesis response was malformed' });
    }

    const content: SynthesisContent = {
      headline: parsed.headline,
      detail: parsed.detail,
      signalFacts,
    };

    const { error: updateError } = await supabase
      .from('users')
      .update({
        cached_synthesis: JSON.stringify(content),
        cached_synthesis_at: new Date().toISOString(),
      })
      .eq('id', req.userId);

    if (updateError) {
      console.error('Failed to write synthesis cache:', updateError);
    }

    res.json({
      headline: content.headline,
      detail: content.detail,
      signalFacts: content.signalFacts,
      cached: false,
    });
  } catch (err) {
    console.error('Synthesis route error:', err);
    res.status(500).json({ error: 'Internal error building synthesis' });
  }
});

export default router;