import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  generateRamp,
  parseColor,
  paletteToState,
  serializeState,
} from '@quieto/engine';
import type { Palette, Ramp } from '@quieto/engine';
import { useUrlState } from '../useUrlState';

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

function buildPalette(input = '#2563EB'): Palette {
  return { ramps: [buildRamp(input)] };
}

function encodedFor(input: string): string {
  return serializeState(paletteToState(buildPalette(input)));
}

describe('useUrlState', () => {
  let replaceSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.location.hash = '';
    replaceSpy = vi.spyOn(history, 'replaceState');
  });

  afterEach(() => {
    replaceSpy.mockRestore();
    window.location.hash = '';
  });

  it('returns null initial state when hash is empty', () => {
    const { result } = renderHook(() => useUrlState());
    expect(result.current.initialState).toBeNull();
    expect(result.current.initialSeeds).toEqual([]);
  });

  it('decodes a valid hash on mount', () => {
    const encoded = encodedFor('#2563EB');
    window.location.hash = '#s=' + encoded;

    const { result } = renderHook(() => useUrlState());
    expect(result.current.initialState).not.toBeNull();
    expect(result.current.initialSeeds).toEqual(['2563eb']);
  });

  it('strips malformed hash and returns null', () => {
    window.location.hash = '#s=not-valid-base64';

    const { result } = renderHook(() => useUrlState());
    expect(result.current.initialState).toBeNull();
    expect(replaceSpy).toHaveBeenCalled();
    const lastCall = replaceSpy.mock.calls.at(-1);
    expect(lastCall?.[2]).not.toContain('#');
  });

  it('writeState uses history.replaceState with #s= prefix', () => {
    const { result } = renderHook(() => useUrlState());
    act(() => {
      result.current.writeState(buildPalette('#2563EB'));
    });

    expect(replaceSpy).toHaveBeenCalled();
    const lastCall = replaceSpy.mock.calls.at(-1);
    const url = lastCall?.[2] as string;
    expect(url).toContain('#s=');
  });

  it('encoded default ramp stays under 2000 characters', () => {
    const { result } = renderHook(() => useUrlState());
    act(() => {
      result.current.writeState(buildPalette('#2563EB'));
    });
    const url = replaceSpy.mock.calls.at(-1)?.[2] as string;
    expect(url.length).toBeLessThan(2000);
  });

  it('does not write when palette is empty', () => {
    const { result } = renderHook(() => useUrlState());
    replaceSpy.mockClear();
    act(() => {
      result.current.writeState({ ramps: [] });
    });
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('roundtrips seed hex through encode/decode', () => {
    const { result: writer } = renderHook(() => useUrlState());
    act(() => {
      writer.current.writeState(buildPalette('#EB2525'));
    });
    const writtenUrl = replaceSpy.mock.calls.at(-1)?.[2] as string;
    const hash = writtenUrl.split('#')[1];
    window.location.hash = '#' + hash;

    const { result: reader } = renderHook(() => useUrlState());
    expect(reader.current.initialSeeds).toEqual(['eb2525']);
  });
});
