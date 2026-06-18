/**
 * Consecutive Hard Day Detection
 *
 * Uses Strava's suffer score to detect patterns of accumulated training stress
 * over a 10-day window. Research shows 7-14 days is the range where consecutive
 * hard efforts begin producing measurable overreaching effects and impaired performance.
 *
 * Day Classification (based on suffer score):
 *   No activity logged  → 'rest'
 *   suffer_score < 25   → 'easy'
 *   suffer_score 25-50  → 'moderate'
 *   suffer_score 50-75  → 'hard'
 *   suffer_score > 75   → 'very_hard'
 *
 * Note: If multiple runs are logged on the same day, suffer scores are summed
 * to reflect total daily training stress.
 *
 * Severity Levels (based on longest consecutive hard streak):
 *   0 → none     — no consecutive hard days detected
 *   1 → low      — 1 hard day, no pattern concern
 *   2 → elevated — 2 consecutive hard days, insufficient recovery
 *   3 → high     — 3 consecutive hard days, significant accumulated stress
 *   4 → critical — 4+ consecutive hard days, overreaching territory
 *
 * Returns:
 *   severity      — numeric severity score (0-4)
 *   flag          — plain language label for Claude ('none' | 'low' | 'elevated' | 'high' | 'critical')
 *   hardDayCount  — total hard/very_hard days in the 10-day window (not just consecutive)
 *   consecutiveCount — longest consecutive hard day streak
 *   lastHardDay   — date of most recent hard effort
 *   pattern       — readable string of the 10-day pattern e.g. "hard → rest → very_hard → easy"
 *   recentDays    — raw classified array of the last 10 days
 */

import { checkCalibration, computeBaselines } from "../utils/baselines";
import { Baselines } from '../utils/baselines';


const POPULATION_THRESHOLDS = {
    easyThreshold: 25,
    moderateThreshold: 50,
    hardThreshold: 75
}

const classify = (sufferScore: number, baselines: Baselines): string => {
    if (sufferScore < baselines.easyThreshold) return 'easy';
    if (sufferScore < baselines.moderateThreshold) return 'moderate';
    if (sufferScore < baselines.hardThreshold) return 'hard';
    return 'very_hard';
}

const classifyDays = (recentActivities: any[], baselines: Baselines) => {
    const classifiedDays = []
    let matchingActivities;

    for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        matchingActivities = recentActivities.filter(activity => 
            new Date(activity.start_date).toDateString() === date.toDateString()
        );

        if (matchingActivities.length === 0) {
            classifiedDays.push('rest')
        } else {
            const totalSufferScore = matchingActivities.reduce((run, activity) => run + activity.suffer_score, 0);
            classifiedDays.push(classify(totalSufferScore, baselines));
        }
    }
    return classifiedDays;
}

const getSeverity  = (streak: number) => {
    if (streak === 0) return {severity: 0, flag: 'none'}
    if (streak === 1) return {severity: 1, flag: 'low'}
    if (streak === 2) return {severity: 2, flag: 'elevated'}
    if (streak === 3) return {severity: 3, flag: 'high'}
    return { severity: 4, flag: 'critical '}
}

export const computeConsecutiveHardDays = (activities: any[]) => {

    const calibration = checkCalibration(activities);
    const baselines = calibration.isCalibrated ? computeBaselines(activities) : POPULATION_THRESHOLDS;
    // Ten days ago
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    tenDaysAgo.setHours(0, 0, 0, 0);

    // Getting activities from past 10 days
    const tenDayActivities = activities.filter(activity => new Date(activity.start_date) >= tenDaysAgo);
    const dayPattern = classifyDays(tenDayActivities, baselines)

    let currentHardStreak = 0;
    let longestHardstreak = 0;
    let hardDayCount = 0;

    for (const day of dayPattern) {
        if (day === 'hard' || day === 'very_hard') {
            currentHardStreak++;
            longestHardstreak = Math.max(currentHardStreak, longestHardstreak);
            hardDayCount++;
        } else {
            currentHardStreak = 0;
        }
    }

    let lastHardDay: string | null = null;

    for (let i = 0; i < dayPattern.length; i++) {
        if (dayPattern[i] === 'hard' || dayPattern[i] === 'very_hard') {
            const date = new Date();
            date.setDate(date.getDate() - i);
            lastHardDay = date.toDateString();
            break;
        }
    }

    const {severity, flag } = getSeverity(longestHardstreak);

    return {
        severity: severity,
        flag: flag,
        hardDayCount: hardDayCount,        
        consecutiveCount: longestHardstreak,    
        lastHardDay: lastHardDay,         
        pattern: dayPattern.join(' → '),            
        recentDays: dayPattern            
    }
}