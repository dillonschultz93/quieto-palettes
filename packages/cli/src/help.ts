export function getHelpText(): string {
  return `Quieto Colors — OKLCH palette generator

Usage:
  quieto-palettes generate [options]

Options:
  --seed <color>        Seed color (hex, rgb, hsl, hsb) [required]
  --steps <n>           Number of ramp steps (default: 10)
  --format <fmt>        Output format: css, json (default: css)
  --name <name>         Ramp name for CSS variables (default: color)
  --distribution <type> Distribution: linear, eased (default: linear)
  --range-min <n>       Lightness floor 0-1 (default: 0.05)
  --range-max <n>       Lightness ceiling 0-1 (default: 0.97)
  --help, -h            Show this help
  --version, -v         Show version

Examples:
  quieto-palettes generate --seed "#2563EB" --format css
  quieto-palettes generate --seed "rgb(37, 99, 235)" --steps 12 --format json
  quieto-palettes generate --seed "#2563EB" --name blue --distribution eased
`;
}
