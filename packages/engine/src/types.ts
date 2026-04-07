export type OklchColor = { l: number; c: number; h: number };

export type SeedConfig = {
  color: string;
  format: 'hex' | 'rgb' | 'hsl' | 'hsb' | 'auto';
};

export type RampConfig = {
  seed: SeedConfig;
  steps: number;
  range: { min: number; max: number };
  distribution: 'linear' | 'eased';
};

export type RampStep = {
  oklch: OklchColor;
  hex: string;
  rgb: string;
  hsl: string;
  hsb: string;
  isSeed: boolean;
  isOverride: boolean;
  isGamutClamped: boolean;
  id: string;
};

export type Ramp = {
  name: string;
  seed: OklchColor;
  steps: RampStep[];
};

export type ContrastResult = {
  ratio: number;
  aa: boolean;
  aaa: boolean;
  aaLarge: boolean;
  aaaLarge: boolean;
};

export type Palette = {
  ramps: Ramp[];
};

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsb';

export type ColorError = {
  code: string;
  message: string;
};

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type ParsedColor = {
  oklch: OklchColor;
  original: string;
  format: ColorFormat;
};
