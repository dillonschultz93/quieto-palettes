import { useCallback, useEffect, useRef } from 'react';
import {
  deserializeState,
  paletteToState,
  serializeState,
} from '@quieto/engine';
import type { Palette, PaletteStateV1 } from '@quieto/engine';

type UseUrlStateResult = {
  initialState: PaletteStateV1 | null;
  initialSeedHex: string | null;
  writeState: (palette: Palette) => void;
};

type ReadResult = {
  state: PaletteStateV1 | null;
  malformed: boolean;
};

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
  const initialSeedHex = initialState?.ramps[0]?.seedHex ?? null;

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

  return { initialState, initialSeedHex, writeState };
}
