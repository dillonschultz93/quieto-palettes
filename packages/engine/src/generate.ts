import type { OklchColor, GenerateRampOptions, Ramp, RampStep, ColorError, Result } from './types.js';
import { oklchToHex, oklchToRgb, oklchToHsl, oklchToHsb } from './convert.js';
import { mapToGamut } from './gamut.js';

function easeOutIn(t: number): number {
  if (t < 0.5) {
    return Math.pow(2 * t, 0.5) / 2;
  }
  return 1 - Math.pow(2 * (1 - t), 0.5) / 2;
}

function linspace(start: number, end: number, count: number): number[] {
  if (count <= 1) return [start];
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    result.push(start + (end - start) * (i / (count - 1)));
  }
  return result;
}

function linspaceEased(start: number, end: number, count: number): number[] {
  if (count <= 1) return [start];
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const eased = easeOutIn(t);
    result.push(start + (end - start) * eased);
  }
  return result;
}

function validate(options: GenerateRampOptions): ColorError | null {
  if (options.steps < 1 || !Number.isInteger(options.steps)) {
    return { code: 'INVALID_STEPS', message: `Steps must be a positive integer, got ${options.steps}` };
  }
  if (options.range.min >= options.range.max || options.range.min < 0 || options.range.max > 1) {
    return { code: 'INVALID_RANGE', message: `Invalid range: min=${options.range.min}, max=${options.range.max}` };
  }
  if (options.seed.l < options.range.min || options.seed.l > options.range.max) {
    return { code: 'SEED_OUT_OF_RANGE', message: `Seed lightness ${options.seed.l} is outside range [${options.range.min}, ${options.range.max}]` };
  }
  return null;
}

function buildPositions(
  seed: OklchColor,
  steps: number,
  range: { min: number; max: number },
  distribution: 'linear' | 'eased',
): number[] {
  if (steps === 1) return [seed.l];

  const { min, max } = range;
  const totalRange = max - min;
  const lowerRange = seed.l - min;

  const stepsBelow = Math.round((lowerRange / totalRange) * (steps - 1));
  const stepsAbove = (steps - 1) - stepsBelow;

  const spaceFn = distribution === 'eased' ? linspaceEased : linspace;

  const lowerPositions = spaceFn(min, seed.l, stepsBelow + 1);
  const upperPositions = spaceFn(seed.l, max, stepsAbove + 1);

  return [...lowerPositions, ...upperPositions.slice(1)];
}

function createStep(l: number, seed: OklchColor, isSeed: boolean): RampStep {
  const oklch: OklchColor = isSeed
    ? { l: seed.l, c: seed.c, h: seed.h }
    : { l, c: seed.c, h: seed.h };

  const gamutResult = mapToGamut(oklch);
  const { color } = gamutResult;

  return {
    oklch: color,
    hex: oklchToHex(color),
    rgb: oklchToRgb(color),
    hsl: oklchToHsl(color),
    hsb: oklchToHsb(color),
    isSeed,
    isOverride: false,
    isGamutClamped: gamutResult.clamped,
    id: crypto.randomUUID(),
  };
}

export function generateRamp(options: GenerateRampOptions): Result<Ramp, ColorError> {
  const error = validate(options);
  if (error) return { ok: false, error };

  const { seed, steps, range, distribution, name } = options;
  const positions = buildPositions(seed, steps, range, distribution);

  const rampSteps = positions.map((l) => {
    const isSeed = Math.abs(l - seed.l) < 1e-10;
    return createStep(l, seed, isSeed);
  });

  return {
    ok: true,
    value: {
      name: name ?? 'color',
      seed,
      steps: rampSteps,
      distribution,
      range,
    },
  };
}
