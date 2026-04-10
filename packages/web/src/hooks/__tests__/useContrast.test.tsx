import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { generateRamp, parseColor } from '@quieto/engine';
import type { Ramp } from '@quieto/engine';
import { useContrast } from '../useContrast';

function buildRamp(input: string): Ramp {
  const parsed = parseColor(input);
  if (!parsed.ok) throw new Error('fixture parse failed');
  const ramp = generateRamp({
    seed: parsed.value.oklch,
    steps: 10,
    range: { min: 0.05, max: 0.97 },
    distribution: 'linear',
    name: 'color',
  });
  if (!ramp.ok) throw new Error('fixture generate failed');
  return ramp.value;
}

describe('useContrast', () => {
  it('returns an empty map when ramp is null', () => {
    const { result } = renderHook(() => useContrast(null));
    expect(result.current.size).toBe(0);
  });

  it('builds an entry for every step in the ramp', () => {
    const ramp = buildRamp('#2563EB');
    const { result } = renderHook(() => useContrast(ramp));
    expect(result.current.size).toBe(ramp.steps.length);
    for (const step of ramp.steps) {
      expect(result.current.has(step.id)).toBe(true);
    }
  });

  it('stores contrast results bidirectionally between every pair of steps', () => {
    const ramp = buildRamp('#2563EB');
    const { result } = renderHook(() => useContrast(ramp));
    const map = result.current;
    for (let i = 0; i < ramp.steps.length; i++) {
      for (let j = 0; j < ramp.steps.length; j++) {
        if (i === j) continue;
        const a = ramp.steps[i]!;
        const b = ramp.steps[j]!;
        expect(map.get(a.id)?.get(b.id)).toBeDefined();
        expect(map.get(b.id)?.get(a.id)).toBe(map.get(a.id)?.get(b.id));
      }
    }
  });

  it('contrast results have the expected ContrastResult shape', () => {
    const ramp = buildRamp('#2563EB');
    const { result } = renderHook(() => useContrast(ramp));
    const first = ramp.steps[0]!;
    const last = ramp.steps[ramp.steps.length - 1]!;
    const r = result.current.get(first.id)!.get(last.id)!;
    expect(typeof r.ratio).toBe('number');
    expect(typeof r.aa).toBe('boolean');
    expect(typeof r.aaa).toBe('boolean');
    // Lightest-to-darkest of a 10-step ramp should be high contrast
    expect(r.ratio).toBeGreaterThan(7);
    expect(r.aaa).toBe(true);
  });

  it('memoizes on the ramp.steps reference', () => {
    const ramp = buildRamp('#2563EB');
    const { result, rerender } = renderHook(({ r }: { r: Ramp }) => useContrast(r), {
      initialProps: { r: ramp },
    });
    const first = result.current;
    rerender({ r: ramp });
    expect(result.current).toBe(first);
  });
});
