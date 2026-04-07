# Quieto Colors

An OKLCH-based accessible color palette generator. Input your brand colors, get perceptually even ramps with WCAG contrast validation built in. Export as CSS custom properties or Style Dictionary JSON.

## Status

**Epic 1 (Engine Foundation)** and **Epic 2 (CLI)** are complete — the color engine covers parsing, ramp generation, gamut mapping, contrast calculation, CSS/JSON export, and URL serialization. The CLI supports palette generation with CSS and JSON output formats.

## Monorepo Structure

```
packages/
  engine/   — Pure TypeScript palette engine (OKLCH ramp generation, contrast calculation, export)
  web/      — React + Vite SPA (palette creation UI) — scaffolded
  cli/      — CLI tool for programmatic palette generation
```

## Getting Started

```bash
npm install
npm test            # Run all workspace tests
npm run typecheck   # Type-check all packages
npm run lint        # Lint all packages
```

### CLI Usage

```bash
# Build first
npm run build -w packages/engine && npm run build -w packages/cli

# Generate CSS custom properties
node packages/cli/dist/index.js generate --seed "#2563EB" --format css

# Generate JSON with all color formats and contrast data
node packages/cli/dist/index.js generate --seed "#2563EB" --format json

# Custom ramp name, step count, and distribution
node packages/cli/dist/index.js generate --seed "#2563EB" --name blue --steps 12 --format json --distribution eased

# View all options
node packages/cli/dist/index.js --help
```

### Engine Development

```bash
npm test -w packages/engine          # Run engine tests
npm run test:watch -w packages/engine # Watch mode
npm run typecheck -w packages/engine  # Type-check engine
npm run build -w packages/engine      # Build engine
```

## Engine API

The `@quieto/engine` package exposes the following:

### `parseColor(input: string)`

Detects and converts Hex, RGB, HSL, or HSB color strings to OKLCH. Returns a `Result<OklchColor, Error>`.

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
// ramp.steps → 10 RampStep objects with hex, rgb, hsl, hsb, oklch values
```

### `calculateContrast(color1, color2)`

Computes WCAG 2.x contrast ratio between two OKLCH colors. Returns AA, AAA, and large-text thresholds.

```ts
import { calculateContrast } from '@quieto/engine';

const result = calculateContrast(colorA, colorB);
// { ratio: 4.72, aa: true, aaa: false, aaLarge: true, aaaLarge: true }
```

### `isInGamut(color)` / `mapToGamut(color)`

Checks whether an OKLCH color fits within sRGB, and perceptually maps out-of-gamut colors back in using chroma reduction.

### `exportCSS(palette, options)`

Generates CSS custom properties with Tailwind-style numeric naming (50–900, light to dark).

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

Generates a JSON representation of the palette with all color formats (hex, rgb, hsl, hsb, oklch) per step and WCAG contrast data for all within-ramp pairs.

```ts
import { exportJSON } from '@quieto/engine';

const json = exportJSON({ ramps: [ramp] });
// { ramps: [{ name, steps: [...] }], contrast: [{ pair, ratio, aa, aaa, ... }] }
```

### `serializeState(palette)` / `deserializeState(encoded)`

Compresses palette configuration to a URL-safe base64url string for shareable links. Handles UTF-8, CJK, and emoji in ramp names.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Engine** | TypeScript 5.8, [culori](https://culorijs.org/) v4.x for OKLCH color math |
| **Web** | React 19.x, Vite 8.x, CSS Modules |
| **CLI** | Node.js, stdout-friendly output |
| **Testing** | Vitest 4.x |
| **Linting** | ESLint v10 (flat config), TypeScript strict mode |

## Roadmap

| Epic | Scope | Status |
|------|-------|--------|
| 1. Engine Foundation | Parsing, ramps, gamut, contrast, CSS export, serialization | Done |
| 2. CLI | Basic generation, format options | In Review |
| 3. Web App MVP | Seed input, ramp viz, contrast highlights, export, URL state | Backlog |
| 4. Multi-Ramp | Multiple seed colors in one palette | Backlog |
| 5. Theming | Light/dark theme generation | Backlog |
| 6. Editing Depth | Curve editor, step overrides | Backlog |
| 7. Figma Plugin | Design tool integration | Backlog |

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
