import { converter } from 'culori';
import type { OklchColor, ContrastResult } from './types.js';

const toRgb = converter('rgb');

/**
 * Convert sRGB gamma-encoded channel (0–1) to linear light.
 * Per WCAG 2.x relative luminance definition.
 */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Compute WCAG 2.x relative luminance from an OklchColor.
 * Converts OKLCH → sRGB via culori, then applies the
 * piecewise sRGB linearization and ITU-R BT.709 coefficients.
 */
function relativeLuminance(color: OklchColor): number {
  const rgb = toRgb({ mode: 'oklch', l: color.l, c: color.c, h: color.h });
  if (!rgb) return 0;
  const r = srgbToLinear(Math.max(0, Math.min(1, rgb.r ?? 0)));
  const g = srgbToLinear(Math.max(0, Math.min(1, rgb.g ?? 0)));
  const b = srgbToLinear(Math.max(0, Math.min(1, rgb.b ?? 0)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate WCAG 2.x contrast ratio between two OklchColors.
 * Input order does not matter — the lighter luminance is always the numerator.
 */
export function calculateContrast(color1: OklchColor, color2: OklchColor): ContrastResult {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio,
    aa: ratio >= 4.5,
    aaa: ratio >= 7.0,
    aaLarge: ratio >= 3.0,
    aaaLarge: ratio >= 4.5,
  };
}
