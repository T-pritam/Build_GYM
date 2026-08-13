/**
 * plateCalc.js — A.6 barbell plate calculator (client-only math).
 * Mirrors BuildGymBackend/src/utils/workoutMath.js `computePlates` — keep in sync.
 * No network: pure arithmetic over a fixed plate inventory.
 */

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const DEFAULT_BAR_KG = 20;

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Effective bar weight: exercise override → member default → 20. */
export function resolveBarWeight(exerciseBarOverrideKg, memberDefaultBarKg) {
  if (exerciseBarOverrideKg != null && exerciseBarOverrideKg !== '') return Number(exerciseBarOverrideKg);
  if (memberDefaultBarKg != null && memberDefaultBarKg !== '') return Number(memberDefaultBarKg);
  return DEFAULT_BAR_KG;
}

/**
 * Greedy plate breakdown per side.
 * @returns {{ justBar:boolean, perSide:number[], loadedPerSide:number,
 *   achievableKg:number, deltaKg:number, exact:boolean }}
 */
export function computePlates(targetKg, barKg, plates = DEFAULT_PLATES_KG) {
  const target = Number(targetKg);
  const bar = Number(barKg);
  if (!Number.isFinite(target) || target <= bar) {
    return { justBar: true, perSide: [], loadedPerSide: 0, achievableKg: bar, deltaKg: 0, exact: target === bar };
  }
  let remaining = (target - bar) / 2;
  const perSide = [];
  for (const p of plates) {
    while (remaining >= p - 1e-9) {
      perSide.push(p);
      remaining = round2(remaining - p);
    }
  }
  const loadedPerSide = round2(perSide.reduce((s, p) => s + p, 0));
  const achievableKg = round2(bar + loadedPerSide * 2);
  const deltaKg = round2(target - achievableKg);
  return { justBar: false, perSide, loadedPerSide, achievableKg, deltaKg, exact: Math.abs(deltaKg) < 1e-9 };
}

/** Collapse a per-side plate list into "25×2, 5×1" style counts. */
export function summarizePlates(perSide) {
  const counts = new Map();
  for (const p of perSide) counts.set(p, (counts.get(p) || 0) + 1);
  return Array.from(counts.entries()).map(([kg, n]) => ({ kg, count: n }));
}
