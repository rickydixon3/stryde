import { SignalFact, TrainingLoadFact, CardiacDriftFact, SessionSpikeFact, EfficiencyFactorFact } from './signalFact';
import { EfSummaryResult } from './efSummary';

// --- Input shapes, matching the real return values of each compute function ---

interface TrainingLoadResult {
  severity: number;
  flag: string;
  highLoadDayCount: number;
  consecutiveCount: number;
  isActive: boolean;
  lastHighLoadDay: string | null;
  lastHighLoadDayISO: string | null;
  pattern: string;
  recentDays: string[];
  sevenDayTotalTrimp: number;
  mostRecentTrimp: number;
  elevatedDaysThisWeek: number;
  weeklyWatchThreshold: number;
  highVolume: boolean;
}

interface CardiacDriftResult {
  viable: boolean;
  reason?: string;
  averageDrift?: number;
  flag?: string;
  worstRun?: { name: string; date: string; drift: number } | null;
  mostRecentRun?: { name: string; date: string; drift: number; efFirstHalf: number; efLastHalf: number } | null;
}

interface SessionSpikeResult {
  viable: boolean;
  reason?: string;
  flag?: string;
  spikePercentage?: number;
  riskMultiplier?: number;
  spikeRun?: { name: string; distance: number; date: string };
  baselineRun?: { name: string; distance: number; date: string };
}

// --- Per-signal mappers ---

function buildTrainingLoadFact(result: TrainingLoadResult): TrainingLoadFact {
  return {
    type: 'training_load',
    flag: result.flag as TrainingLoadFact['flag'],
    severity: result.severity as TrainingLoadFact['severity'],
    highLoadDayCount: result.highLoadDayCount,
    consecutiveCount: result.consecutiveCount,
    isActive: result.isActive,
    lastHighLoadDay: result.lastHighLoadDay,
  };
}

function buildCardiacDriftFact(result: CardiacDriftResult): CardiacDriftFact | null {
  if (!result.viable || result.averageDrift === undefined || !result.flag) {
    return null; // no HR/velocity data this week -- omit rather than send a partial fact
  }

  return {
    type: 'cardiac_drift',
    flag: result.flag as CardiacDriftFact['flag'],
    averageDrift: result.averageDrift,
    mostRecentRun: result.mostRecentRun
      ? { drift: result.mostRecentRun.drift, date: result.mostRecentRun.date }
      : null,
  };
}

function buildSessionSpikeFact(result: SessionSpikeResult): SessionSpikeFact | null {
  if (!result.viable || result.spikePercentage === undefined || !result.flag || result.riskMultiplier === undefined) {
    return null; // no runs this week, or insufficient 30-day baseline -- omit
  }

  return {
    type: 'session_spike',
    flag: result.flag as SessionSpikeFact['flag'],
    spikePercentage: result.spikePercentage,
    riskMultiplier: result.riskMultiplier,
  };
}

function buildEfficiencyFactorFact(result: EfSummaryResult): EfficiencyFactorFact | null {
    if (result.pctChange === null || result.trendCategory === null) {
      return null; // not enough qualifying runs in one or both 7-day windows -- omit
    }
  
    return {
      type: 'efficiency_factor',
      trend: result.trendCategory,
      pctChange: result.pctChange,
    };
  }

// --- Top-level builder ---

export interface SignalResults {
  trainingLoad: TrainingLoadResult;
  cardiacDrift: CardiacDriftResult;
  sessionSpike: SessionSpikeResult;
  efSummary: EfSummaryResult;
}

export function buildSignalFacts(results: SignalResults): SignalFact[] {
  const facts: (SignalFact | null)[] = [
    buildTrainingLoadFact(results.trainingLoad),
    buildCardiacDriftFact(results.cardiacDrift),
    buildSessionSpikeFact(results.sessionSpike),
    buildEfficiencyFactorFact(results.efSummary),
  ];

  return facts.filter((fact): fact is SignalFact => fact !== null);
}