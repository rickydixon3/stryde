export type Baselines = {
    easyThreshold: number;
    moderateThreshold: number;
    hardThreshold: number;
}

export const checkCalibration = (activities) => {
    if (activities.length === 0) {
        return { isCalibrated: false, daysSinceFirst: 0, activityCount: 0 }
    }

    // Gets oldest activity
    const oldest = activities.reduce((earliest, activity) =>
    new Date(activity.start_date) < new Date(earliest.start_date) ? activity : earliest);

    // Days since first activity ever logged
    const daysSinceFirst = Math.floor(
        (new Date().getTime() - new Date(oldest.start_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    const numActivities = activities.length;
    const isCalibrated = daysSinceFirst >= 30 && numActivities >= 10;

    return {
        isCalibrated,
        daysSinceFirst,
        activityCount: activities.length
    }
}

export const computeBaselines = (activities) => {

    const scores = activities
        .filter(activity => activity.trimp_score !== null)
        .map(activity => activity.trimp_score)

    if (scores.length === 0) {
        return { easyThreshold: 0, moderateThreshold: 0, hardThreshold: 0 }
    }

    // Getting standard deviation of TRIMP scores
    const scoresMean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - scoresMean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    return {
        easyThreshold: scoresMean - (0.5 * stdDev),
        moderateThreshold: scoresMean + (0.5 * stdDev),
        hardThreshold: scoresMean + (1.5 * stdDev)
    }
}