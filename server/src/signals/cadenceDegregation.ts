export const computeCadenceDegregation = (activitiesWithStreams) => {

    let averageCadenceDegregation = 0;
    let validRunCount = 0;
    let worstRun = null;
    let worstDegregation = -Infinity;
    let mostRecentRun = null;
    let mostRecentDate = new Date(0);
    let mostRecentDegregation = 0;

    for (const activity of activitiesWithStreams) {

        if (!activity.stream || !activity.stream.cadence) continue;
        const cadence = activity.stream.cadence;
        const sliceLength = Math.floor(cadence.length * 0.2);
        const first20 = cadence.slice(0, sliceLength);
        const last20 = cadence.slice(-sliceLength);
        const first20Average = first20.reduce((sum, c) => sum + c, 0) / sliceLength;
        const last20Average = last20.reduce((sum, c) => sum + c, 0) / sliceLength;
        const degradation = ((first20Average - last20Average) / first20Average) * 100;

        averageCadenceDegregation += degradation
        validRunCount++;

        if (degradation > worstDegregation) {
            worstDegregation = degradation;
            worstRun = activity;
        }

        if (new Date(activity.start_date) > mostRecentDate) {
            mostRecentDate = new Date(activity.start_date);
            mostRecentRun = activity;
            mostRecentDegregation = degradation;
        }
    }

    if (validRunCount === 0) {
        return {viable: false, reason: 'No runs with cadnece data in the last 7 days' };
    }
    averageCadenceDegregation /= validRunCount;
    
    return {
        averageCadenceDegregation,
        worstDegregation, 
    }
}