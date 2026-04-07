import { describe, it, expect } from 'vitest';
import { isInGamut, mapToGamut, clampOklchValues } from './gamut.js';

describe('isInGamut', () => {
  it('returns true for known in-gamut color (reference blue)', () => {
    expect(isInGamut({ l: 0.55, c: 0.18, h: 264 })).toBe(true);
  });

  it('returns false for known out-of-gamut color (saturated yellow)', () => {
    expect(isInGamut({ l: 0.9, c: 0.4, h: 110 })).toBe(false);
  });
});

describe('mapToGamut', () => {
  const blue = { l: 0.55, c: 0.18, h: 264 };
  const yellow = { l: 0.9, c: 0.4, h: 110 };

  it('passes in-gamut color through unchanged', () => {
    const r = mapToGamut(blue);
    expect(r.clamped).toBe(false);
    expect(r.originalChroma).toBeCloseTo(blue.c, 5);
    expect(r.color.l).toBeCloseTo(blue.l, 5);
    expect(r.color.c).toBeCloseTo(blue.c, 5);
    expect(r.color.h).toBeCloseTo(blue.h, 5);
  });

  it('clamps out-of-gamut saturated yellow', () => {
    const r = mapToGamut(yellow);
    expect(r.clamped).toBe(true);
    expect(r.originalChroma).toBeCloseTo(0.4, 5);
    expect(r.color.c).toBeLessThan(yellow.c);
    expect(isInGamut(r.color)).toBe(true);
  });

  it('preserves hue exactly after clamping', () => {
    const r = mapToGamut(yellow);
    expect(r.color.h).toBeCloseTo(yellow.h, 5);
  });

  it('preserves lightness exactly after clamping', () => {
    const r = mapToGamut(yellow);
    expect(r.color.l).toBeCloseTo(yellow.l, 5);
  });

  it('handles problematic cyan hue (~H=195)', () => {
    const c = { l: 0.7, c: 0.3, h: 195 };
    expect(isInGamut(c)).toBe(false);
    const r = mapToGamut(c);
    expect(r.clamped).toBe(true);
    expect(r.color.c).toBeLessThan(c.c);
    expect(isInGamut(r.color)).toBe(true);
  });

  it('handles problematic green hue (~H=145)', () => {
    const c = { l: 0.7, c: 0.3, h: 145 };
    expect(isInGamut(c)).toBe(false);
    const r = mapToGamut(c);
    expect(r.clamped).toBe(true);
    expect(r.color.c).toBeLessThan(c.c);
    expect(isInGamut(r.color)).toBe(true);
  });

  it('passes through achromatic color (C=0)', () => {
    const c = { l: 0.5, c: 0, h: 0 };
    const r = mapToGamut(c);
    expect(r.clamped).toBe(false);
    expect(r.color.c).toBe(0);
    expect(isInGamut(r.color)).toBe(true);
  });

  it('result color is always displayable', () => {
    const samples = [
      blue,
      yellow,
      { l: 0.7, c: 0.3, h: 195 },
      { l: 0.7, c: 0.3, h: 145 },
      { l: 0.2, c: 0.5, h: 30 },
      { l: 0.99, c: 0.2, h: 120 },
    ];
    for (const s of samples) {
      const r = mapToGamut(s);
      expect(isInGamut(r.color)).toBe(true);
    }
  });
});

describe('clampOklchValues', () => {
  it('normalizes NaN lightness to 0', () => {
    const r = clampOklchValues({ l: NaN, c: 0.1, h: 100 });
    expect(r.l).toBe(0);
  });

  it('clamps negative lightness to 0 and >1 lightness to 1', () => {
    expect(clampOklchValues({ l: -0.5, c: 0.1, h: 0 }).l).toBe(0);
    expect(clampOklchValues({ l: 1.5, c: 0.1, h: 0 }).l).toBe(1);
  });

  it('clamps negative chroma to 0', () => {
    expect(clampOklchValues({ l: 0.5, c: -0.2, h: 100 }).c).toBe(0);
  });

  it('clamps chroma above 0.5 to 0.5', () => {
    expect(clampOklchValues({ l: 0.5, c: 1.0, h: 100 }).c).toBe(0.5);
  });

  it('normalizes non-finite hue to 0', () => {
    expect(clampOklchValues({ l: 0.5, c: 0.1, h: NaN }).h).toBe(0);
    expect(clampOklchValues({ l: 0.5, c: 0.1, h: Infinity }).h).toBe(0);
    expect(clampOklchValues({ l: 0.5, c: 0.1, h: -Infinity }).h).toBe(0);
  });

  it('normalizes hue to [0, 360)', () => {
    expect(clampOklchValues({ l: 0.5, c: 0.1, h: -30 }).h).toBeCloseTo(330, 5);
    expect(clampOklchValues({ l: 0.5, c: 0.1, h: 720 }).h).toBeCloseTo(0, 5);
    expect(clampOklchValues({ l: 0.5, c: 0.1, h: 370 }).h).toBeCloseTo(10, 5);
  });

  it('passes valid values through unchanged', () => {
    const v = { l: 0.45, c: 0.12, h: 200 };
    expect(clampOklchValues(v)).toEqual(v);
  });
});
