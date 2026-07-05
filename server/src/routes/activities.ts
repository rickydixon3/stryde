import { Router } from 'express';
import { supabase } from '../supabase';
import { computeConsecutiveHardDays } from '../signals/consecutiveHardDays';
import { checkCalibration, computeBaselines } from '../signals/../utils/baselines';
import { computeCardiacDrift, computeRunDrift } from '../signals/cardiacDrift';
import { classifyEffortByHRR, computeHrrBaselines } from '../signals/runEfficiency';
import { getEFResults } from '../utils/efPipeline';
import { AuthenticatedRequest, requireAuth } from '../middleware/requireAuth';
import { syncActivities, syncStreams } from '../utils/sync';
import { computeSingleSessionSpike } from '../signals/singleSessionSpike';

const router = Router();

// SYNCING ACTIVITIES
router.get('/sync', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.userId)
        .single();

    await syncActivities(user);
    res.json({ message: 'sync complete' });
});

router.get('/sync-streams', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.userId)
        .single();

    await syncStreams(user);
    res.json({ message: 'streams synced' });
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
    const { data: user } = await supabase
        .from('users')
        .select('resting_hr, max_hr')
        .eq('id', req.userId)
        .single();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: recentActivities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', req.userId)
        .gte('start_date', sevenDaysAgo.toISOString());

    const activityIds = recentActivities.map(activity => activity.id);

    const { data: recentStreams } = await supabase
        .from('activity_streams')
        .select('*')
        .in('activity_id', activityIds)

    const activitesWithStreams = recentActivities.map(activity => ({
        ...activity,
        stream: recentStreams.find(stream => stream.activity_id === activity.id)
    }));

    res.json(computeCardiacDrift(activitesWithStreams, user.resting_hr, user.max_hr));
});

router.get('/chd', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', req.userId);
    
    const result = computeConsecutiveHardDays(activities);
    res.json(result);
});

router.get('/efficiency-trend', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { results } = await getEFResults(req.userId)
    res.json(results)
  })

  router.get('/ef-summary', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { results, recentActivities } = await getEFResults(req.userId)

    const qualifying = results.filter(r =>
        r.effortLevel === 'easy' || r.effortLevel === 'moderate')

    if (qualifying.length === 0) {
        return res.json({
            currentEF: 0,
            pctChange: 0,
            totalRuns: recentActivities.length,
            qualifyingRuns: 0,
            dateRange: null,
            dataPoints: []
        })
    }

    const firstDate = new Date(qualifying[0].date)
    const lastDate = new Date(qualifying[qualifying.length - 1].date)

    const firstWindowEnd = new Date(firstDate)
    firstWindowEnd.setDate(firstWindowEnd.getDate() + 14)

    const lastWindowStart = new Date(lastDate)
    lastWindowStart.setDate(lastWindowStart.getDate() - 14)

    const firstWindow = qualifying.filter(run => {
        const runDate = new Date(run.date)
        return runDate <= firstWindowEnd
    })

    const lastWindow = qualifying.filter(run => {
        const runDate = new Date(run.date)
        return runDate >= lastWindowStart
    })

    const firstAvg = firstWindow.reduce((sum, run) => sum + run.efValue, 0) / firstWindow.length
    const lastAvg = lastWindow.reduce((sum, run) => sum + run.efValue, 0) / lastWindow.length
    const pctChange = Math.round(((lastAvg - firstAvg) / firstAvg) * 10000) / 100
    const currentEF = qualifying[qualifying.length - 1]?.efValue ?? 0

    res.json({
      currentEF,
      pctChange,
      totalRuns: recentActivities.length,
      qualifyingRuns: qualifying.length,
      dateRange: {
        start: results[0].date,
        end: results[results.length - 1].date
      },
      dataPoints: results.map(r => ({
        date: r.date,
        efValue: r.efValue,
        effortLevel: r.effortLevel
      }))
    })
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

    const { data: allActivities } = await supabase
        .from('activities')
        .select('average_heartrate')
        .eq('user_id', req.userId);

    const hrrThresholds = computeHrrBaselines(allActivities, user.resting_hr, user.max_hr)

    const { results, activitiesWithStreams, baselines } = await getEFResults(req.userId)

    const MAX_REASONABLE_PACE_SECONDS = 20 * 60;

    const feed = activitiesWithStreams.map(activity => {
      const efResult = results.find(r => r.activityId === activity.id)
      const drift = computeRunDrift(activity, user.resting_hr, user.max_hr)

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
        efValue: efResult?.efValue ?? null,
        effortLevel,
        drift: drift.viable ? drift.drift : null,
        driftFlag: drift.viable ? drift.flag : null
      }
    })

    res.json(feed.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ))
  })

export default router