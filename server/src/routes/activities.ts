import { Router } from 'express';
import { supabase } from '../supabase';
import { checkCalibration, computeBaselines } from '../signals/../utils/baselines';
import { aggregateDriftValues} from '../signals/cardiacDrift';
import { classifyEffortByHRR, computeHrrBaselines } from '../signals/runEfficiency';
import { getEFResults } from '../utils/efPipeline';
import { AuthenticatedRequest, requireAuth } from '../middleware/requireAuth';
import { syncActivities, syncStreams } from '../utils/sync';
import { computeSingleSessionSpike } from '../signals/singleSessionSpike';
import { computeTrainingLoad } from '../signals/trainingload';
import { getValidAccessToken } from '../utils/strava';
import { computeRunDrift } from '../signals/cardiacDrift';
import { computeRunEfficiency } from '../signals/runEfficiency';
import { computeTrimp } from '../signals/trimp';

const router = Router();

// SYNCING ACTIVITIES
router.get('/sync', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();

  if (!user) {
      return res.status(404).json({ error: 'User not found' });
  }

  await syncActivities(user);
  res.json({ message: 'sync complete' });
});

router.get('/sync-streams', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();

  if (!user) {
      return res.status(404).json({ error: 'User not found' });
  }

  await syncStreams(user);
  res.json({ message: 'streams synced' });
});

// route for manual sync
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

router.post('/sync-now', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.userId)
        .single();

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (user.last_manual_sync_at) {
        const lastSync = new Date(user.last_manual_sync_at).getTime();
        const elapsed = Date.now() - lastSync;
        if (elapsed < SYNC_COOLDOWN_MS) {
            const secondsRemaining = Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000);
            return res.status(429).json({
                error: 'Please wait before syncing again',
                secondsRemaining
            });
        }
    }

    try {
        await syncActivities(user);
        await syncStreams(user);

        await supabase
            .from('users')
            .update({ last_manual_sync_at: new Date().toISOString() })
            .eq('id', req.userId);

        res.json({ message: 'Sync complete' });
    } catch (err) {
        console.error('Manual sync failed:', err);
        res.status(500).json({ error: 'Sync failed, please try again' });
    }
});

const RECOMPUTE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // once per day

router.post('/recompute-history', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.userId)
        .single();

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (!user.resting_hr || !user.max_hr) {
        return res.status(400).json({ error: 'Set your resting and max heart rate first' });
    }

    if (user.last_recompute_at) {
        const elapsed = Date.now() - new Date(user.last_recompute_at).getTime();
        if (elapsed < RECOMPUTE_COOLDOWN_MS) {
            const hoursRemaining = Math.ceil((RECOMPUTE_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
            return res.status(429).json({
                error: 'Please wait before recomputing again',
                hoursRemaining
            });
        }
    }

    try {
        const accessToken = await getValidAccessToken(user);

        const { data: allActivities } = await supabase
            .from('activities')
            .select('*')
            .eq('user_id', user.id);

        const baselines = computeBaselines(allActivities ?? []);

        for (const activity of allActivities ?? []) {
            const response = await fetch(`https://www.strava.com/api/v3/activities/${activity.strava_id}/streams?keys=time,heartrate,cadence,velocity_smooth,altitude&key_by_type=true`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const streamData = await response.json();

            const activityWithStream = {
                ...activity,
                stream: {
                    time: streamData.time?.data ?? null,
                    heartrate: streamData.heartrate?.data ?? null,
                    cadence: streamData.cadence?.data ?? null,
                    velocity: streamData.velocity_smooth?.data ?? null,
                    altitude: streamData.altitude?.data ?? null,
                },
            };

            const efResult = computeRunEfficiency(activityWithStream, user.resting_hr, user.max_hr, baselines);
            const driftResult = computeRunDrift(activityWithStream, user.resting_hr, user.max_hr);
            const trimpScore = computeTrimp(activity, user.resting_hr, user.max_hr);

            const updatePayload: Record<string, number | string | null> = {
                ef_value: null, effort_level: null,
                drift_percent: null, drift_flag: null,
                ef_first_half: null, ef_last_half: null,
                trimp_score: null,
            };

            if (efResult.viable) {
                updatePayload.ef_value = efResult.efValue;
                updatePayload.effort_level = efResult.effortLevel;
            }
            if (driftResult.viable) {
                updatePayload.drift_percent = driftResult.drift;
                updatePayload.drift_flag = driftResult.flag;
                updatePayload.ef_first_half = driftResult.efFirstHalf;
                updatePayload.ef_last_half = driftResult.efLastHalf;
            }
            if (trimpScore !== null) {
                updatePayload.trimp_score = trimpScore;
            }

            await supabase.from('activities').update(updatePayload).eq('id', activity.id);
        }

        await supabase
            .from('users')
            .update({ last_recompute_at: new Date().toISOString() })
            .eq('id', req.userId);

        res.json({ message: 'History recomputed successfully' });
    } catch (err) {
        console.error('Recompute history failed:', err);
        res.status(500).json({ error: 'Recompute failed, please try again' });
    }
});

// Route to test calibrations and baselines
router.get('/test-baselines', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data: activities } = await supabase.from('activities').select('*').eq('user_id', req.userId);
    const calibration = checkCalibration(activities);
    const baselines = computeBaselines(activities);
    res.json({ calibration, baselines });
});

// Route to test Single Session Spike
router.get('/cardiac-drift', requireAuth, async (req: AuthenticatedRequest, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data: recentActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', req.userId)
      .gte('start_date', sevenDaysAgo.toISOString());

  res.json(aggregateDriftValues(recentActivities ?? []));
});

router.get('/training-load', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', req.userId);

  const baselines = computeBaselines(activities);
  const result = computeTrainingLoad(activities, baselines);
  res.json(result);
});

router.get('/efficiency-trend', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { results } = await getEFResults(req.userId)
  res.json(results)
})

router.get('/spike', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', req.userId);

    
    const result = computeSingleSessionSpike(activities);
    res.json(result);
});

// for training page
router.get('/feed', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { data: user } = await supabase
      .from('users')
      .select('resting_hr, max_hr')
      .eq('id', req.userId)
      .single();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { data: allActivities } = await supabase
      .from('activities')
      .select('average_heartrate')
      .eq('user_id', req.userId);

  const hrrThresholds = computeHrrBaselines(allActivities, user.resting_hr, user.max_hr)

  const { recentActivities } = await getEFResults(req.userId)

  const MAX_REASONABLE_PACE_SECONDS = 20 * 60;

  const feed = recentActivities.map(activity => {
    const paceSecondsPerMile = activity.average_speed > 0
      ? 1609.34 / activity.average_speed
      : null

    const avgPaceSeconds = paceSecondsPerMile !== null && paceSecondsPerMile <= MAX_REASONABLE_PACE_SECONDS
      ? Math.round(paceSecondsPerMile)
      : null

    const effortLevel = activity.average_heartrate
      ? classifyEffortByHRR(activity.average_heartrate, user.resting_hr, user.max_hr, hrrThresholds)
      : null

    return {
      activityId: activity.id,
      stravaId: activity.strava_id,
      stravaUrl: `https://www.strava.com/activities/${activity.strava_id}`,
      name: activity.name,
      date: activity.start_date,
      distance: activity.distance,
      duration: activity.duration,
      avgPaceSeconds,
      avgHeartrate: activity.average_heartrate ?? null,
      efValue: activity.ef_value ?? null,
      effortLevel,
      drift: activity.drift_percent ?? null,
      driftFlag: activity.drift_flag ?? null,
      trimpScore: activity.trimp_score ?? null
}
  })

  res.json(feed.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ))
})

export default router