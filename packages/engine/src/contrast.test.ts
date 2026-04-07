import { describe, it, expect } from 'vitest';
import { parseColor } from './parse.js';
import { calculateContrast } from './contrast.js';
import type { OklchColor, Result, ParsedColor, ColorError } from './types.js';

function expectOk(result: Result<ParsedColor, ColorError>): ParsedColor {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected ok result');
  return result.value;
}

function parse(hex: string): OklchColor {
  return expectOk(parseColor(hex)).oklch;
}

describe('calculateContrast', () => {
  describe('reference pair: #FFFFFF vs #2563EB (AC #1)', () => {
    it('returns correct ratio to 2 decimal places', () => {
      const white = parse('#FFFFFF');
      const blue = parse('#2563EB');
      const result = calculateContrast(white, blue);
      expect(result.ratio).toBeCloseTo(5.17, 2);
    });

    it('sets correct WCAG flags for ~5.17 ratio', () => {
      const white = parse('#FFFFFF');
      const blue = parse('#2563EB');
      const result = calculateContrast(white, blue);
      expect(result.aa).toBe(true);       // 5.17 >= 4.5
      expect(result.aaa).toBe(false);      // 5.17 < 7.0
      expect(result.aaLarge).toBe(true);   // 5.17 >= 3.0
      expect(result.aaaLarge).toBe(true);  // 5.17 >= 4.5
    });
  });

  describe('symmetric (AC #1)', () => {
    it('produces same ratio regardless of argument order', () => {
      const white = parse('#FFFFFF');
      const blue = parse('#2563EB');
      const ab = calculateContrast(white, blue);
      const ba = calculateContrast(blue, white);
      expect(ab.ratio).toBe(ba.ratio);
      expect(ab.aa).toBe(ba.aa);
      expect(ab.aaa).toBe(ba.aaa);
      expect(ab.aaLarge).toBe(ba.aaLarge);
      expect(ab.aaaLarge).toBe(ba.aaaLarge);
    });
  });

  describe('identical colors (AC #2)', () => {
    it('returns ratio 1.0 for same OklchColor', () => {
      const blue = parse('#2563EB');
      const result = calculateContrast(blue, blue);
      expect(result.ratio).toBe(1);
    });

    it('fails AA and AAA at ratio 1.0', () => {
      const blue = parse('#2563EB');
      const result = calculateContrast(blue, blue);
      expect(result.aa).toBe(false);
      expect(result.aaa).toBe(false);
      expect(result.aaLarge).toBe(false);
      expect(result.aaaLarge).toBe(false);
    });
  });

  describe('threshold spot checks', () => {
    it('~3.0 boundary: #949494 vs #FFFFFF toggles aaLarge', () => {
      const white = parse('#FFFFFF');
      const grey = parse('#949494');
      const result = calculateContrast(white, grey);
      // Reference: 3.03 — just above 3.0
      expect(result.ratio).toBeCloseTo(3.03, 1);
      expect(result.aaLarge).toBe(true);   // >= 3.0
      expect(result.aaaLarge).toBe(false);  // < 4.5
      expect(result.aa).toBe(false);        // < 4.5
      expect(result.aaa).toBe(false);       // < 7.0
    });

    it('~4.5 boundary: #767676 vs #FFFFFF toggles aa/aaaLarge', () => {
      const white = parse('#FFFFFF');
      const grey = parse('#767676');
      const result = calculateContrast(white, grey);
      // Reference: 4.54 — just above 4.5
      expect(result.ratio).toBeCloseTo(4.54, 1);
      expect(result.aaLarge).toBe(true);   // >= 3.0
      expect(result.aaaLarge).toBe(true);  // >= 4.5
      expect(result.aa).toBe(true);        // >= 4.5
      expect(result.aaa).toBe(false);      // < 7.0
    });

    it('~7.0 boundary: #595959 vs #FFFFFF toggles aaa', () => {
      const white = parse('#FFFFFF');
      const grey = parse('#595959');
      const result = calculateContrast(white, grey);
      // Reference: 7.00
      expect(result.ratio).toBeCloseTo(7.00, 1);
      expect(result.aaLarge).toBe(true);   // >= 3.0
      expect(result.aaaLarge).toBe(true);  // >= 4.5
      expect(result.aa).toBe(true);        // >= 4.5
      expect(result.aaa).toBe(true);       // >= 7.0
    });
  });

  describe('black vs white', () => {
    it('returns ratio 21 with all flags true', () => {
      const white = parse('#FFFFFF');
      const black = parse('#000000');
      const result = calculateContrast(white, black);
      expect(result.ratio).toBeCloseTo(21, 0);
      expect(result.aa).toBe(true);
      expect(result.aaa).toBe(true);
      expect(result.aaLarge).toBe(true);
      expect(result.aaaLarge).toBe(true);
    });
  });
});
