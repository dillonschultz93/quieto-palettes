# @quieto/engine

Pure TypeScript color engine for OKLCH-based palette generation. Handles color parsing, perceptually even ramp generation, gamut mapping, WCAG contrast calculation, and export to CSS custom properties or JSON.

## Installation

```bash
npm install @quieto/engine
```

## API

### `parseColor(input: string)`

Parses Hex, RGB, HSL, or HSB color strings into OKLCH.

```ts
import { parseColor } from '@quieto/engine';

const result = parseColor('#2563EB');
// { ok: true, value: { l: 0.5418, c: 0.2059, h: 264.05 } }
```

### `generateRamp(options)`

Generates an OKLCH lightness ramp from a seed color. Supports `linear` and `eased` distribution modes. The seed color is always anchored as an exact step.

```ts
import { generateRamp, parseColor } from '@quieto/engine';

const seed = parseColor('#2563EB').value;
const ramp = generateRamp({ seed, steps: 10 });
// ramp.steps -> 10 RampStep objects with hex, rgb, hsl, hsb, oklch values
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `seed` | `OklchColor` | required | Seed color in OKLCH |
| `steps` | `number` | `10` | Number of ramp steps (1-100) |
| `name` | `string` | `'color'` | Ramp name |
| `distribution` | `'linear' \| 'eased'` | `'linear'` | Lightness distribution mode |
| `rangeMin` | `number` | `0.05` | Lightness floor (0-1) |
| `rangeMax` | `number` | `0.97` | Lightness ceiling (0-1) |

### `calculateContrast(color1, color2)`

Computes WCAG 2.x contrast ratio between two OKLCH colors.

```ts
import { calculateContrast } from '@quieto/engine';

const result = calculateContrast(colorA, colorB);
// { ratio: 4.72, aa: true, aaa: false, aaLarge: true, aaaLarge: true }
```

### `isInGamut(color)` / `mapToGamut(color)`

Checks whether an OKLCH color fits within sRGB, and perceptually maps out-of-gamut colors back in using chroma reduction.

### `exportCSS(palette, options)`

Generates CSS custom properties with Tailwind-style numeric naming (50-900, light to dark).

```ts
import { exportCSS } from '@quieto/engine';

const css = exportCSS({ ramps: [ramp] }, { naming: 'numeric' });
// :root {
//   --color-blue-50: #e0edff;
//   ...
//   --color-blue-900: #0a1a3a;
// }
```

### `exportJSON(palette)`

Generates a JSON representation of the palette with all color formats per step and WCAG contrast data for all within-ramp pairs.

```ts
import { exportJSON } from '@quieto/engine';

const json = exportJSON({ ramps: [ramp] });
// { ramps: [{ name, steps: [...] }], contrast: [{ pair, ratio, aa, aaa, ... }] }
```

### `serializeState(palette)` / `deserializeState(encoded)`

Compresses palette configuration to a URL-safe base64url string for shareable links. Handles UTF-8, CJK, and emoji in ramp names.

### Color Conversion Utilities

- `oklchToHex(color)` - OKLCH to hex string
- `oklchToRgb(color)` - OKLCH to RGB object
- `oklchToHsl(color)` - OKLCH to HSL object
- `oklchToHsb(color)` - OKLCH to HSB object
- `clampOklchValues(color)` - Clamp OKLCH values to valid ranges

## License

MIT
