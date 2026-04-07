#!/usr/bin/env node

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseColor, generateRamp } from '@quieto/engine';
import type { Palette } from '@quieto/engine';
import { parseCliArgs } from './args.js';
import { formatCSS, formatJSON } from './output.js';
import { getHelpText } from './help.js';

export function getVersion(): string {
  const require = createRequire(import.meta.url);
  const pkg = require('../package.json') as { version: string };
  return pkg.version;
}

export function run(argv: string[]): { code: number; stdout: string; stderr: string } {
  const parsed = parseCliArgs(argv);

  if (parsed.kind === 'help') {
    return { code: 0, stdout: getHelpText(), stderr: '' };
  }

  if (parsed.kind === 'version') {
    return { code: 0, stdout: getVersion() + '\n', stderr: '' };
  }

  if (parsed.kind === 'error') {
    if (parsed.error.code === 'MISSING_SUBCOMMAND') {
      return { code: 1, stdout: '', stderr: getHelpText() };
    }
    return { code: 1, stdout: '', stderr: parsed.error.message + '\n' };
  }

  const opts = parsed.value;

  const colorResult = parseColor(opts.seed);
  if (!colorResult.ok) {
    return { code: 1, stdout: '', stderr: colorResult.error.message + '\n' };
  }

  const rampResult = generateRamp({
    seed: colorResult.value.oklch,
    steps: opts.steps,
    range: { min: opts.rangeMin, max: opts.rangeMax },
    distribution: opts.distribution,
    name: opts.name,
  });
  if (!rampResult.ok) {
    return { code: 1, stdout: '', stderr: rampResult.error.message + '\n' };
  }

  const palette: Palette = { ramps: [rampResult.value] };

  if (opts.format === 'json') {
    const jsonResult = formatJSON(palette);
    if (!jsonResult.ok) {
      return { code: 1, stdout: '', stderr: jsonResult.error.message + '\n' };
    }
    return { code: 0, stdout: jsonResult.value + '\n', stderr: '' };
  }

  const cssResult = formatCSS(palette, { naming: 'numeric' });
  if (!cssResult.ok) {
    return { code: 1, stdout: '', stderr: cssResult.error.message + '\n' };
  }

  return { code: 0, stdout: cssResult.value, stderr: '' };
}

// Only execute when run directly (not when imported in tests)
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  const result = run(process.argv);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.code);
}
