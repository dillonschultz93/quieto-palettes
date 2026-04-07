import { formatHex, formatRgb, formatHsl, converter } from 'culori';
import type { OklchColor } from './types.js';

const toHsv = converter('hsv');

function toCuloriOklch(color: OklchColor) {
  return { mode: 'oklch' as const, l: color.l, c: color.c, h: color.h };
}

export function oklchToHex(color: OklchColor): string {
  return formatHex(toCuloriOklch(color)) ?? '#000000';
}

export function oklchToRgb(color: OklchColor): string {
  return formatRgb(toCuloriOklch(color)) ?? 'rgb(0, 0, 0)';
}

export function oklchToHsl(color: OklchColor): string {
  return formatHsl(toCuloriOklch(color)) ?? 'hsl(0, 0%, 0%)';
}

export function oklchToHsb(color: OklchColor): string {
  const hsv = toHsv(toCuloriOklch(color));
  if (!hsv) return 'hsb(0, 0%, 0%)';
  const h = Math.round(hsv.h == null || Number.isNaN(hsv.h) ? 0 : hsv.h);
  const s = Math.round((hsv.s ?? 0) * 100);
  const b = Math.round((hsv.v ?? 0) * 100);
  return `hsb(${h}, ${s}%, ${b}%)`;
}
