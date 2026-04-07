import type { PaletteStateV1, RampStateV1, Palette, ColorError, Result } from './types.js';
import { oklchToHex } from './convert.js';

// Compact JSON keys: v=version, r=ramps, n=name, s=seedHex, t=steps, a=range.min, b=range.max, d=distribution
type CompactRamp = { n: string; s: string; t: number; a: number; b: number; d: 'l' | 'e' };
type CompactState = { v: 1; r: CompactRamp[] };

function toBase64Url(str: string): string {
  // Encode to UTF-8 bytes first to handle non-Latin-1 characters (CJK, emoji, accents)
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(pad);
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function roundRange(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function serializeState(state: PaletteStateV1): string {
  const compact: CompactState = {
    v: 1,
    r: state.ramps.map((ramp) => ({
      n: ramp.name,
      s: ramp.seedHex.replace(/^#/, '').toLowerCase(),
      t: ramp.steps,
      a: roundRange(ramp.range.min),
      b: roundRange(ramp.range.max),
      d: ramp.distribution === 'linear' ? 'l' : 'e',
    })),
  };
  return toBase64Url(JSON.stringify(compact));
}

function validateRampState(ramp: CompactRamp, index: number): ColorError | null {
  if (typeof ramp.n !== 'string' || ramp.n.length === 0) {
    return { code: 'INVALID_STATE', message: `Ramp ${index}: name is required` };
  }
  if (typeof ramp.s !== 'string' || !/^[0-9a-fA-F]{6}$/.test(ramp.s)) {
    return { code: 'INVALID_STATE', message: `Ramp ${index}: seedHex must be 6 hex digits` };
  }
  if (!Number.isInteger(ramp.t) || ramp.t < 1) {
    return { code: 'INVALID_STATE', message: `Ramp ${index}: steps must be a positive integer` };
  }
  if (typeof ramp.a !== 'number' || typeof ramp.b !== 'number' ||
      ramp.a < 0 || ramp.b > 1 || ramp.a >= ramp.b) {
    return { code: 'INVALID_STATE', message: `Ramp ${index}: range must satisfy 0 <= min < max <= 1` };
  }
  if (ramp.d !== 'l' && ramp.d !== 'e') {
    return { code: 'INVALID_STATE', message: `Ramp ${index}: distribution must be 'l' or 'e'` };
  }
  return null;
}

export function deserializeState(encoded: string): Result<PaletteStateV1, ColorError> {
  let json: string;
  try {
    json = fromBase64Url(encoded);
  } catch {
    return { ok: false, error: { code: 'INVALID_STATE', message: 'Failed to decode base64url string' } };
  }

  let compact: CompactState;
  try {
    compact = JSON.parse(json) as CompactState;
  } catch {
    return { ok: false, error: { code: 'INVALID_STATE', message: 'Failed to parse JSON payload' } };
  }

  if (compact.v !== 1) {
    return { ok: false, error: { code: 'VERSION_UNSUPPORTED', message: `Unsupported version: ${compact.v}` } };
  }

  if (!Array.isArray(compact.r) || compact.r.length === 0) {
    return { ok: false, error: { code: 'INVALID_STATE', message: 'Ramps array is required and must not be empty' } };
  }

  const ramps: RampStateV1[] = [];
  for (let i = 0; i < compact.r.length; i++) {
    const cr = compact.r[i]!;
    const err = validateRampState(cr, i);
    if (err) return { ok: false, error: err };

    ramps.push({
      name: cr.n,
      seedHex: cr.s.toLowerCase(),
      steps: cr.t,
      range: { min: cr.a, max: cr.b },
      distribution: cr.d === 'l' ? 'linear' : 'eased',
    });
  }

  return { ok: true, value: { version: 1, ramps } };
}

export function paletteToState(palette: Palette): PaletteStateV1 {
  return {
    version: 1,
    ramps: palette.ramps.map((ramp) => {
      const seedStep = ramp.steps.find((s) => s.isSeed);
      const seedHex = (seedStep ? seedStep.hex : oklchToHex(ramp.seed)).replace(/^#/, '').toLowerCase();
      return {
        name: ramp.name,
        seedHex,
        steps: ramp.steps.length,
        range: ramp.range,
        distribution: ramp.distribution,
      };
    }),
  };
}
