import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { parseColor } from '@quieto/engine';
import type { ParsedColor } from '@quieto/engine';
import { usePalette } from '../usePalette';

function parsed(input: string): ParsedColor {
  const result = parseColor(input);
  if (!result.ok) throw new Error(`test fixture parse failed: ${input}`);
  return result.value;
}

describe('usePalette', () => {
  it('returns null ramp and null error when parsedColor is null', () => {
    const { result } = renderHook(() => usePalette(null));
    expect(result.current.ramp).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns a 10-step ramp for a valid parsed color', () => {
    const { result } = renderHook(() => usePalette(parsed('#2563EB')));
    expect(result.current.error).toBeNull();
    expect(result.current.ramp).not.toBeNull();
    expect(result.current.ramp!.steps).toHaveLength(10);
  });

  it('marks one step as the seed', () => {
    const { result } = renderHook(() => usePalette(parsed('#2563EB')));
    const seedSteps = result.current.ramp!.steps.filter((s) => s.isSeed);
    expect(seedSteps).toHaveLength(1);
  });

  it('returns the same ramp reference when parsedColor has identical OKLCH values', () => {
    const color = parsed('#2563EB');
    const { result, rerender } = renderHook(
      ({ c }: { c: ParsedColor }) => usePalette(c),
      { initialProps: { c: color } },
    );
    const first = result.current.ramp;
    // New object, same OKLCH values — should be memoized
    rerender({ c: { ...color, oklch: { ...color.oklch } } });
    expect(result.current.ramp).toBe(first);
  });

  it('regenerates ramp when OKLCH values change', () => {
    const first = parsed('#2563EB');
    const second = parsed('#EB2525');
    const { result, rerender } = renderHook(
      ({ c }: { c: ParsedColor }) => usePalette(c),
      { initialProps: { c: first } },
    );
    const firstRamp = result.current.ramp;
    rerender({ c: second });
    expect(result.current.ramp).not.toBe(firstRamp);
    expect(result.current.ramp!.steps[0]!.hex).not.toEqual(
      firstRamp!.steps[0]!.hex,
    );
  });

  it('surfaces engine errors as the error field when seed lightness is out of range', () => {
    // #000 has OKLCH lightness 0, which is below the default range.min of 0.05,
    // so generateRamp should return SEED_OUT_OF_RANGE.
    const { result } = renderHook(() => usePalette(parsed('#000000')));
    expect(result.current.ramp).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error!.code).toBe('SEED_OUT_OF_RANGE');
  });
});
