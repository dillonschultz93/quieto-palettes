import { describe, it, expect } from 'vitest';
import { oklchToHex, oklchToRgb, oklchToHsl, oklchToHsb } from '../convert.js';
import type { OklchColor } from '../types.js';

const blueish: OklchColor = { l: 0.546, c: 0.215, h: 264 };
const achromatic: OklchColor = { l: 0.5, c: 0, h: 0 };
const nearBlack: OklchColor = { l: 0.01, c: 0, h: 0 };
const nearWhite: OklchColor = { l: 0.99, c: 0, h: 0 };

describe('oklchToHex', () => {
  it('returns valid #rrggbb string for known input', () => {
    const hex = oklchToHex(blueish);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('converts achromatic color', () => {
    const hex = oklchToHex(achromatic);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('converts near-black', () => {
    const hex = oklchToHex(nearBlack);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('converts near-white', () => {
    const hex = oklchToHex(nearWhite);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('oklchToRgb', () => {
  it('returns valid rgb() string', () => {
    const rgb = oklchToRgb(blueish);
    expect(rgb).toMatch(/^rgb\(/);
  });

  it('converts achromatic color', () => {
    const rgb = oklchToRgb(achromatic);
    expect(rgb).toMatch(/^rgb\(/);
  });
});

describe('oklchToHsl', () => {
  it('returns valid hsl() string', () => {
    const hsl = oklchToHsl(blueish);
    expect(hsl).toMatch(/^hsl\(/);
  });

  it('converts achromatic color gracefully', () => {
    const hsl = oklchToHsl(achromatic);
    expect(hsl).toMatch(/^hsl\(/);
  });
});

describe('oklchToHsb', () => {
  it('returns valid hsb() string', () => {
    const hsb = oklchToHsb(blueish);
    expect(hsb).toMatch(/^hsb\(\d+, \d+%, \d+%\)$/);
  });

  it('converts achromatic color gracefully', () => {
    const hsb = oklchToHsb(achromatic);
    expect(hsb).toMatch(/^hsb\(\d+, \d+%, \d+%\)$/);
  });

  it('converts near-black', () => {
    const hsb = oklchToHsb(nearBlack);
    expect(hsb).toMatch(/^hsb\(\d+, \d+%, \d+%\)$/);
  });

  it('converts near-white', () => {
    const hsb = oklchToHsb(nearWhite);
    expect(hsb).toMatch(/^hsb\(\d+, \d+%, \d+%\)$/);
  });
});
