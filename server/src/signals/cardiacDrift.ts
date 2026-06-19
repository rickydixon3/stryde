const MOVING_THRESHOLD = 1.33; // m/s, ~20 min/mile - filters out stops, not real running

export const computeCardiacDrift = (activitiesWithStreams) => {

    let averageDrift = 0;
    let validRunCount = 0;
    let worstRun = null;
    let worstDrift = -Infinity;
    let mostRecentRun = null;
    let mostRecentDate = new Date(0);
    let mostRecentDrift = 0;

    for (const activity of activitiesWithStreams) {

        if (!activity.stream || !activity.stream.heartrate || !activity.stream.velocity) continue;

        // Step 1: filter out stops
        const cleaned = activity.stream.velocity
            .map((v, i) => ({ velocity: v, heartrate: activity.stream.heartrate[i] }))
            .filter(point => point.velocity > MOVING_THRESHOLD);

        if (cleaned.length === 0) continue;

        const cleanVelocity = cleaned.map(p => p.velocity);
        const cleanHeartrate = cleaned.map(p => p.heartrate);

        // Step 2: exclude warmup (before HR reaches 90% of run average)
        const overallAvgHR = cleanHeartrate.reduce((sum, h) => sum + h, 0) / cleanHeartrate.length;
        const warmupThreshold = overallAvgHR * 0.9;
        const steadyIndex = cleanHeartrate.findIndex(hr => hr >= warmupThreshold);

        const velocity = cleanVelocity.slice(steadyIndex);
        const heartrate = cleanHeartrate.slice(steadyIndex);

        // Step 3: slice first/last 20%
        const sliceLength = Math.floor(velocity.length * 0.2);
        if (sliceLength === 0) continue;

        const velFirst20 = velocity.slice(0, sliceLength);
        const velLast20 = velocity.slice(-sliceLength);
        const hrFirst20 = heartrate.slice(0, sliceLength);
        const hrLast20 = heartrate.slice(-sliceLength);

        const velFirst20Avg = velFirst20.reduce((sum, v) => sum + v, 0) / sliceLength;
        const velLast20Avg = velLast20.reduce((sum, v) => sum + v, 0) / sliceLength;
        const hrFirst20Avg = hrFirst20.reduce((sum, h) => sum + h, 0) / sliceLength;
        const hrLast20Avg = hrLast20.reduce((sum, h) => sum + h, 0) / sliceLength;

        // Step 4: efficiency factor decoupling
        const efFirst20 = velFirst20Avg / hrFirst20Avg;
        const efLast20 = velLast20Avg / hrLast20Avg;
        const drift = ((efFirst20 - efLast20) / efFirst20) * 100;

        averageDrift += drift;
        validRunCount++;

        if (drift > worstDrift) {
            worstDrift = drift;
            worstRun = activity;
        }

        if (new Date(activity.start_date) > mostRecentDate) {
            mostRecentDate = new Date(activity.start_date);
            mostRecentRun = activity;
            mostRecentDrift = drift;
        }
    }

    if (validRunCount === 0) {
        return { viable: false, reason: 'No runs with heart rate and velocity data in the last 7 days' };
    }

    averageDrift /= validRunCount;

    const getFlag = (drift: number): string => {
        if (drift < 5) return 'stable';
        if (drift < 10) return 'moderate';
        return 'significant';
    }

    return {
        viable: true,
        averageDrift: Math.round(averageDrift * 10) / 10,
        flag: getFlag(averageDrift),
        worstRun: worstRun ? {
            name: worstRun.name,
            date: worstRun.start_date,
            drift: Math.round(worstDrift * 10) / 10
        } : null,
        mostRecentRun: mostRecentRun ? {
            name: mostRecentRun.name,
            date: mostRecentRun.start_date,
            drift: Math.round(mostRecentDrift * 10) / 10
        } : null
    }
}