import { describe, it, expect } from 'vitest';
import { parseCliArgs } from './args.js';

describe('parseCliArgs', () => {
  const base = ['node', 'quieto-palettes'];

  it('parses valid args with all defaults', () => {
    const result = parseCliArgs([...base, 'generate', '--seed', '#2563EB']);
    expect(result.kind).toBe('options');
    if (result.kind !== 'options') return;
    expect(result.value.seed).toBe('#2563EB');
    expect(result.value.steps).toBe(10);
    expect(result.value.format).toBe('css');
    expect(result.value.name).toBe('color');
    expect(result.value.distribution).toBe('linear');
    expect(result.value.rangeMin).toBeCloseTo(0.05);
    expect(result.value.rangeMax).toBeCloseTo(0.97);
  });

  it('parses explicit steps and name overrides', () => {
    const result = parseCliArgs([...base, 'generate', '--seed', '#FF0000', '--steps', '10', '--name', 'red']);
    expect(result.kind).toBe('options');
    if (result.kind !== 'options') return;
    expect(result.value.steps).toBe(10);
    expect(result.value.name).toBe('red');
  });

  it('parses distribution and range overrides', () => {
    const result = parseCliArgs([...base, 'generate', '--seed', '#FF0000', '--distribution', 'eased', '--range-min', '0.1', '--range-max', '0.9']);
    expect(result.kind).toBe('options');
    if (result.kind !== 'options') return;
    expect(result.value.distribution).toBe('eased');
    expect(result.value.rangeMin).toBeCloseTo(0.1);
    expect(result.value.rangeMax).toBeCloseTo(0.9);
  });

  it('returns error when seed is missing', () => {
    const result = parseCliArgs([...base, 'generate']);
    expect(result.kind).toBe('error');
    if (result.kind !== 'error') return;
    expect(result.error.code).toBe('MISSING_SEED');
  });

  it('returns error when subcommand is missing', () => {
    const result = parseCliArgs([...base, '--seed', '#FF0000']);
    expect(result.kind).toBe('error');
    if (result.kind !== 'error') return;
    expect(result.error.code).toBe('MISSING_SUBCOMMAND');
  });

  it('returns error for invalid steps', () => {
    const result = parseCliArgs([...base, 'generate', '--seed', '#FF0000', '--steps', 'abc']);
    expect(result.kind).toBe('error');
    if (result.kind !== 'error') return;
    expect(result.error.code).toBe('INVALID_STEPS');
  });

  it('returns error for zero steps', () => {
    const result = parseCliArgs([...base, 'generate', '--seed', '#FF0000', '--steps', '0']);
    expect(result.kind).toBe('error');
    if (result.kind !== 'error') return;
    expect(result.error.code).toBe('INVALID_STEPS');
  });

  it('returns error for unsupported format', () => {
    const result = parseCliArgs([...base, 'generate', '--seed', '#FF0000', '--format', 'yaml']);
    expect(result.kind).toBe('error');
    if (result.kind !== 'error') return;
    expect(result.error.code).toBe('INVALID_FORMAT');
  });

  it('returns error for unsupported distribution', () => {
    const result = parseCliArgs([...base, 'generate', '--seed', '#FF0000', '--distribution', 'cubic']);
    expect(result.kind).toBe('error');
    if (result.kind !== 'error') return;
    expect(result.error.code).toBe('INVALID_DISTRIBUTION');
  });

  it('returns error for unknown flags', () => {
    const result = parseCliArgs([...base, 'generate', '--seed', '#FF0000', '--unknown']);
    expect(result.kind).toBe('error');
    if (result.kind !== 'error') return;
    expect(result.error.code).toBe('INVALID_ARGS');
  });

  it('returns help for --help flag', () => {
    const result = parseCliArgs([...base, '--help']);
    expect(result.kind).toBe('help');
  });

  it('returns help for -h flag', () => {
    const result = parseCliArgs([...base, '-h']);
    expect(result.kind).toBe('help');
  });

  it('returns version for --version flag', () => {
    const result = parseCliArgs([...base, '--version']);
    expect(result.kind).toBe('version');
  });

  it('returns version for -v flag', () => {
    const result = parseCliArgs([...base, '-v']);
    expect(result.kind).toBe('version');
  });

  it('accepts --format json', () => {
    const result = parseCliArgs([...base, 'generate', '--seed', '#FF0000', '--format', 'json']);
    expect(result.kind).toBe('options');
    if (result.kind !== 'options') return;
    expect(result.value.format).toBe('json');
  });
});
