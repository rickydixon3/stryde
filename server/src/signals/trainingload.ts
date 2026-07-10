// Computes training load: a heart-rate-derived measure of cumulative
// training stress (7-day TRIMP total) plus supporting detail on how many
// recent days involved elevated-or-higher effort. Originally scoped
// narrowly as "consecutive hard days" using Strava's suffer_score;
// broadened when suffer_score was found to be premium-subscriber-only
// (see signals/trimp.ts), and the primary framing shifted from
// streak-detection to cumulative volume, matching how "training load" is
// conventionally used in sports-science contexts. The streak-detection
// fields (consecutiveCount, isActive, lastHighLoadDay) are retained below
// since they're still real, computed data -- just no longer used to drive
// the card's primary display, since stacking streak language under a
// magnitude-based headline (TRIMP total) read as confusing in practice.

import { Baselines } from '../utils/baselines';

const getSeverity = (score: number, baselines: Baselines): number => {
  if (score < baselines.easyThreshold) return 0;
  if (score < baselines.moderateThreshold) return 1;
  if (score < baselines.hardThreshold) return 2;
  return 3;
}

const getFlag = (severity: number): string => {
  if (severity === 0) return 'none';
  if (severity === 1) return 'low';
  if (severity === 2) return 'elevated';
  return 'high';
}

const getDailyTrimpScores = (activities): Map<string, number> => {
  const dailyScores = new Map<string, number>();

  for (const activity of activities) {
    if (activity.trimp_score === null || activity.trimp_score === undefined) continue;

    const dateStr = new Date(activity.start_date).toDateString();
    const existing = dailyScores.get(dateStr) ?? 0;
    dailyScores.set(dateStr, existing + activity.trimp_score);
  }

  return dailyScores;
}

export const computeTrainingLoad = (activities, baselines: Baselines) => {
  const dailyScores = getDailyTrimpScores(activities);

  const today = new Date();
  const recentDays: string[] = [];
  const dayScores: { date: string; score: number; severity: number }[] = [];

  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();

    const score = dailyScores.get(dateStr) ?? 0;
    const severity = getSeverity(score, baselines);

    recentDays.push(dateStr);
    dayScores.push({ date: dateStr, score, severity });
  }

  dayScores.reverse();

  let consecutiveCount = 0;
  let maxConsecutive = 0;
  let lastHighLoadDay: string | null = null;
  let lastHighLoadDayISO: string | null = null;

  for (const day of dayScores) {
    if (day.severity >= 2) {
      consecutiveCount++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
      lastHighLoadDay = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      lastHighLoadDayISO = new Date(day.date).toISOString();
    } else {
      consecutiveCount = 0;
    }
  }

  const highLoadDayCount = dayScores.filter(d => d.severity >= 2).length;
  const mostRecentDay = dayScores[dayScores.length - 1];
  const isActive = mostRecentDay.severity >= 2;

  const pattern = dayScores.map(d => getFlag(d.severity)).join(',');

  const overallSeverity = isActive ? Math.max(...dayScores.slice(-3).map(d => d.severity)) : 0;
  const flag = getFlag(overallSeverity);

  const sevenDayTotalTrimp = Math.round(
    dayScores.slice(-7).reduce((sum, d) => sum + d.score, 0) * 100
  ) / 100;

  // Count of days in the last 7 (not 10) with elevated-or-higher severity --
  // a magnitude-consistent secondary fact for the training-load card,
  // scoped to match the headline's own 7-day window rather than the
  // 10-day window used elsewhere in this function.
  const elevatedDaysThisWeek = dayScores.slice(-7).filter(d => d.severity >= 2).length;

  const weeklyWatchThreshold = Math.round(baselines.moderateThreshold * 7 * 100) / 100;
  const highVolume = sevenDayTotalTrimp > weeklyWatchThreshold;

  return {
    severity: overallSeverity,
    flag,
    sevenDayTotalTrimp,
    mostRecentTrimp: Math.round(mostRecentDay.score * 100) / 100,
    elevatedDaysThisWeek,
    weeklyWatchThreshold,
    highVolume,
    highLoadDayCount,
    consecutiveCount: maxConsecutive,
    isActive,
    lastHighLoadDay,
    lastHighLoadDayISO,
    pattern,
    recentDays: dayScores.map(d => d.date)
  };
}