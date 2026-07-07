export interface Baselines {
    easyThreshold: number;
    moderateThreshold: number;
    hardThreshold: number;
}

const ACTIVE_WINDOW_DAYS = 2;

const classify = (sufferScore: number, baselines: Baselines): string => {
    if (sufferScore < baselines.easyThreshold) return 'easy';
    if (sufferScore < baselines.moderateThreshold) return 'moderate';
    if (sufferScore < baselines.hardThreshold) return 'hard';
    return 'very_hard';
}

/**
 * Classifies the last 10 days as hard/very_hard/moderate/easy/rest,
 * based on summed daily suffer scores (accounts for multiple runs per day).
 */
const classifyDays = (activities: any[], baselines: Baselines): string[] => {
    const dayPattern: string[] = [];

    for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();

        const matchingActivities = activities.filter(
            activity => new Date(activity.start_date).toDateString() === dateStr
        );

        if (matchingActivities.length === 0) {
            dayPattern.push('rest');
            continue;
        }

        // If multiple runs are logged on the same day, suffer scores are
        // summed to reflect total daily training stress — a "high-load day"
        // measures cumulative load across every run that day, not the
        // intensity of any single run. Two easy runs can add up to a
        // high-load day even though neither run was hard on its own.
        const totalSufferScore = matchingActivities.reduce(
            (sum, activity) => sum + activity.suffer_score, 0
        );

        dayPattern.push(classify(totalSufferScore, baselines));
    }

    return dayPattern;
}

const getSeverity = (streak: number, isActive: boolean) => {
    if (!isActive || streak === 0) return { severity: 0, flag: 'none' }
    if (streak === 1) return { severity: 1, flag: 'low' }
    if (streak === 2) return { severity: 2, flag: 'elevated' }
    if (streak === 3) return { severity: 3, flag: 'high' }
    return { severity: 4, flag: 'critical' }
}

/**
 * Returns:
 *   severity            — numeric severity score (0-4), 0 if the streak has resolved
 *   flag                — plain language label for Claude ('none' | 'low' | 'elevated' | 'high' | 'critical')
 *   highLoadDayCount     — total high-load days in the 10-day window (not just consecutive)
 *   consecutiveCount     — longest consecutive high-load day streak found in the window
 *   isActive             — whether that streak is still recent enough to be relevant (within ACTIVE_WINDOW_DAYS)
 *   lastHighLoadDay      — human-readable date of most recent high-load day
 *   lastHighLoadDayISO   — ISO date string of the same, safe for date math
 *   pattern              — readable string of the 10-day pattern e.g. "hard → rest → very_hard → easy"
 *   recentDays           — raw classified array of the last 10 days
 */
export const computeConsecutiveHardDays = (activities: any[], baselines: Baselines) => {
    const dayPattern = classifyDays(activities, baselines);

    let currentHardStreak = 0;
    let longestHardstreak = 0;
    let highLoadDayCount = 0;

    for (const day of dayPattern) {
        if (day === 'hard' || day === 'very_hard') {
            currentHardStreak++;
            longestHardstreak = Math.max(currentHardStreak, longestHardstreak);
            highLoadDayCount++;
        } else {
            currentHardStreak = 0;
        }
    }

    let lastHighLoadDay: string | null = null;
    let lastHighLoadDayISO: string | null = null;
    let daysSinceLastHighLoad: number | null = null;

    for (let i = 0; i < dayPattern.length; i++) {
        if (dayPattern[i] === 'hard' || dayPattern[i] === 'very_hard') {
            const date = new Date();
            date.setDate(date.getDate() - i);
            lastHighLoadDay = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            lastHighLoadDayISO = date.toISOString();
            daysSinceLastHighLoad = i;
            break;
        }
    }

    const isActive = daysSinceLastHighLoad !== null && daysSinceLastHighLoad <= ACTIVE_WINDOW_DAYS;

    const { severity, flag } = getSeverity(longestHardstreak, isActive);

    return {
        severity,
        flag,
        highLoadDayCount,
        consecutiveCount: longestHardstreak,
        isActive,
        lastHighLoadDay,
        lastHighLoadDayISO,
        pattern: dayPattern.join(' → '),
        recentDays: dayPattern
    }
}