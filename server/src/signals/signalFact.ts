// Types for the AI synthesis layer's input payload.
//
// Each SignalFact variant is typed directly against the real return shape
// of its corresponding signal function, so the payload the backend sends
// to Claude always matches what the signals layer actually produces.
//
// Source of truth for each variant:
//   TrainingLoadFact     -> computeConsecutiveHardDays() in signals/consecutiveHardDays.ts
//   CardiacDriftFact     -> computeCardiacDrift() in signals/cardiacDrift.ts
//   SessionSpikeFact     -> computeSingleSessionSpike() in signals/singleSessionSpike.ts
//   EfficiencyFactorFact -> GET /activities/ef-summary route in routes/activities.ts

export interface TrainingLoadFact {
    type: 'training_load';
    flag: 'none' | 'low' | 'elevated' | 'high' | 'critical';
    severity: 0 | 1 | 2 | 3 | 4;
    highLoadDayCount: number;
    consecutiveCount: number;
    isActive: boolean;
    lastHighLoadDay: string | null;
  }
  
  export interface CardiacDriftFact {
    type: 'cardiac_drift';
    flag: 'stable' | 'moderate' | 'significant';
    averageDrift: number;
    mostRecentRun: {
      drift: number;
      date: string;
    } | null;
  }
  
  export interface SessionSpikeFact {
    type: 'session_spike';
    flag: 'safe' | 'small_spike' | 'moderate_spike' | 'large_spike';
    spikePercentage: number;
    riskMultiplier: number;
  }
  
  export interface EfficiencyFactorFact {
    type: 'efficiency_factor';
    trend: 'improving' | 'flat' | 'declining';
    pctChange: number;
  }
  
  export type SignalFact =
    | TrainingLoadFact
    | CardiacDriftFact
    | SessionSpikeFact
    | EfficiencyFactorFact;
  
  // Wrapper shape sent as the user message content to the Claude API.
  export interface SynthesisPayload {
    signalFacts: SignalFact[];
  }