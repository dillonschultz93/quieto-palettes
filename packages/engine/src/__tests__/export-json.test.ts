import { describe, it, expect } from 'vitest';
import { exportJSON } from '../export-json.js';
import { generateRamp } from '../generate.js';
import { parseColor } from '../parse.js';
import type { Palette } from '../types.js';

function makePalette(seed: string, steps: number, name: string): Palette {
  const parsed = parseColor(seed);
  if (!parsed.ok) throw new Error(`Failed to parse color: ${seed}`);

  const ramp = generateRamp({
    seed: parsed.value.oklch,
    steps,
    range: { min: 0.05, max: 0.97 },
    distribution: 'linear',
    name,
  });
  if (!ramp.ok) throw new Error(`Failed to generate ramp`);

  return { ramps: [ramp.value] };
}

describe('exportJSON', () => {
  it('returns valid JSON for a palette', () => {
    const palette = makePalette('#2563EB', 10, 'blue');
    const result = exportJSON(palette);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = JSON.parse(result.value);
    expect(parsed).toHaveProperty('ramps');
    expect(parsed).toHaveProperty('contrast');
  });

  it('includes all color formats per step', () => {
    const palette = makePalette('#2563EB', 5, 'blue');
    const result = exportJSON(palette);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = JSON.parse(result.value);
    const step = parsed.ramps[0].steps[0];
    expect(step).toHaveProperty('hex');
    expect(step).toHaveProperty('rgb');
    expect(step).toHaveProperty('hsl');
    expect(step).toHaveProperty('hsb');
    expect(step).toHaveProperty('oklch');
    expect(step.oklch).toHaveProperty('l');
    expect(step.oklch).toHaveProperty('c');
    expect(step.oklch).toHaveProperty('h');
    expect(step).toHaveProperty('isSeed');
    expect(step).toHaveProperty('isGamutClamped');
  });

  it('contains correct number of contrast pairs (n*(n-1)/2)', () => {
    const steps = 10;
    const palette = makePalette('#2563EB', steps, 'blue');
    const result = exportJSON(palette);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = JSON.parse(result.value);
    const expectedPairs = (steps * (steps - 1)) / 2; // 45
    expect(parsed.contrast).toHaveLength(expectedPairs);
  });

  it('contrast pairs have correct structure', () => {
    const palette = makePalette('#2563EB', 3, 'blue');
    const result = exportJSON(palette);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = JSON.parse(result.value);
    const pair = parsed.contrast[0];
    expect(pair).toHaveProperty('pair');
    expect(pair.pair).toHaveLength(2);
    expect(pair.pair[0]).toMatch(/^blue:\d+$/);
    expect(pair).toHaveProperty('ratio');
    expect(pair).toHaveProperty('aa');
    expect(pair).toHaveProperty('aaa');
    expect(pair).toHaveProperty('aaLarge');
    expect(pair).toHaveProperty('aaaLarge');
  });

  it('works with non-10 step counts', () => {
    const palette = makePalette('#2563EB', 5, 'test');
    const result = exportJSON(palette);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = JSON.parse(result.value);
    expect(parsed.ramps[0].steps).toHaveLength(5);
    expect(parsed.contrast).toHaveLength(10); // 5*(5-1)/2
  });

  it('returns error for empty palette', () => {
    const result = exportJSON({ ramps: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('EMPTY_PALETTE');
  });

  it('round-trips through JSON.parse', () => {
    const palette = makePalette('#FF6600', 8, 'orange');
    const result = exportJSON(palette);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = JSON.parse(result.value);
    const reparsed = JSON.parse(JSON.stringify(parsed));
    expect(reparsed).toEqual(parsed);
  });
});
