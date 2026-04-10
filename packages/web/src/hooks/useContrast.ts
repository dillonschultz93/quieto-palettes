import { useMemo } from 'react';
import { calculateContrast } from '@quieto/engine';
import type { ContrastResult, Ramp } from '@quieto/engine';

export type ContrastMap = Map<string, Map<string, ContrastResult>>;

/**
 * Precompute contrast ratios for every pair of steps in a ramp.
 *
 * Returns a `Map<stepId, Map<otherStepId, ContrastResult>>` keyed by `step.id`.
 * Each pair is stored bidirectionally for O(1) lookup in either direction.
 *
 * Memoized on the `ramp.steps` reference — only recomputes when the ramp
 * actually changes. For a 10-step ramp, this is 45 unique pairs and well
 * under 1ms total.
 */
export function useContrast(ramp: Ramp | null): ContrastMap {
  return useMemo<ContrastMap>(() => {
    const map: ContrastMap = new Map();
    if (!ramp) return map;

    const steps = ramp.steps;
    for (let i = 0; i < steps.length; i++) {
      const a = steps[i]!;
      if (!map.has(a.id)) map.set(a.id, new Map());
    }
    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const a = steps[i]!;
        const b = steps[j]!;
        const result = calculateContrast(a.oklch, b.oklch);
        map.get(a.id)!.set(b.id, result);
        map.get(b.id)!.set(a.id, result);
      }
    }
    return map;
  }, [ramp?.steps]);
}
