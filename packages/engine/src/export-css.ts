import type { Palette, CssExportOptions, ColorError, Result } from './types.js';

const NUMERIC_SUFFIXES_10 = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;

function sanitizeRampName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function exportCSS(palette: Palette, options: CssExportOptions): Result<string, ColorError> {
  if (palette.ramps.length === 0) {
    return {
      ok: false,
      error: { code: 'EMPTY_PALETTE', message: 'Palette has no ramps to export' },
    };
  }

  if (options.naming === 'numeric') {
    for (const ramp of palette.ramps) {
      if (ramp.steps.length !== 10) {
        return {
          ok: false,
          error: {
            code: 'INVALID_STEP_COUNT',
            message: `Numeric naming requires exactly 10 steps, but ramp "${ramp.name}" has ${ramp.steps.length}`,
          },
        };
      }
    }
  }

  const declarations: string[] = [];

  for (const ramp of palette.ramps) {
    const safeName = sanitizeRampName(ramp.name);
    if (safeName === '') {
      return {
        ok: false,
        error: { code: 'INVALID_RAMP_NAME', message: `Ramp name "${ramp.name}" produces an empty CSS identifier after sanitization` },
      };
    }
    // Reverse: generateRamp produces dark-to-light (ascending L); Tailwind needs 50=lightest, 900=darkest
    const stepsLightFirst = [...ramp.steps].reverse();
    for (let i = 0; i < stepsLightFirst.length; i++) {
      const suffix = NUMERIC_SUFFIXES_10[i]!;
      const hex = stepsLightFirst[i]!.hex.toLowerCase();
      declarations.push(`  --color-${safeName}-${suffix}: ${hex};`);
    }
  }

  const css = `:root {\n${declarations.join('\n')}\n}\n`;

  return { ok: true, value: css };
}
