// Uses a fixed constant (y=1.795, the midpoint of Banister's original
// male/female values of 1.92/1.67) since Stryde does not currently
// collect sex as onboarding data. 

const TRIMP_Y_CONSTANT = 1.795;
const TRIMP_SCALING_CONSTANT = 0.64;

export interface TrimpInput {
  duration: number; // seconds, matching activities.duration's real unit
  average_heartrate: number | null;
}

export function computeTrimp(
  activity: TrimpInput,
  restingHr: number,
  maxHr: number
): number | null {
  if (activity.average_heartrate === null) {
    return null;
  }

  const durationMinutes = activity.duration / 60;
  const hrrFrac = (activity.average_heartrate - restingHr) / (maxHr - restingHr);

  if (isNaN(hrrFrac) || hrrFrac <= 0) {
    return null;
  }

  const trimp = durationMinutes * hrrFrac * TRIMP_SCALING_CONSTANT * Math.exp(TRIMP_Y_CONSTANT * hrrFrac);

  return Math.round(trimp * 100) / 100;
}