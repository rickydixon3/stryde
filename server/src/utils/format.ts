// EF is stored/computed as a raw velocity/heartrate ratio (~0.02), which is
// too small to scan at a glance. Scaled by 100 for display only — never
// change this in the backend signal computation, only here.
const EF_DISPLAY_SCALE = 100

export const formatEF = (value: number, decimals = 2) =>
  (value * EF_DISPLAY_SCALE).toFixed(decimals)