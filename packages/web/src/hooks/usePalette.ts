import { useMemo } from 'react';
import { generateRamp } from '@quieto/engine';
import type { ColorError, ParsedColor, Ramp } from '@quieto/engine';

export type RampConfig = {
  steps: number;
  rangeMin: number;
  rangeMax: number;
  distribution: 'linear' | 'eased';
};

export const DEFAULT_RAMP_CONFIG: RampConfig = {
  steps: 10,
  rangeMin: 0.05,
  rangeMax: 0.97,
  distribution: 'linear',
};

export type UsePaletteResult = {
  ramp: Ramp | null;
  error: ColorError | null;
};

export function usePalette(
  parsedColor: ParsedColor | null,
  config: RampConfig = DEFAULT_RAMP_CONFIG,
): UsePaletteResult {
  const l = parsedColor?.oklch.l ?? null;
  const c = parsedColor?.oklch.c ?? null;
  const h = parsedColor?.oklch.h ?? null;
  const { steps, rangeMin, rangeMax, distribution } = config;

  return useMemo<UsePaletteResult>(() => {
    if (l === null || c === null || h === null) {
      return { ramp: null, error: null };
    }

    try {
      const result = generateRamp({
        seed: { l, c, h },
        steps,
        range: { min: rangeMin, max: rangeMax },
        distribution,
        name: 'color',
      });

      if (result.ok) {
        return { ramp: result.value, error: null };
      }
      return { ramp: null, error: result.error };
    } catch {
      return {
        ramp: null,
        error: { code: 'GENERATION_FAILED' as const, message: 'Unexpected error generating ramp' },
      };
    }
  }, [l, c, h, steps, rangeMin, rangeMax, distribution]);
}
