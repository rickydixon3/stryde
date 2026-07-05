const MAX_GRADE = 0.45; // Minetti's validated range is roughly ±45%

const energyCost = (grade: number): number => {
    const g = Math.max(-MAX_GRADE, Math.min(MAX_GRADE, grade));
    // Minetti polynomnial
    return 155.4 * g**5 - 30.4 * g**4 - 43.3 * g**3 + 46.3 * g**2 + 19.5 * g + 3.6;
}

const FLAT_COST = energyCost(0); // always 3.6, computed once for clarity

export const computeGradeAdjustedVelocity = (
    velocity: number[],
    altitude: number[],
    time: number[]
): number[] => {

    const gapVelocity: number[] = [velocity[0]]; // first point has no prior point to grade against

    for (let i = 1; i < velocity.length; i++) {
        const timeDelta = time[i] - time[i - 1];
        const altitudeDelta = altitude[i] - altitude[i - 1];

        if (timeDelta <= 0 || velocity[i] <= 0) {
            gapVelocity.push(velocity[i]); // can't compute grade, fall back to raw velocity for this point
            continue;
        }

        const horizontalDistance = velocity[i] * timeDelta;
        const grade = altitudeDelta / horizontalDistance;

        const factor = energyCost(grade) / FLAT_COST;
        gapVelocity.push(velocity[i] * factor);
    }

    return gapVelocity;
}