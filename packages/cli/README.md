# @quieto/palettes

CLI tool for generating OKLCH-based color palettes. Outputs CSS custom properties or JSON with full color format data and WCAG contrast information.

## Installation

```bash
npm install -g @quieto/palettes
```

## Usage

```bash
# Generate CSS custom properties from a seed color
quieto-palettes generate --seed "#2563EB" --format css

# Generate JSON with all color formats and contrast data
quieto-palettes generate --seed "#2563EB" --format json

# Custom ramp name, step count, and distribution
quieto-palettes generate --seed "#2563EB" --name blue --steps 12 --format json --distribution eased
```

## Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--seed <color>` | | required | Seed color (hex, rgb, hsl, or hsb) |
| `--format <fmt>` | | `css` | Output format: `css` or `json` |
| `--name <name>` | | `color` | Ramp name used in CSS variable names |
| `--steps <n>` | | `10` | Number of ramp steps (1-100) |
| `--distribution <type>` | | `linear` | Lightness distribution: `linear` or `eased` |
| `--range-min <n>` | | `0.05` | Lightness floor (0-1) |
| `--range-max <n>` | | `0.97` | Lightness ceiling (0-1) |
| `--help` | `-h` | | Show help |
| `--version` | `-v` | | Show version |

## Examples

### CSS Output

```bash
quieto-palettes generate --seed "#2563EB" --name blue --format css
```

```css
:root {
  --color-blue-50: #e0edff;
  /* ... */
  --color-blue-900: #0a1a3a;
}
```

### JSON Output

```bash
quieto-palettes generate --seed "#2563EB" --name blue --format json
```

```json
{
  "ramps": [{ "name": "blue", "steps": [...] }],
  "contrast": [{ "pair": [...], "ratio": 4.72, "aa": true, "aaa": false }]
}
```

## License

MIT
