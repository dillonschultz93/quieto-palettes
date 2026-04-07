import { describe, it, expect } from 'vitest';
import { parseColor } from './parse.js';
import { converter } from 'culori';
import type { Result, ParsedColor, ColorError } from './types.js';

const toOklch = converter('oklch');

function expectOk(result: Result<ParsedColor, ColorError>): ParsedColor {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected ok result');
  return result.value;
}

function expectErr(result: Result<ParsedColor, ColorError>): ColorError {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected error result');
  return result.error;
}

describe('parseColor', () => {
  describe('hex format', () => {
    it('parses 6-digit hex', () => {
      const parsed = expectOk(parseColor('#2563EB'));
      expect(parsed.format).toBe('hex');
      expect(parsed.original).toBe('#2563EB');
      expect(parsed.oklch.l).toBeCloseTo(0.546, 2);
      expect(parsed.oklch.c).toBeCloseTo(0.215, 2);
      expect(parsed.oklch.h).toBeCloseTo(263, 0);
    });

    it('parses lowercase hex', () => {
      const parsed = expectOk(parseColor('#2563eb'));
      expect(parsed.format).toBe('hex');
      expect(parsed.oklch.l).toBeCloseTo(0.546, 2);
    });

    it('parses 3-digit hex', () => {
      const parsed = expectOk(parseColor('#f00'));
      expect(parsed.format).toBe('hex');
      const ref = toOklch('#ff0000')!;
      expect(parsed.oklch.l).toBeCloseTo(ref.l, 4);
      expect(parsed.oklch.c).toBeCloseTo(ref.c, 4);
    });

    it('parses 8-digit hex with alpha', () => {
      const parsed = expectOk(parseColor('#2563EBFF'));
      expect(parsed.format).toBe('hex');
      expect(parsed.oklch.l).toBeCloseTo(0.546, 2);
    });
  });

  describe('rgb format', () => {
    it('parses comma-separated rgb', () => {
      const parsed = expectOk(parseColor('rgb(37, 99, 235)'));
      expect(parsed.format).toBe('rgb');
      expect(parsed.oklch.l).toBeCloseTo(0.546, 2);
      expect(parsed.oklch.c).toBeCloseTo(0.215, 2);
      expect(parsed.oklch.h).toBeCloseTo(263, 0);
    });

    it('parses space-separated rgb (CSS4)', () => {
      const parsed = expectOk(parseColor('rgb(37 99 235)'));
      expect(parsed.format).toBe('rgb');
      expect(parsed.oklch.l).toBeCloseTo(0.546, 2);
    });
  });

  describe('hsl format', () => {
    it('parses comma-separated hsl', () => {
      const parsed = expectOk(parseColor('hsl(217, 91%, 53%)'));
      expect(parsed.format).toBe('hsl');
      const ref = toOklch('hsl(217, 91%, 53%)')!;
      expect(parsed.oklch.l).toBeCloseTo(ref.l, 4);
      expect(parsed.oklch.c).toBeCloseTo(ref.c, 4);
      expect(parsed.oklch.h).toBeCloseTo(ref.h ?? 0, 2);
    });

    it('parses space-separated hsl (CSS4)', () => {
      const parsed = expectOk(parseColor('hsl(217 91% 53%)'));
      expect(parsed.format).toBe('hsl');
      const ref = toOklch('hsl(217 91% 53%)')!;
      expect(parsed.oklch.l).toBeCloseTo(ref.l, 4);
    });
  });

  describe('rgba/hsla format', () => {
    it('accepts rgba() as rgb format', () => {
      const parsed = expectOk(parseColor('rgba(37, 99, 235, 1)'));
      expect(parsed.format).toBe('rgb');
      expect(parsed.oklch.l).toBeCloseTo(0.546, 2);
      expect(parsed.oklch.c).toBeCloseTo(0.215, 2);
    });

    it('accepts hsla() as hsl format', () => {
      const parsed = expectOk(parseColor('hsla(217, 91%, 53%, 1)'));
      expect(parsed.format).toBe('hsl');
      const ref = toOklch('hsl(217, 91%, 53%)')!;
      expect(parsed.oklch.l).toBeCloseTo(ref.l, 4);
    });
  });

  describe('hsb format', () => {
    it('parses hsb with comma separation', () => {
      const parsed = expectOk(parseColor('hsb(217, 84%, 92%)'));
      expect(parsed.format).toBe('hsb');
      const ref = toOklch({ mode: 'hsv', h: 217, s: 0.84, v: 0.92 })!;
      expect(parsed.oklch.l).toBeCloseTo(ref.l, 4);
      expect(parsed.oklch.c).toBeCloseTo(ref.c, 4);
      expect(parsed.oklch.h).toBeCloseTo(ref.h ?? 0, 2);
    });

    it('parses hsb with space separation', () => {
      const parsed = expectOk(parseColor('hsb(217 84% 92%)'));
      expect(parsed.format).toBe('hsb');
      const ref = toOklch({ mode: 'hsv', h: 217, s: 0.84, v: 0.92 })!;
      expect(parsed.oklch.l).toBeCloseTo(ref.l, 4);
    });

    it('is case-insensitive', () => {
      const parsed = expectOk(parseColor('HSB(217, 84%, 92%)'));
      expect(parsed.format).toBe('hsb');
    });

    it('handles achromatic HSB (pure black)', () => {
      const parsed = expectOk(parseColor('hsb(0, 0%, 0%)'));
      expect(parsed.format).toBe('hsb');
      expect(parsed.oklch.l).toBeCloseTo(0, 2);
      expect(parsed.oklch.h).toBe(0);
    });
  });

  describe('hex/rgb equivalence', () => {
    it('hex and rgb of same color produce equivalent OKLCH', () => {
      const hex = expectOk(parseColor('#2563EB'));
      const rgb = expectOk(parseColor('rgb(37, 99, 235)'));
      expect(hex.oklch.l).toBeCloseTo(rgb.oklch.l, 4);
      expect(hex.oklch.c).toBeCloseTo(rgb.oklch.c, 4);
      expect(hex.oklch.h).toBeCloseTo(rgb.oklch.h, 2);
    });
  });

  describe('error cases', () => {
    it('returns error for nonsense string', () => {
      const err = expectErr(parseColor('not-a-color'));
      expect(err.code).toBe('INVALID_COLOR');
    });

    it('returns error for empty string', () => {
      const err = expectErr(parseColor(''));
      expect(err.code).toBe('INVALID_COLOR');
    });

    it('returns error for whitespace-only string', () => {
      const err = expectErr(parseColor('   '));
      expect(err.code).toBe('INVALID_COLOR');
    });

    it('returns error for malformed rgb', () => {
      const result = parseColor('rgb()');
      expect(result.ok).toBe(false);
    });

    it('never throws an exception on invalid input', () => {
      const badInputs = ['not-a-color', '', 'rgb()', 'hsl()', 'hsb()', '###', 'undefined', 'null'];
      for (const input of badInputs) {
        expect(() => parseColor(input)).not.toThrow();
        expect(parseColor(input).ok).toBe(false);
      }
    });
  });

  describe('achromatic colors', () => {
    it('handles pure black', () => {
      const parsed = expectOk(parseColor('#000000'));
      expect(parsed.oklch.l).toBeCloseTo(0, 2);
      expect(Number.isNaN(parsed.oklch.h)).toBe(false);
      expect(parsed.oklch.h).toBe(0);
    });

    it('handles pure white', () => {
      const parsed = expectOk(parseColor('#FFFFFF'));
      expect(parsed.oklch.l).toBeCloseTo(1, 2);
      expect(Number.isNaN(parsed.oklch.h)).toBe(false);
      expect(parsed.oklch.h).toBe(0);
    });

    it('handles mid gray', () => {
      const parsed = expectOk(parseColor('#808080'));
      expect(parsed.oklch.l).toBeGreaterThan(0);
      expect(parsed.oklch.l).toBeLessThan(1);
      expect(Number.isNaN(parsed.oklch.h)).toBe(false);
      expect(parsed.oklch.h).toBe(0);
    });
  });

  describe('format detection', () => {
    it('detects hex format', () => {
      expect(expectOk(parseColor('#FF0000')).format).toBe('hex');
    });

    it('detects rgb format', () => {
      expect(expectOk(parseColor('rgb(255, 0, 0)')).format).toBe('rgb');
    });

    it('detects hsl format', () => {
      expect(expectOk(parseColor('hsl(0, 100%, 50%)')).format).toBe('hsl');
    });

    it('detects hsb format', () => {
      expect(expectOk(parseColor('hsb(0, 100%, 100%)')).format).toBe('hsb');
    });
  });

  describe('preserves original input', () => {
    it('keeps original string including whitespace', () => {
      const input = '  #2563EB  ';
      const parsed = expectOk(parseColor(input));
      expect(parsed.original).toBe(input);
    });
  });

  describe('rejects unsupported formats', () => {
    it('rejects named colors', () => {
      const result = parseColor('red');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('UNSUPPORTED_FORMAT');
    });

    it('rejects oklch() input', () => {
      const result = parseColor('oklch(0.5 0.2 264)');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('UNSUPPORTED_FORMAT');
    });
  });
});
