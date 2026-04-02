import { describe, it, expect } from 'vitest';
import type { OklchColor, RampConfig, ContrastResult, Palette } from './index.js';

describe('@quieto/engine', () => {
  it('exports core types without errors', () => {
    const color: OklchColor = { l: 0.5, c: 0.2, h: 264 };
    expect(color.l).toBe(0.5);
    expect(color.c).toBe(0.2);
    expect(color.h).toBe(264);
  });

  it('RampConfig type is well-formed', () => {
    const config: RampConfig = {
      seed: { color: '#2563EB', format: 'hex' },
      steps: 10,
      range: { min: 0.05, max: 0.97 },
      distribution: 'linear',
    };
    expect(config.steps).toBe(10);
    expect(config.distribution).toBe('linear');
  });

  it('ContrastResult type is well-formed', () => {
    const result: ContrastResult = {
      ratio: 4.5,
      aa: true,
      aaa: false,
      aaLarge: true,
      aaaLarge: true,
    };
    expect(result.ratio).toBe(4.5);
    expect(result.aa).toBe(true);
  });

  it('Palette type is well-formed', () => {
    const palette: Palette = { ramps: [] };
    expect(palette.ramps).toEqual([]);
  });
});
