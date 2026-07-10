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