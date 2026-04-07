# Quieto Colors

An OKLCH-based accessible color palette generator. Input your brand colors, get perceptually even ramps with WCAG contrast validation built in. Export as CSS custom properties or Style Dictionary JSON.

## Monorepo Structure

```
packages/
  engine/   — Pure TypeScript palette engine (OKLCH ramp generation, contrast calculation, export)
  web/      — React + Vite SPA (palette creation UI)
  cli/      — CLI tool for programmatic palette generation
```

## Getting Started

```bash
npm install
npm test            # Run all workspace tests
npm run typecheck   # Type-check all packages
npm run lint        # Lint all packages
```

### Engine Development

```bash
npm test -w packages/engine          # Run engine tests
npm run test:watch -w packages/engine # Watch mode
npm run typecheck -w packages/engine  # Type-check engine
```

## Tech Stack

- **Engine:** TypeScript, [culori](https://culorijs.org/) v4.x for OKLCH color math
- **Web:** React 19.x, Vite 8.x, CSS Modules
- **CLI:** Node.js, stdout-friendly output
- **Testing:** Vitest 4.x
- **Linting:** ESLint v9 (flat config), TypeScript strict mode

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
