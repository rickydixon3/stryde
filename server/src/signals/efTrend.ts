// Derives EfficiencyFactorFact.trend from ef-summary's pctChange.
//
// Threshold rationale: EF is a noisy day-to-day metric even after whole-run
// averaging, GAP normalization, and HRR normalization (see EF validation
// work). The ef-summary route already smooths this by comparing 14-day
// window averages rather than single runs, but ±2% still reflects realistic
// run-to-run variance in that smoothed signal. Values inside that band are
// treated as noise, not a real trend, to avoid the synthesis layer either
// falsely reassuring ("fitness improving") or falsely alarming ("fitness
// declining") on movement that isn't actually meaningful.

const EF_TREND_THRESHOLD_PCT = 2;

export function deriveEfTrend(pctChange: number): 'improving' | 'flat' | 'declining' {
  if (pctChange > EF_TREND_THRESHOLD_PCT) return 'improving';
  if (pctChange < -EF_TREND_THRESHOLD_PCT) return 'declining';
  return 'flat';
}