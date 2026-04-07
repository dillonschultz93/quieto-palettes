import type { Palette, ColorError, Result } from './types.js';
import { calculateContrast } from './contrast.js';

type JsonExportStep = {
  hex: string;
  rgb: string;
  hsl: string;
  hsb: string;
  oklch: { l: number; c: number; h: number };
  isSeed: boolean;
  isGamutClamped: boolean;
};

type JsonExportContrastPair = {
  pair: [string, string];
  ratio: number;
  aa: boolean;
  aaa: boolean;
  aaLarge: boolean;
  aaaLarge: boolean;
};

type JsonExportRamp = {
  name: string;
  steps: JsonExportStep[];
};

type JsonExportPalette = {
  ramps: JsonExportRamp[];
  contrast: JsonExportContrastPair[];
};

export function exportJSON(palette: Palette): Result<string, ColorError> {
  if (palette.ramps.length === 0) {
    return {
      ok: false,
      error: { code: 'EMPTY_PALETTE', message: 'Palette has no ramps to export' },
    };
  }

  const ramps: JsonExportRamp[] = palette.ramps.map((ramp) => ({
    name: ramp.name,
    steps: ramp.steps.map((step) => ({
      hex: step.hex,
      rgb: step.rgb,
      hsl: step.hsl,
      hsb: step.hsb,
      oklch: { l: step.oklch.l, c: step.oklch.c, h: step.oklch.h },
      isSeed: step.isSeed,
      isGamutClamped: step.isGamutClamped,
    })),
  }));

  const contrast: JsonExportContrastPair[] = [];

  for (const ramp of palette.ramps) {
    for (let i = 0; i < ramp.steps.length; i++) {
      for (let j = i + 1; j < ramp.steps.length; j++) {
        const result = calculateContrast(ramp.steps[i]!.oklch, ramp.steps[j]!.oklch);
        contrast.push({
          pair: [`${ramp.name}:${i}`, `${ramp.name}:${j}`],
          ratio: Math.round(result.ratio * 100) / 100,
          aa: result.aa,
          aaa: result.aaa,
          aaLarge: result.aaLarge,
          aaaLarge: result.aaaLarge,
        });
      }
    }
  }

  const output: JsonExportPalette = { ramps, contrast };
  return { ok: true, value: JSON.stringify(output, null, 2) };
}
