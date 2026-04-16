import { useMemo } from 'react';
import { generateRamp } from '@quieto/engine';
import type { ColorError, ParsedColor, Palette, Ramp } from '@quieto/engine';

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

export type SeedEntry = {
  id: string;
  parsed: ParsedColor | null;
};

export type UsePalettesResult = {
  palette: Palette | null;
  errors: Map<string, ColorError>;
};

export function usePalettes(
  seeds: SeedEntry[],
  config: RampConfig = DEFAULT_RAMP_CONFIG,
): UsePalettesResult {
  const { steps, rangeMin, rangeMax, distribution } = config;

  const seedSignature = seeds
    .map((s) => {
      if (!s.parsed) return `${s.id}:null`;
      const { l, c, h } = s.parsed.oklch;
      return `${s.id}:${l},${c},${h}`;
    })
    .join('|');

  return useMemo<UsePalettesResult>(() => {
    const ramps: Ramp[] = [];
    const errors = new Map<string, ColorError>();

    let nameIndex = 0;
    seeds.forEach((seed) => {
      if (!seed.parsed) return;
      nameIndex += 1;
      const { l, c, h } = seed.parsed.oklch;
      try {
        const result = generateRamp({
          seed: { l, c, h },
          steps,
          range: { min: rangeMin, max: rangeMax },
          distribution,
          name: `color-${nameIndex}`,
        });
        if (result.ok) {
          ramps.push(result.value);
        } else {
          errors.set(seed.id, result.error);
        }
      } catch {
        errors.set(seed.id, {
          code: 'GENERATION_FAILED' as const,
          message: 'Unexpected error generating ramp',
        });
      }
    });

    const palette = ramps.length > 0 ? { ramps } : null;
    return { palette, errors };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedSignature, steps, rangeMin, rangeMax, distribution]);
}
