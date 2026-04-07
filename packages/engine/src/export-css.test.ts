import { describe, it, expect } from 'vitest';
import { exportCSS } from './export-css.js';
import { parseColor } from './parse.js';
import { generateRamp } from './generate.js';
import type { Palette, Ramp, ColorError, Result } from './types.js';

function buildBlueRamp(): Ramp {
  const parsed = parseColor('#2563EB');
  if (!parsed.ok) throw new Error('Failed to parse seed');
  const result = generateRamp({
    seed: parsed.value.oklch,
    steps: 10,
    range: { min: 0.05, max: 0.97 },
    distribution: 'linear',
    name: 'blue',
  });
  if (!result.ok) throw new Error('Failed to generate ramp');
  return result.value;
}

function expectOk(result: Result<string, ColorError>): string {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected ok result');
  return result.value;
}

function expectErr(result: Result<string, ColorError>): ColorError {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected error result');
  return result.error;
}

describe('exportCSS', () => {
  describe('10-step numeric naming (AC #1)', () => {
    it('contains all 10 property names --color-blue-50 through --color-blue-900', () => {
      const palette: Palette = { ramps: [buildBlueRamp()] };
      const css = expectOk(exportCSS(palette, { naming: 'numeric' }));
      const suffixes = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
      for (const s of suffixes) {
        expect(css).toContain(`--color-blue-${s}:`);
      }
    });

    it('each declaration line matches expected pattern', () => {
      const palette: Palette = { ramps: [buildBlueRamp()] };
      const css = expectOk(exportCSS(palette, { naming: 'numeric' }));
      const lines = css.split('\n').filter((l) => l.includes('--color-blue-'));
      expect(lines).toHaveLength(10);
      for (const line of lines) {
        expect(line).toMatch(/^\s+--color-blue-(50|100|200|300|400|500|600|700|800|900): #[0-9a-f]{6};$/);
      }
    });

    it('lightest step maps to -50 and darkest to -900 (Tailwind convention)', () => {
      const ramp = buildBlueRamp();
      const palette: Palette = { ramps: [ramp] };
      const css = expectOk(exportCSS(palette, { naming: 'numeric' }));
      const lines = css.split('\n').filter((l) => l.includes('--color-blue-'));
      // ramp.steps[0] is darkest (lowest L), ramp.steps[9] is lightest (highest L)
      // After reversal: -50 should contain the lightest hex (steps[9]), -900 the darkest (steps[0])
      expect(lines[0]).toContain('--color-blue-50:');
      expect(lines[0]).toContain(ramp.steps[9]!.hex.toLowerCase());
      expect(lines[9]).toContain('--color-blue-900:');
      expect(lines[9]).toContain(ramp.steps[0]!.hex.toLowerCase());
      // Verify lightness order: extract hex from -50 and -900, confirm -50 is lighter
      const lightestL = ramp.steps[9]!.oklch.l;
      const darkestL = ramp.steps[0]!.oklch.l;
      expect(lightestL).toBeGreaterThan(darkestL);
    });

    it('wraps declarations in :root block', () => {
      const palette: Palette = { ramps: [buildBlueRamp()] };
      const css = expectOk(exportCSS(palette, { naming: 'numeric' }));
      expect(css).toMatch(/^:root \{/);
      expect(css).toMatch(/\}\n$/);
    });

    it('hex values are lowercase', () => {
      const palette: Palette = { ramps: [buildBlueRamp()] };
      const css = expectOk(exportCSS(palette, { naming: 'numeric' }));
      const hexMatches = css.match(/#[0-9a-f]{6}/g) ?? [];
      expect(hexMatches.length).toBe(10);
      for (const hex of hexMatches) {
        expect(hex).toBe(hex.toLowerCase());
      }
    });
  });

  describe('stability (AC #2)', () => {
    it('same palette input produces byte-identical CSS', () => {
      const palette: Palette = { ramps: [buildBlueRamp()] };
      const css1 = expectOk(exportCSS(palette, { naming: 'numeric' }));
      const css2 = expectOk(exportCSS(palette, { naming: 'numeric' }));
      expect(css1).toBe(css2);
    });

    it('RampStep.id does not appear in CSS', () => {
      const ramp = buildBlueRamp();
      const palette: Palette = { ramps: [ramp] };
      const css = expectOk(exportCSS(palette, { naming: 'numeric' }));
      for (const step of ramp.steps) {
        expect(css).not.toContain(step.id);
      }
    });
  });

  describe('ramp name sanitization (AC #1)', () => {
    it('sanitizes "Brand Blue" to "brand-blue"', () => {
      const ramp = buildBlueRamp();
      ramp.name = 'Brand Blue';
      const palette: Palette = { ramps: [ramp] };
      const css = expectOk(exportCSS(palette, { naming: 'numeric' }));
      expect(css).toContain('--color-brand-blue-');
      expect(css).not.toContain('--color-Brand Blue-');
    });

    it('sanitizes names with special characters', () => {
      const ramp = buildBlueRamp();
      ramp.name = '  My--Cool___Color! ';
      const palette: Palette = { ramps: [ramp] };
      const css = expectOk(exportCSS(palette, { naming: 'numeric' }));
      expect(css).toContain('--color-my-cool-color-');
    });
  });

  describe('multiple ramps', () => {
    it('exports all ramps in a single :root block', () => {
      const blue = buildBlueRamp();
      const red = buildBlueRamp();
      red.name = 'red';
      const palette: Palette = { ramps: [blue, red] };
      const css = expectOk(exportCSS(palette, { naming: 'numeric' }));
      expect(css).toContain('--color-blue-50:');
      expect(css).toContain('--color-red-50:');
      // Only one :root block
      const rootCount = (css.match(/:root/g) ?? []).length;
      expect(rootCount).toBe(1);
    });
  });

  describe('empty palette', () => {
    it('returns error for zero-ramp palette', () => {
      const palette: Palette = { ramps: [] };
      const err = expectErr(exportCSS(palette, { naming: 'numeric' }));
      expect(err.code).toBe('EMPTY_PALETTE');
    });
  });

  describe('empty sanitized ramp name', () => {
    it('returns error when name sanitizes to empty string', () => {
      const ramp = buildBlueRamp();
      ramp.name = '!!!';
      const palette: Palette = { ramps: [ramp] };
      const err = expectErr(exportCSS(palette, { naming: 'numeric' }));
      expect(err.code).toBe('INVALID_RAMP_NAME');
    });
  });

  describe('non-10-step ramp with numeric naming', () => {
    it('returns error for 5-step ramp', () => {
      const parsed = parseColor('#2563EB');
      if (!parsed.ok) throw new Error('Failed to parse seed');
      const result = generateRamp({
        seed: parsed.value.oklch,
        steps: 5,
        range: { min: 0.05, max: 0.97 },
        distribution: 'linear',
        name: 'blue',
      });
      if (!result.ok) throw new Error('Failed to generate ramp');
      const palette: Palette = { ramps: [result.value] };
      const err = expectErr(exportCSS(palette, { naming: 'numeric' }));
      expect(err.code).toBe('INVALID_STEP_COUNT');
    });
  });

  describe('CSS syntax validation (quality gate)', () => {
    it('output has balanced braces', () => {
      const palette: Palette = { ramps: [buildBlueRamp()] };
      const css = expectOk(exportCSS(palette, { naming: 'numeric' }));
      const opens = (css.match(/\{/g) ?? []).length;
      const closes = (css.match(/\}/g) ?? []).length;
      expect(opens).toBe(closes);
    });

    it('every declaration ends with semicolon', () => {
      const palette: Palette = { ramps: [buildBlueRamp()] };
      const css = expectOk(exportCSS(palette, { naming: 'numeric' }));
      const declarations = css.split('\n').filter((l) => l.includes('--color-'));
      for (const decl of declarations) {
        expect(decl.trimEnd()).toMatch(/;$/);
      }
    });

    it('all property names are valid CSS custom property identifiers', () => {
      const palette: Palette = { ramps: [buildBlueRamp()] };
      const css = expectOk(exportCSS(palette, { naming: 'numeric' }));
      const props = css.match(/--[a-z0-9-]+/g) ?? [];
      expect(props.length).toBe(10);
      for (const prop of props) {
        expect(prop).toMatch(/^--[a-z][a-z0-9-]*$/);
      }
    });
  });
});
