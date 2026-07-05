import { Baselines } from '../utils/baselines';
import { computeGradeAdjustedVelocity } from '../utils/gradeAdjustedPace';

const MOVING_THRESHOLD = 1.33; // m/s, ~20 min/mile - filters out stops, not real running

export const classify = (sufferScore: number, baselines: Baselines): string => {
    if (sufferScore < baselines.easyThreshold) return 'easy';
    if (sufferScore < baselines.moderateThreshold) return 'moderate';
    if (sufferScore < baselines.hardThreshold) return 'hard';
    return 'very_hard';
}

export const computeHrrBaselines = (activities: { average_heartrate: number | null }[], restingHr: number, maxHr: number) => {
    const hrrValues = activities
        .filter(a => a.average_heartrate !== null)
        .map(a => ((a.average_heartrate! - restingHr) / (maxHr - restingHr)) * 100)

    if (hrrValues.length === 0) {
        return { easyThreshold: 0, hardThreshold: 0 }
    }

    const mean = hrrValues.reduce((sum, v) => sum + v, 0) / hrrValues.length
    const variance = hrrValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / hrrValues.length
    const stdDev = Math.sqrt(variance)

    return {
        easyThreshold: mean - (0.5 * stdDev),
        hardThreshold: mean + (0.5 * stdDev)
    }
}

export const classifyEffortByHRR = (avgHeartrate: number, restingHr: number, maxHr: number, thresholds: { easyThreshold: number, hardThreshold: number }): string | null => {
    const hrrPercent = ((avgHeartrate - restingHr) / (maxHr - restingHr)) * 100
    if (isNaN(hrrPercent)) return null

    if (hrrPercent < thresholds.easyThreshold) return 'easy'
    if (hrrPercent < thresholds.hardThreshold) return 'moderate'
    return 'hard'
}

export const computeRunEfficiency = (activity, restingHr: number, maxHr: number, baselines: Baselines) => {

    if (!activity.stream || !activity.stream.heartrate || !activity.stream.velocity || !activity.stream.altitude || !activity.stream.time) {
        return { viable: false, reason: 'no HR, velocity, altitude, or time data' };
    }

    const gapVelocity = computeGradeAdjustedVelocity(
        activity.stream.velocity,
        activity.stream.altitude,
        activity.stream.time
    );

    const cleaned = gapVelocity
        .map((v, i) => ({ velocity: v, heartrate: activity.stream.heartrate[i] }))
        .filter(point => point.velocity > MOVING_THRESHOLD);

    if (cleaned.length === 0) {
        return { viable: false, reason: 'stream too short after filtering' };
    }

    const cleanVelocity = cleaned.map(p => p.velocity);
    const cleanHeartrate = cleaned.map(p => p.heartrate);

    const overallAvgHR = cleanHeartrate.reduce((sum, h) => sum + h, 0) / cleanHeartrate.length;
    const warmupThreshold = overallAvgHR * 0.9;
    const steadyIndex = cleanHeartrate.findIndex(hr => hr >= warmupThreshold);

    if (steadyIndex === -1 || steadyIndex >= cleanHeartrate.length - 1) {
        return { viable: false, reason: 'warmup consumed entire stream' };
    }

    const velocity = cleanVelocity.slice(steadyIndex);
    const heartrate = cleanHeartrate.slice(steadyIndex);

    const velAvg = velocity.reduce((sum, v) => sum + v, 0) / velocity.length;
    const hrAvg = heartrate.reduce((sum, h) => sum + h, 0) / heartrate.length;

    const hrr = (hrAvg - restingHr) / (maxHr - restingHr);
    if (isNaN(hrr) || hrr <= 0) {
        return { viable: false, reason: 'invalid HRR (missing HR data or HR at or below resting)' };
    }

    const efValue = velAvg / hrr;

    return {
        viable: true,
        efValue,
        sampleSize: velocity.length,
        date: activity.start_date,
        activityId: activity.id,
        effortLevel: classify(activity.suffer_score, baselines)
    };
}
