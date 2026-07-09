import { RunEfficiencyViable } from './runEfficiency';
import { deriveEfTrend } from './efTrend';

export interface EfSummaryResult {
  currentEF: number | null;
  pctChange: number | null;
  trendCategory: 'improving' | 'flat' | 'declining' | null;
  qualifyingRunsRecent: number;
  qualifyingRunsPrior: number;
}

const RECENT_WINDOW_DAYS = 7;

export const computeEfSummary = (results: RunEfficiencyViable[]): EfSummaryResult => {
  const qualifying = results.filter(
    r => r.effortLevel === 'easy' || r.effortLevel === 'moderate'
  );

  const now = new Date();
  const recentWindowStart = new Date(now);
  recentWindowStart.setDate(recentWindowStart.getDate() - RECENT_WINDOW_DAYS);

  const priorWindowStart = new Date(recentWindowStart);
  priorWindowStart.setDate(priorWindowStart.getDate() - RECENT_WINDOW_DAYS);

  const recentWindow = qualifying.filter(r => {
    const d = new Date(r.date);
    return d >= recentWindowStart && d <= now;
  });

  const priorWindow = qualifying.filter(r => {
    const d = new Date(r.date);
    return d >= priorWindowStart && d < recentWindowStart;
  });

  const currentEF = recentWindow.length > 0
    ? recentWindow[recentWindow.length - 1].efValue
    : null;

  if (recentWindow.length === 0 || priorWindow.length === 0) {
    return {
      currentEF,
      pctChange: null,
      trendCategory: null,
      qualifyingRunsRecent: recentWindow.length,
      qualifyingRunsPrior: priorWindow.length,
    };
  }

  const recentAvg = recentWindow.reduce((sum, r) => sum + r.efValue, 0) / recentWindow.length;
  const priorAvg = priorWindow.reduce((sum, r) => sum + r.efValue, 0) / priorWindow.length;
  const pctChange = Math.round(((recentAvg - priorAvg) / priorAvg) * 10000) / 100;

  return {
    currentEF,
    pctChange,
    trendCategory: deriveEfTrend(pctChange),
    qualifyingRunsRecent: recentWindow.length,
    qualifyingRunsPrior: priorWindow.length,
  };
};