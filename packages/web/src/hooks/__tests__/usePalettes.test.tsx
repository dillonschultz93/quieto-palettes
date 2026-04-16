import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { parseColor } from '@quieto/engine';
import type { ParsedColor } from '@quieto/engine';
import { usePalettes } from '../usePalettes';
import type { SeedEntry } from '../usePalettes';

function parsed(input: string): ParsedColor {
  const result = parseColor(input);
  if (!result.ok) throw new Error(`test fixture parse failed: ${input}`);
  return result.value;
}

function seed(id: string, parsedColor: ParsedColor | null): SeedEntry {
  return { id, parsed: parsedColor };
}

describe('usePalettes', () => {
  it('returns null palette and empty errors when all seeds are null', () => {
    const { result } = renderHook(() => usePalettes([seed('a', null)]));
    expect(result.current.palette).toBeNull();
    expect(result.current.errors.size).toBe(0);
  });

  it('returns a palette with one ramp for one valid seed', () => {
    const { result } = renderHook(() =>
      usePalettes([seed('a', parsed('#2563EB'))]),
    );
    expect(result.current.palette).not.toBeNull();
    expect(result.current.palette!.ramps).toHaveLength(1);
    expect(result.current.palette!.ramps[0]!.steps).toHaveLength(10);
    expect(result.current.palette!.ramps[0]!.name).toBe('color-1');
  });

  it('returns a palette with multiple ramps and sequential names', () => {
    const { result } = renderHook(() =>
      usePalettes([
        seed('a', parsed('#2563EB')),
        seed('b', parsed('#EB2525')),
      ]),
    );
    expect(result.current.palette!.ramps).toHaveLength(2);
    expect(result.current.palette!.ramps.map((r) => r.name)).toEqual([
      'color-1',
      'color-2',
    ]);
  });

  it('skips null seeds when building ramps', () => {
    const { result } = renderHook(() =>
      usePalettes([
        seed('a', parsed('#2563EB')),
        seed('b', null),
        seed('c', parsed('#EB2525')),
      ]),
    );
    expect(result.current.palette!.ramps).toHaveLength(2);
  });

  it('records an error keyed by seed id for a seed outside range', () => {
    const { result } = renderHook(() =>
      usePalettes([seed('a', parsed('#000000'))]),
    );
    expect(result.current.palette).toBeNull();
    expect(result.current.errors.get('a')?.code).toBe('SEED_OUT_OF_RANGE');
  });

  it('returns a valid palette alongside errors for the failing seed', () => {
    const { result } = renderHook(() =>
      usePalettes([
        seed('a', parsed('#2563EB')),
        seed('b', parsed('#000000')),
      ]),
    );
    expect(result.current.palette!.ramps).toHaveLength(1);
    expect(result.current.errors.get('b')?.code).toBe('SEED_OUT_OF_RANGE');
  });
});
