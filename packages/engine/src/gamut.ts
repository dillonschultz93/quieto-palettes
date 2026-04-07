import { displayable, clampChroma } from 'culori';
import type { GamutMapResult, OklchColor } from './types.js';

export function isInGamut(color: OklchColor): boolean {
  return displayable({ mode: 'oklch', ...color });
}

export function clampOklchValues(color: OklchColor): OklchColor {
  return {
    l: Number.isFinite(color.l) ? Math.max(0, Math.min(1, color.l)) : 0,
    c: Number.isFinite(color.c) ? Math.max(0, Math.min(0.5, color.c)) : 0,
    h: Number.isFinite(color.h) ? ((color.h % 360) + 360) % 360 : 0,
  };
}

export function mapToGamut(color: OklchColor): GamutMapResult {
  const safe = clampOklchValues(color);
  const originalChroma = color.c;
  const culoriColor = { mode: 'oklch' as const, l: safe.l, c: safe.c, h: safe.h };

  if (isInGamut(safe)) {
    return {
      color: { l: safe.l, c: safe.c, h: safe.h },
      clamped: false,
      originalChroma,
    };
  }

  const mapped = clampChroma(culoriColor, 'oklch');
  return {
    color: {
      l: mapped.l ?? safe.l,
      c: mapped.c ?? 0,
      h: mapped.h ?? safe.h,
    },
    clamped: true,
    originalChroma,
  };
}
