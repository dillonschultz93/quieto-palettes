import { describe, it, expect } from 'vitest';
import { generateRamp } from '../generate.js';
import { isInGamut } from '../gamut.js';
import type { GenerateRampOptions, Ramp, ColorError, Result } from '../types.js';

const defaultSeed = { l: 0.55, c: 0.18, h: 264 };

const defaultOptions: GenerateRampOptions = {
  seed: defaultSeed,
  steps: 10,
  range: { min: 0.05, max: 0.97 },
  distribution: 'linear',
};

function expectOk(result: Result<Ramp, ColorError>): Ramp {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected ok result');
  return result.value;
}

function expectErr(result: Result<Ramp, ColorError>): ColorError {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected error result');
  return result.error;
}

describe('generateRamp', () => {
  describe('linear 10-step ramp (AC #1)', () => {
    it('returns exactly 10 RampStep objects', () => {
      const ramp = expectOk(generateRamp(defaultOptions));
      expect(ramp.steps).toHaveLength(10);
    });

    it('has exactly one step with isSeed: true matching seed L, C, H', () => {
      const ramp = expectOk(generateRamp(defaultOptions));
      const seedSteps = ramp.steps.filter((s) => s.isSeed);
      expect(seedSteps).toHaveLength(1);
      const seed = seedSteps[0]!;
      expect(seed.oklch.l).toBeCloseTo(defaultSeed.l, 5);
      expect(seed.oklch.c).toBeCloseTo(defaultSeed.c, 5);
      expect(seed.oklch.h).toBeCloseTo(defaultSeed.h, 5);
    });

    it('has strictly monotonically increasing lightness', () => {
      const ramp = expectOk(generateRamp(defaultOptions));
      for (let i = 1; i < ramp.steps.length; i++) {
        expect(ramp.steps[i]!.oklch.l).toBeGreaterThan(ramp.steps[i - 1]!.oklch.l);
      }
    });

    it('each step has non-empty hex, rgb, hsl, hsb strings', () => {
      const ramp = expectOk(generateRamp(defaultOptions));
      for (const step of ramp.steps) {
        expect(step.hex).toBeTruthy();
        expect(step.rgb).toBeTruthy();
        expect(step.hsl).toBeTruthy();
        expect(step.hsb).toBeTruthy();
      }
    });

    it('hex strings match #rrggbb pattern', () => {
      const ramp = expectOk(generateRamp(defaultOptions));
      for (const step of ramp.steps) {
        expect(step.hex).toMatch(/^#[0-9a-f]{6}$/);
      }
    });

    it('all output colors are within sRGB gamut', () => {
      const ramp = expectOk(generateRamp(defaultOptions));
      for (const step of ramp.steps) {
        expect(isInGamut(step.oklch)).toBe(true);
      }
    });

    it('first step lightness equals range.min, last equals range.max', () => {
      const ramp = expectOk(generateRamp(defaultOptions));
      expect(ramp.steps[0]!.oklch.l).toBeCloseTo(0.05, 3);
      expect(ramp.steps[ramp.steps.length - 1]!.oklch.l).toBeCloseTo(0.97, 3);
    });
  });

  describe('eased distribution (AC #2)', () => {
    const easedOptions: GenerateRampOptions = {
      ...defaultOptions,
      distribution: 'eased',
    };

    it('mid-range differences are smaller than extreme differences', () => {
      const ramp = expectOk(generateRamp(easedOptions));
      const diffs: number[] = [];
      for (let i = 1; i < ramp.steps.length; i++) {
        diffs.push(ramp.steps[i]!.oklch.l - ramp.steps[i - 1]!.oklch.l);
      }
      // Average of the two middle diffs should be smaller than average of the two extreme diffs
      const mid = Math.floor(diffs.length / 2);
      const avgMid = (diffs[mid - 1]! + diffs[mid]!) / 2;
      const avgExtreme = (diffs[0]! + diffs[diffs.length - 1]!) / 2;
      expect(avgMid).toBeLessThan(avgExtreme);
    });

    it('seed step is still exact match', () => {
      const ramp = expectOk(generateRamp(easedOptions));
      const seedSteps = ramp.steps.filter((s) => s.isSeed);
      expect(seedSteps).toHaveLength(1);
      expect(seedSteps[0]!.oklch.l).toBeCloseTo(defaultSeed.l, 5);
      expect(seedSteps[0]!.oklch.c).toBeCloseTo(defaultSeed.c, 5);
      expect(seedSteps[0]!.oklch.h).toBeCloseTo(defaultSeed.h, 5);
    });
  });

  describe('custom range (AC #3)', () => {
    it('no step below min or above max for { min: 0.10, max: 0.90 }', () => {
      const ramp = expectOk(generateRamp({
        ...defaultOptions,
        range: { min: 0.10, max: 0.90 },
      }));
      for (const step of ramp.steps) {
        expect(step.oklch.l).toBeGreaterThanOrEqual(0.10 - 1e-10);
        expect(step.oklch.l).toBeLessThanOrEqual(0.90 + 1e-10);
      }
    });
  });

  describe('step IDs', () => {
    it('each step has a unique id string', () => {
      const ramp = expectOk(generateRamp(defaultOptions));
      const ids = ramp.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      }
    });
  });

  describe('isOverride', () => {
    it('is false for all generated steps', () => {
      const ramp = expectOk(generateRamp(defaultOptions));
      for (const step of ramp.steps) {
        expect(step.isOverride).toBe(false);
      }
    });
  });

  describe('name', () => {
    it('defaults to "color" when not provided', () => {
      const ramp = expectOk(generateRamp(defaultOptions));
      expect(ramp.name).toBe('color');
    });

    it('uses provided name when given', () => {
      const ramp = expectOk(generateRamp({ ...defaultOptions, name: 'brand-blue' }));
      expect(ramp.name).toBe('brand-blue');
    });
  });

  describe('steps=1 edge case', () => {
    it('returns exactly 1 step at the seed lightness', () => {
      const ramp = expectOk(generateRamp({ ...defaultOptions, steps: 1 }));
      expect(ramp.steps).toHaveLength(1);
      expect(ramp.steps[0]!.isSeed).toBe(true);
      expect(ramp.steps[0]!.oklch.l).toBeCloseTo(defaultSeed.l, 5);
    });
  });

  describe('validation errors', () => {
    it('steps: 0 returns error result', () => {
      const err = expectErr(generateRamp({ ...defaultOptions, steps: 0 }));
      expect(err.code).toBe('INVALID_STEPS');
    });

    it('non-integer steps returns error', () => {
      const err = expectErr(generateRamp({ ...defaultOptions, steps: 2.5 }));
      expect(err.code).toBe('INVALID_STEPS');
    });

    it('range.min >= range.max returns error', () => {
      const err = expectErr(generateRamp({ ...defaultOptions, range: { min: 0.9, max: 0.1 } }));
      expect(err.code).toBe('INVALID_RANGE');
    });

    it('range.min < 0 returns error', () => {
      const err = expectErr(generateRamp({ ...defaultOptions, range: { min: -0.1, max: 0.9 } }));
      expect(err.code).toBe('INVALID_RANGE');
    });

    it('range.max > 1 returns error', () => {
      const err = expectErr(generateRamp({ ...defaultOptions, range: { min: 0.1, max: 1.1 } }));
      expect(err.code).toBe('INVALID_RANGE');
    });

    it('seed lightness outside range returns error', () => {
      const err = expectErr(generateRamp({
        ...defaultOptions,
        seed: { l: 0.01, c: 0.18, h: 264 },
        range: { min: 0.10, max: 0.90 },
      }));
      expect(err.code).toBe('SEED_OUT_OF_RANGE');
    });
  });

  describe('gamut clamping', () => {
    it('high-chroma yellow seed triggers gamut clamping on some steps', () => {
      const ramp = expectOk(generateRamp({
        seed: { l: 0.8, c: 0.35, h: 110 },
        steps: 10,
        range: { min: 0.05, max: 0.97 },
        distribution: 'linear',
      }));
      const clampedSteps = ramp.steps.filter((s) => s.isGamutClamped);
      expect(clampedSteps.length).toBeGreaterThan(0);
      // All clamped steps should still be displayable after clamping
      for (const step of ramp.steps) {
        expect(isInGamut(step.oklch)).toBe(true);
      }
    });
  });
});
