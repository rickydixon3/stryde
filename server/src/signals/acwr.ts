/**
 * ACWR — Acute to Chronic Workload Ratio
 *
 * Compares recent training stress to long-term fitness base.
 * A high ratio means you're doing significantly more than your body is adapted to.
 *
 * Acute load:   total mileage over the last 7 days
 * Chronic load: average weekly mileage over the last 28 days
 *
 * ACWR = acute load / chronic load
 *
 * Zones:
 *   < 0.80        Undertraining — below your normal baseline
 *   0.80 – 1.30   Optimal — sweet spot, lowest relative load risk
 *   1.30 – 1.50   Elevated — trending toward overload, monitor closely
 *   > 1.50        High — significant load spike, back off
 *
 * Returns: acwr value, acuteLoad (miles), chronicLoad (miles/week), zone
 */

const METERS_TO_MILES = 0.000621371;

const getZone = (acwr: number): string => {
    if (acwr < 0.8) return 'undertraining';
    if (acwr <= 1.3) return 'optimal';
    if (acwr <= 1.5) return 'elevated';
    return 'high';
}

export const computeACWR = (activities: any[]) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    // set to midnight, start of day
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
    // set to midnight, start of day
    twentyEightDaysAgo.setHours(0, 0, 0, 0);

    // Gets activities from the past week (7 days)
    const sevenDayActivities = activities.filter(activity => new Date(activity.start_date) >= sevenDaysAgo);
    // Gets mileage from past 7 days
    const sevenDayTotal = sevenDayActivities.reduce((mileage, activity) => mileage + activity.distance, 0);

    // Gets activities from past 28 days
    const twentyEightDayActivities = activities.filter(activity => new Date(activity.start_date) >= twentyEightDaysAgo);

    // Gets mileage from past 28 days
    let twentyEightDayTotal = twentyEightDayActivities.reduce((mileage, activity) => mileage + activity.distance, 0);
    // Gets weekly average
    twentyEightDayTotal /= 4;
    
    return {
        acwr: Math.round(sevenDayTotal / twentyEightDayTotal * 100) / 100,
        acuteLoad: Math.round(sevenDayTotal * METERS_TO_MILES * 10) / 10,
        chronicLoad: Math.round(twentyEightDayTotal * METERS_TO_MILES * 10) / 10,
        zone: getZone(sevenDayTotal / twentyEightDayTotal)
    }
}