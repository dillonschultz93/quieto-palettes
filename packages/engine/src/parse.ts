import { parse, converter } from 'culori';
import type { OklchColor, ColorFormat, ColorError, ParsedColor, Result } from './types.js';

const toOklch = converter('oklch');

const HSB_REGEX = /^hsb\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*\)$/i;

function parseHsb(input: string): { h: number; s: number; v: number } | undefined {
  const match = input.match(HSB_REGEX);
  if (!match) return undefined;
  const h = Number(match[1]);
  const s = Number(match[2]);
  const v = Number(match[3]);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(v)) return undefined;
  return { h, s: s / 100, v: v / 100 };
}

function detectFormat(input: string, culoriMode: string | undefined): ColorFormat | undefined {
  if (input.trimStart().startsWith('#')) return 'hex';
  if (culoriMode === 'rgb' && /^rgba?\s*\(/i.test(input.trimStart())) return 'rgb';
  if (culoriMode === 'hsl' && /^hsla?\s*\(/i.test(input.trimStart())) return 'hsl';
  return undefined;
}

/**
 * Undefined/NaN hue is normalized to 0 for achromatic colors (chroma ≈ 0).
 * culori produces h: undefined for achromatic OKLCH colors.
 * Downstream consumers can rely on h always being a finite number.
 */
function normalizeOklch(raw: { l: number; c: number; h?: number }): OklchColor {
  return {
    l: raw.l,
    c: raw.c,
    h: (raw.h == null || Number.isNaN(raw.h)) ? 0 : raw.h,
  };
}

export function parseColor(input: string): Result<ParsedColor, ColorError> {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { ok: false, error: { code: 'INVALID_COLOR', message: 'Input is empty' } };
  }

  const hsbValues = parseHsb(trimmed);
  if (hsbValues) {
    const oklchResult = toOklch({ mode: 'hsv', ...hsbValues });
    if (!oklchResult) {
      return { ok: false, error: { code: 'CONVERSION_FAILED', message: `Failed to convert HSB color "${trimmed}" to OKLCH` } };
    }
    return {
      ok: true,
      value: {
        oklch: normalizeOklch(oklchResult),
        original: input,
        format: 'hsb',
      },
    };
  }

  const parsed = parse(trimmed);
  if (!parsed) {
    return { ok: false, error: { code: 'INVALID_COLOR', message: `Cannot parse "${trimmed}" as a color` } };
  }

  const format = detectFormat(trimmed, parsed.mode);
  if (!format) {
    return { ok: false, error: { code: 'UNSUPPORTED_FORMAT', message: 'Unsupported color format. Use hex, rgb(), hsl(), or hsb(). Named colors are not supported.' } };
  }

  const oklchResult = toOklch(parsed);
  if (!oklchResult) {
    return { ok: false, error: { code: 'CONVERSION_FAILED', message: `Failed to convert "${trimmed}" to OKLCH` } };
  }

  return {
    ok: true,
    value: {
      oklch: normalizeOklch(oklchResult),
      original: input,
      format,
    },
  };
}
