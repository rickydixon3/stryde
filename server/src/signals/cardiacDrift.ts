import { computeGradeAdjustedVelocity } from "../utils/gradeAdjustedPace";

const MOVING_THRESHOLD = 1.33; // m/s, ~20 min/mile - filters out stops, not real running

// Single shared threshold classifier -- was previously duplicated inside both
// computeRunDrift and computeCardiacDrift; now defined once and reused
// everywhere, including the new post-migration aggregation function below.
export const getFlag = (d: number): string => {
  if (d < 5) return 'stable'
  if (d < 10) return 'moderate'
  return 'significant'
}

// Function for single runs
export const computeRunDrift = (activity, restingHr: number, maxHr: number) => {
  if (!activity.stream || !activity.stream.heartrate || !activity.stream.velocity || !activity.stream.altitude || !activity.stream.time) {
    return { viable: false, drift: null, flag: null, efFirstHalf: null, efLastHalf: null }
  }

  const gapVelocity = computeGradeAdjustedVelocity(
      activity.stream.velocity,
      activity.stream.altitude,
      activity.stream.time
  );

  const cleaned = gapVelocity
    .map((v, i) => ({ velocity: v, heartrate: activity.stream.heartrate[i] }))
    .filter(point => point.velocity > MOVING_THRESHOLD)
  
    if (cleaned.length === 0) return { viable: false, drift: null, flag: null, efFirstHalf: null, efLastHalf: null }
  
    const cleanVelocity = cleaned.map(p => p.velocity)
    const cleanHeartrate = cleaned.map(p => p.heartrate)
  
    const overallAvgHR = cleanHeartrate.reduce((sum, h) => sum + h, 0) / cleanHeartrate.length
    const warmupThreshold = overallAvgHR * 0.9
    const steadyIndex = cleanHeartrate.findIndex(hr => hr >= warmupThreshold)
  
    const velocity = cleanVelocity.slice(steadyIndex)
    const heartrate = cleanHeartrate.slice(steadyIndex)
  
    const sliceLength = Math.floor(velocity.length * 0.5)
    if (sliceLength === 0) return { viable: false, drift: null, flag: null, efFirstHalf: null, efLastHalf: null }
  
    const velFirstHalfAvg = velocity.slice(0, sliceLength).reduce((sum, v) => sum + v, 0) / sliceLength
    const velLastHalfAvg = velocity.slice(-sliceLength).reduce((sum, v) => sum + v, 0) / sliceLength
    const hrFirstHalfAvg = heartrate.slice(0, sliceLength).reduce((sum, h) => sum + h, 0) / sliceLength
    const hrLastHalfAvg = heartrate.slice(-sliceLength).reduce((sum, h) => sum + h, 0) / sliceLength

    const hrrFirstHalf = (hrFirstHalfAvg - restingHr) / (maxHr - restingHr)
    const hrrLastHalf = (hrLastHalfAvg - restingHr) / (maxHr - restingHr)

    if (isNaN(hrrFirstHalf) || isNaN(hrrLastHalf) || hrrFirstHalf <= 0 || hrrLastHalf <= 0) {
      return { viable: false, drift: null, flag: null, efFirstHalf: null, efLastHalf: null }
    }

    const efFirstHalf = velFirstHalfAvg / hrrFirstHalf
    const efLastHalf = velLastHalfAvg / hrrLastHalf
    const drift = ((efFirstHalf - efLastHalf) / efFirstHalf) * 100

    return {
      viable: true,
      drift: Math.round(drift * 10) / 10,
      flag: getFlag(drift),
      efFirstHalf: Math.round(efFirstHalf * 10000) / 10000,
      efLastHalf: Math.round(efLastHalf * 10000) / 10000
    }
  }

  

// Function for batch of runs -- still used by the backfill script and
// syncStreams, which still operate on raw stream data at compute time.
export const computeCardiacDrift = (activitiesWithStreams, restingHr: number, maxHr: number) => {
    let totalDrift = 0
    let validRunCount = 0
    let worstRun = null
    let worstDrift = -Infinity
    let mostRecentRun = null
    let mostRecentDate = new Date(0)
    let mostRecentResult = null
  
    for (const activity of activitiesWithStreams) {
      const result = computeRunDrift(activity, restingHr, maxHr)
      if (!result.viable) continue
  
      totalDrift += result.drift
      validRunCount++
  
      if (result.drift > worstDrift) {
        worstDrift = result.drift
        worstRun = activity
      }
  
      if (new Date(activity.start_date) > mostRecentDate) {
        mostRecentDate = new Date(activity.start_date)
        mostRecentRun = activity
        mostRecentResult = result
      }
    }
  
    if (validRunCount === 0) {
      return { viable: false, reason: 'No runs with heart rate and velocity data in the last 7 days' }
    }
  
    const averageDrift = totalDrift / validRunCount
  
    return {
      viable: true,
      averageDrift: Math.round(averageDrift * 10) / 10,
      flag: getFlag(averageDrift),
      worstRun: worstRun ? {
        name: worstRun.name,
        date: worstRun.start_date,
        drift: Math.round(worstDrift * 10) / 10
      } : null,
      mostRecentRun: mostRecentRun && mostRecentResult ? {
        name: mostRecentRun.name,
        date: mostRecentRun.start_date,
        drift: mostRecentResult.drift,
        efFirstHalf: mostRecentResult.efFirstHalf,
        efLastHalf: mostRecentResult.efLastHalf
      } : null
    }
  }

// Aggregates ALREADY-COMPUTED drift values (post-migration shape, where
// drift_percent/drift_flag/ef_first_half/ef_last_half already exist as
// columns on `activities`), rather than computing drift from raw streams.
// Used by the post-migration /cardiac-drift route, which no longer has
// access to activity_streams at all.
interface PrecomputedDriftActivity {
  name: string;
  start_date: string;
  drift_percent: number;
  ef_first_half?: number | null;
  ef_last_half?: number | null;
}

export const aggregateDriftValues = (activities: PrecomputedDriftActivity[]) => {
  const viable = activities.filter(a => a.drift_percent !== null && a.drift_percent !== undefined);

  if (viable.length === 0) {
    return { viable: false, reason: 'No runs with heart rate and velocity data in the last 7 days' };
  }

  const averageDrift = viable.reduce((sum, a) => sum + a.drift_percent, 0) / viable.length;

  const sortedByRecency = [...viable].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );
  const mostRecent = sortedByRecency[0];

  const sortedByWorst = [...viable].sort((a, b) => b.drift_percent - a.drift_percent);
  const worst = sortedByWorst[0];

  return {
    viable: true,
    averageDrift: Math.round(averageDrift * 10) / 10,
    flag: getFlag(averageDrift),
    worstRun: {
      name: worst.name,
      date: worst.start_date,
      drift: worst.drift_percent,
    },
    mostRecentRun: {
      name: mostRecent.name,
      date: mostRecent.start_date,
      drift: mostRecent.drift_percent,
      efFirstHalf: mostRecent.ef_first_half ?? null,
      efLastHalf: mostRecent.ef_last_half ?? null,
    },
  };
};