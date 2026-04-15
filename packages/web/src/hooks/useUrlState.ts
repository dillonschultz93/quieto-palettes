import { useCallback, useEffect, useRef } from 'react';
import {
  deserializeState,
  paletteToState,
  serializeState,
} from '@quieto/engine';
import type { Palette, PaletteStateV1 } from '@quieto/engine';
import type { RampConfig } from './usePalette';

type UseUrlStateResult = {
  initialState: PaletteStateV1 | null;
  initialSeedHex: string | null;
  initialConfig: RampConfig | null;
  writeState: (palette: Palette) => void;
};

type ReadResult = {
  state: PaletteStateV1 | null;
  malformed: boolean;
};

function clampNumber(n: number, min: number, max: number): number {
  const v = Number.isFinite(n) ? n : min;
  return Math.min(Math.max(v, min), max);
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof history !== 'undefined';
}

function readEncoded(): string | null {
  if (!isBrowser()) return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  return params.get('s');
}

function stripHash() {
  if (!isBrowser()) return;
  history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  );
}

function readInitialState(): ReadResult {
  const encoded = readEncoded();
  if (!encoded) return { state: null, malformed: false };
  let result;
  try {
    result = deserializeState(encoded);
  } catch {
    return { state: null, malformed: true };
  }
  if (!result.ok) return { state: null, malformed: true };
  return { state: result.value, malformed: false };
}

export function useUrlState(): UseUrlStateResult {
  const initialRef = useRef<ReadResult | undefined>(undefined);
  if (initialRef.current === undefined) {
    initialRef.current = readInitialState();
  }
  const { state: initialState, malformed } = initialRef.current;
  const firstRamp = initialState?.ramps[0] ?? null;
  const initialSeedHex = firstRamp?.seedHex ?? null;
  const initialConfig: RampConfig | null = firstRamp
    ? {
        steps: clampNumber(Math.round(firstRamp.steps), 2, 60),
        rangeMin: clampNumber(firstRamp.range.min, 0, 1),
        rangeMax: clampNumber(firstRamp.range.max, 0, 1),
        distribution:
          firstRamp.distribution === 'eased' ? 'eased' : 'linear',
      }
    : null;

  useEffect(() => {
    if (malformed) stripHash();
  }, [malformed]);

  const writeState = useCallback((palette: Palette) => {
    if (!isBrowser()) return;
    if (!palette.ramps.length) return;
    const state = paletteToState(palette);
    const encoded = serializeState(state);
    const nextHash = '#s=' + encoded;
    if (window.location.hash === nextHash) return;
    const next =
      window.location.pathname + window.location.search + nextHash;
    history.replaceState(null, '', next);
  }, []);

  return { initialState, initialSeedHex, initialConfig, writeState };
}
