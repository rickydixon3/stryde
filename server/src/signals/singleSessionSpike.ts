const getFlag = (spike) => {
    if (spike < 10) return 'safe'
    if (spike < 30) return 'small_spike'
    if (spike < 100) return 'moderate_spike'
    return 'large_spike';
}

export const computeSingleSessionSpike = (activities) => {

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Current weeks runs
    const weekActivities = activities.filter(activity =>
        new Date(activity.start_date) >= sevenDaysAgo
    );

    if (weekActivities.length === 0) {
        return { viable: false, reason: 'No runs this week' }
    }

    // Last 8-30 days (excluding this week)
    const monthActivities = activities.filter(activity =>
        new Date(activity.start_date) >= thirtyDaysAgo &&
        new Date(activity.start_date) < sevenDaysAgo
    );

    if (monthActivities.length === 0) {
        return { viable: false, reason: 'Insufficient baseline data' }
    }

    // Gets longest run in the past month
    const longestMonthRun = monthActivities.reduce((longest, activity) =>
        activity.distance > longest.distance ? activity : longest);

    // Gets longest run in the past week
    const longestWeekRun = weekActivities.reduce((longest, activity) =>
        activity.distance > longest.distance ? activity : longest);

    // Calculates spike in percentage
    const spike = Math.round(((longestWeekRun.distance / longestMonthRun.distance) - 1) * 100);

    const flag = getFlag(spike)

    const riskMultiplier = {
        'safe': 1.0,
        'small_spike': 1.64,
        'moderate_spike': 1.52,
        'large_spike': 2.28
    }[flag];

    return {
        viable: true,
        flag,
        spikePercentage: spike,
        riskMultiplier,
        longestWeekRun: {
            name: longestWeekRun.name,
            distance: Math.round(longestWeekRun.distance / 1609.34 * 100) / 100,
            date: longestWeekRun.start_date
        },
        longestMonthRun: {
            name: longestMonthRun.name,
            distance: Math.round(longestMonthRun.distance / 1609.34 * 100) / 100,
            date: longestMonthRun.start_date

        }
    }
}