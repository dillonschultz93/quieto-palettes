import { describe, it, expect } from 'vitest';
import { serializeState, deserializeState, paletteToState } from '../serialize.js';
import { parseColor } from '../parse.js';
import { generateRamp } from '../generate.js';
import type { PaletteStateV1, ColorError, Result, Ramp } from '../types.js';

const referenceState: PaletteStateV1 = {
  version: 1,
  ramps: [{
    name: 'color',
    seedHex: '2563eb',
    steps: 10,
    range: { min: 0.05, max: 0.97 },
    distribution: 'linear',
  }],
};

function expectOk<T>(result: Result<T, ColorError>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected ok result');
  return result.value;
}

function expectErr<T>(result: Result<T, ColorError>): ColorError {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected error result');
  return result.error;
}

function buildRamp(seedHex: string, name: string): Ramp {
  const parsed = parseColor(`#${seedHex}`);
  if (!parsed.ok) throw new Error('Failed to parse seed');
  const result = generateRamp({
    seed: parsed.value.oklch,
    steps: 10,
    range: { min: 0.05, max: 0.97 },
    distribution: 'linear',
    name,
  });
  if (!result.ok) throw new Error('Failed to generate ramp');
  return result.value;
}

describe('serializeState', () => {
  describe('reference case (AC #1)', () => {
    it('output is under 200 characters', () => {
      const encoded = serializeState(referenceState);
      expect(encoded.length).toBeLessThan(200);
    });

    it('output is URL-safe (base64url alphabet only)', () => {
      const encoded = serializeState(referenceState);
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('contains no spaces', () => {
      const encoded = serializeState(referenceState);
      expect(encoded).not.toContain(' ');
    });

    it('contains no padding characters', () => {
      const encoded = serializeState(referenceState);
      expect(encoded).not.toContain('=');
    });
  });
});

describe('deserializeState', () => {
  describe('round-trip (AC #2)', () => {
    it('deserialize(serialize(x)) deep-equals x', () => {
      const encoded = serializeState(referenceState);
      const decoded = expectOk(deserializeState(encoded));
      expect(decoded).toEqual(referenceState);
    });

    it('round-trips with eased distribution', () => {
      const state: PaletteStateV1 = {
        version: 1,
        ramps: [{
          name: 'brand',
          seedHex: 'ff5733',
          steps: 10,
          range: { min: 0.1, max: 0.9 },
          distribution: 'eased',
        }],
      };
      const decoded = expectOk(deserializeState(serializeState(state)));
      expect(decoded).toEqual(state);
    });

    it('round-trips with multiple ramps', () => {
      const state: PaletteStateV1 = {
        version: 1,
        ramps: [
          { name: 'blue', seedHex: '2563eb', steps: 10, range: { min: 0.05, max: 0.97 }, distribution: 'linear' },
          { name: 'red', seedHex: 'dc2626', steps: 10, range: { min: 0.05, max: 0.97 }, distribution: 'linear' },
        ],
      };
      const decoded = expectOk(deserializeState(serializeState(state)));
      expect(decoded).toEqual(state);
    });
  });

  describe('regeneration (AC #2)', () => {
    it('deserialized state regenerates matching ramp hex values', () => {
      const encoded = serializeState(referenceState);
      const decoded = expectOk(deserializeState(encoded));
      const rampState = decoded.ramps[0]!;

      // Generate from original
      const parsedOrig = parseColor(`#${referenceState.ramps[0]!.seedHex}`);
      if (!parsedOrig.ok) throw new Error('parse failed');
      const origRamp = expectOk(generateRamp({
        seed: parsedOrig.value.oklch,
        steps: referenceState.ramps[0]!.steps,
        range: referenceState.ramps[0]!.range,
        distribution: referenceState.ramps[0]!.distribution,
        name: referenceState.ramps[0]!.name,
      }));

      // Generate from round-tripped
      const parsedRT = parseColor(`#${rampState.seedHex}`);
      if (!parsedRT.ok) throw new Error('parse failed');
      const rtRamp = expectOk(generateRamp({
        seed: parsedRT.value.oklch,
        steps: rampState.steps,
        range: rampState.range,
        distribution: rampState.distribution,
        name: rampState.name,
      }));

      // Compare each step's hex
      expect(rtRamp.steps.length).toBe(origRamp.steps.length);
      for (let i = 0; i < origRamp.steps.length; i++) {
        expect(rtRamp.steps[i]!.hex).toBe(origRamp.steps[i]!.hex);
      }
    });
  });

  describe('invalid input', () => {
    it('garbage string returns error, no throw', () => {
      const result = deserializeState('not-valid-base64!!!');
      const err = expectErr(result);
      expect(err.code).toBe('INVALID_STATE');
    });

    it('truncated payload returns error', () => {
      const encoded = serializeState(referenceState);
      const truncated = encoded.slice(0, Math.floor(encoded.length / 2));
      const result = deserializeState(truncated);
      expect(result.ok).toBe(false);
    });

    it('tampered base64 returns error or different data, never throws', () => {
      const encoded = serializeState(referenceState);
      const tampered = encoded.slice(0, 5) + 'XXXXXX' + encoded.slice(11);
      const result = deserializeState(tampered);
      if (result.ok) {
        // If it somehow decoded, the data must differ from original
        expect(result.value).not.toEqual(referenceState);
      } else {
        expect(result.error.code).toBeTruthy();
      }
    });

    it('unsupported version returns VERSION_UNSUPPORTED error', () => {
      const payload = btoa(JSON.stringify({ v: 99, r: [] }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const err = expectErr(deserializeState(payload));
      expect(err.code).toBe('VERSION_UNSUPPORTED');
    });

    it('empty ramps array returns error', () => {
      const payload = btoa(JSON.stringify({ v: 1, r: [] }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const err = expectErr(deserializeState(payload));
      expect(err.code).toBe('INVALID_STATE');
    });

    it('invalid seedHex returns error', () => {
      const payload = btoa(JSON.stringify({ v: 1, r: [{ n: 'x', s: 'ZZZZZZ', t: 10, a: 0.05, b: 0.97, d: 'l' }] }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const err = expectErr(deserializeState(payload));
      expect(err.code).toBe('INVALID_STATE');
    });

    it('range.min >= range.max returns error', () => {
      const payload = btoa(JSON.stringify({ v: 1, r: [{ n: 'x', s: '2563eb', t: 10, a: 0.9, b: 0.1, d: 'l' }] }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const err = expectErr(deserializeState(payload));
      expect(err.code).toBe('INVALID_STATE');
    });

    it('steps < 1 returns error', () => {
      const payload = btoa(JSON.stringify({ v: 1, r: [{ n: 'x', s: '2563eb', t: 0, a: 0.05, b: 0.97, d: 'l' }] }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const err = expectErr(deserializeState(payload));
      expect(err.code).toBe('INVALID_STATE');
    });
  });
});

describe('paletteToState', () => {
  it('converts a Palette to PaletteStateV1', () => {
    const ramp = buildRamp('2563eb', 'blue');
    const state = paletteToState({ ramps: [ramp] });
    expect(state.version).toBe(1);
    expect(state.ramps).toHaveLength(1);
    expect(state.ramps[0]!.name).toBe('blue');
    expect(state.ramps[0]!.seedHex).toMatch(/^[0-9a-f]{6}$/);
    expect(state.ramps[0]!.steps).toBe(10);
  });

  it('paletteToState output round-trips through serialize/deserialize', () => {
    const ramp = buildRamp('2563eb', 'blue');
    const state = paletteToState({ ramps: [ramp] });
    const encoded = serializeState(state);
    const decoded = expectOk(deserializeState(encoded));
    expect(decoded.version).toBe(state.version);
    expect(decoded.ramps[0]!.name).toBe(state.ramps[0]!.name);
    expect(decoded.ramps[0]!.seedHex).toBe(state.ramps[0]!.seedHex);
  });
});
