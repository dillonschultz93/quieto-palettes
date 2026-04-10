import { useMemo } from 'react';
import { generateRamp } from '@quieto/engine';
import type { ColorError, ParsedColor, Ramp } from '@quieto/engine';

export type UsePaletteResult = {
  ramp: Ramp | null;
  error: ColorError | null;
};

export function usePalette(parsedColor: ParsedColor | null): UsePaletteResult {
  // Memoize on the OKLCH primitive values so a new ParsedColor object with
  // identical values does not cause regeneration.
  const l = parsedColor?.oklch.l ?? null;
  const c = parsedColor?.oklch.c ?? null;
  const h = parsedColor?.oklch.h ?? null;

  return useMemo<UsePaletteResult>(() => {
    if (l === null || c === null || h === null) {
      return { ramp: null, error: null };
    }

    try {
      const result = generateRamp({
        seed: { l, c, h },
        steps: 10,
        range: { min: 0.05, max: 0.97 },
        distribution: 'linear',
        name: 'color',
      });

      if (result.ok) {
        return { ramp: result.value, error: null };
      }
      return { ramp: null, error: result.error };
    } catch {
      return { ramp: null, error: { code: 'GENERATION_FAILED' as const, message: 'Unexpected error generating ramp' } };
    }
  }, [l, c, h]);
}
