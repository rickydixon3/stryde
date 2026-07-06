const getFlag = (spike: number) => {
    if (spike < 10) return 'safe'
    if (spike < 30) return 'small_spike'
    if (spike < 100) return 'moderate_spike'
    return 'large_spike';
}

const riskMultiplier = {
    'safe': 1.0,
    'small_spike': 1.64,
    'moderate_spike': 1.52,
    'large_spike': 2.28
};

export const computeSingleSessionSpike = (activities) => {

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentRuns = activities.filter(activity =>
        new Date(activity.start_date) >= sevenDaysAgo
    );

    if (recentRuns.length === 0) {
        return { viable: false, reason: 'No runs this week' }
    }

    const evaluated = recentRuns.map(run => {
        const runDate = new Date(run.start_date);
        const thirtyDaysBeforeRun = new Date(runDate);
        thirtyDaysBeforeRun.setDate(thirtyDaysBeforeRun.getDate() - 30);

        const priorRuns = activities.filter(activity => {
            const activityDate = new Date(activity.start_date);
            return activity.id !== run.id &&
                   activityDate >= thirtyDaysBeforeRun &&
                   activityDate < runDate;
        });

        if (priorRuns.length === 0) return null;

        const baselineRun = priorRuns.reduce((longest, activity) =>
            activity.distance > longest.distance ? activity : longest);

        const spike = Math.round(((run.distance / baselineRun.distance) - 1) * 100);

        return { run, baselineRun, spike };
    }).filter(r => r !== null);

    if (evaluated.length === 0) {
        return { viable: false, reason: 'Insufficient baseline data' }
    }

    const worst = evaluated.reduce((max, curr) => curr.spike > max.spike ? curr : max);

    const flag = getFlag(worst.spike);

    return {
        viable: true,
        flag,
        spikePercentage: worst.spike,
        riskMultiplier: riskMultiplier[flag],
        spikeRun: {
            name: worst.run.name,
            distance: Math.round(worst.run.distance / 1609.34 * 100) / 100,
            date: worst.run.start_date
        },
        baselineRun: {
            name: worst.baselineRun.name,
            distance: Math.round(worst.baselineRun.distance / 1609.34 * 100) / 100,
            date: worst.baselineRun.start_date
        }
    }
}