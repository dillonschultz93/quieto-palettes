import { parseArgs as nodeParseArgs } from 'node:util';
import type { ColorError } from '@quieto/engine';

export type CliOptions = {
  seed: string;
  steps: number;
  format: 'css' | 'json';
  name: string;
  rangeMin: number;
  rangeMax: number;
  distribution: 'linear' | 'eased';
};

export type ParseResult =
  | { kind: 'options'; value: CliOptions }
  | { kind: 'help' }
  | { kind: 'version' }
  | { kind: 'error'; error: ColorError };

const SUPPORTED_FORMATS = ['css', 'json'] as const;
const SUPPORTED_DISTRIBUTIONS = ['linear', 'eased'] as const;

export function parseCliArgs(argv: string[]): ParseResult {
  const args = argv.slice(2);

  let parsed: ReturnType<typeof nodeParseArgs>;
  try {
    parsed = nodeParseArgs({
      args,
      options: {
        seed: { type: 'string' },
        steps: { type: 'string', default: '10' },
        format: { type: 'string', default: 'css' },
        name: { type: 'string', default: 'color' },
        'range-min': { type: 'string', default: '0.05' },
        'range-max': { type: 'string', default: '0.97' },
        distribution: { type: 'string', default: 'linear' },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch {
    return {
      kind: 'error',
      error: { code: 'INVALID_ARGS', message: 'Unknown or malformed arguments. Run with --help for usage.' },
    };
  }

  const { values, positionals } = parsed;

  if (values.help) {
    return { kind: 'help' };
  }

  if (values.version) {
    return { kind: 'version' };
  }

  if (positionals[0] !== 'generate') {
    return {
      kind: 'error',
      error: { code: 'MISSING_SUBCOMMAND', message: 'Expected subcommand "generate". Usage: quieto-palettes generate --seed <color>' },
    };
  }

  const seed = values.seed;
  if (typeof seed !== 'string') {
    return {
      kind: 'error',
      error: { code: 'MISSING_SEED', message: 'Missing required flag: --seed <color>' },
    };
  }

  const stepsRaw = values.steps as string;
  const steps = Number.parseInt(stepsRaw, 10);
  if (!Number.isFinite(steps) || steps < 1) {
    return {
      kind: 'error',
      error: { code: 'INVALID_STEPS', message: `Invalid --steps value: "${stepsRaw}". Must be a positive integer.` },
    };
  }

  const format = values.format as string;
  if (!(SUPPORTED_FORMATS as readonly string[]).includes(format)) {
    return {
      kind: 'error',
      error: { code: 'INVALID_FORMAT', message: `Unsupported format: "${format}". Supported: ${SUPPORTED_FORMATS.join(', ')}` },
    };
  }

  const distribution = values.distribution as string;
  if (!(SUPPORTED_DISTRIBUTIONS as readonly string[]).includes(distribution)) {
    return {
      kind: 'error',
      error: { code: 'INVALID_DISTRIBUTION', message: `Unsupported distribution: "${distribution}". Supported: ${SUPPORTED_DISTRIBUTIONS.join(', ')}` },
    };
  }

  const rangeMin = Number.parseFloat(values['range-min'] as string);
  const rangeMax = Number.parseFloat(values['range-max'] as string);
  if (!Number.isFinite(rangeMin) || !Number.isFinite(rangeMax)) {
    return {
      kind: 'error',
      error: { code: 'INVALID_RANGE', message: 'Invalid --range-min or --range-max. Must be numbers between 0 and 1.' },
    };
  }

  return {
    kind: 'options',
    value: {
      seed,
      steps,
      format: format as 'css' | 'json',
      name: values.name as string,
      rangeMin,
      rangeMax,
      distribution: distribution as 'linear' | 'eased',
    },
  };
}
