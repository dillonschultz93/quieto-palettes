import { describe, it, expect } from 'vitest';
import { run, getVersion } from '../index.js';
import { exportCSS, parseColor, generateRamp } from '@quieto/engine';
import type { Palette } from '@quieto/engine';

describe('CLI integration', () => {
  const base = ['node', 'quieto-palettes'];

  it('generates CSS output matching engine exportCSS for --seed "#2563EB" --steps 10 --format css', () => {
    const result = run([...base, 'generate', '--seed', '#2563EB', '--steps', '10', '--format', 'css']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');

    // Generate expected output via engine directly
    const parsed = parseColor('#2563EB');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const ramp = generateRamp({
      seed: parsed.value.oklch,
      steps: 10,
      range: { min: 0.05, max: 0.97 },
      distribution: 'linear',
      name: 'color',
    });
    expect(ramp.ok).toBe(true);
    if (!ramp.ok) return;

    const palette: Palette = { ramps: [ramp.value] };
    const expected = exportCSS(palette, { naming: 'numeric' });
    expect(expected.ok).toBe(true);
    if (!expected.ok) return;

    expect(result.stdout).toBe(expected.value);
  });

  it('generates CSS with custom name', () => {
    const result = run([...base, 'generate', '--seed', '#2563EB', '--steps', '10', '--name', 'blue']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('--color-blue-');
  });

  it('returns error for invalid seed color', () => {
    const result = run([...base, 'generate', '--seed', 'notacolor']);
    expect(result.code).toBe(1);
    expect(result.stderr).toBeTruthy();
    expect(result.stdout).toBe('');
  });

  it('returns error for missing seed', () => {
    const result = run([...base, 'generate']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('--seed');
  });

  it('returns error for missing subcommand', () => {
    const result = run([...base]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('generate');
  });

  it('--help returns help text with key phrases and exits 0', () => {
    const result = run([...base, '--help']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('generate');
    expect(result.stdout).toContain('--seed');
    expect(result.stdout).toContain('--format');
    expect(result.stdout).toContain('css');
    expect(result.stdout).toContain('json');
  });

  it('-h returns help text and exits 0', () => {
    const result = run([...base, '-h']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('--seed');
  });

  it('--version returns version matching package.json', () => {
    const result = run([...base, '--version']);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(getVersion());
  });

  it('-v returns version and exits 0', () => {
    const result = run([...base, '-v']);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('--format json with valid seed outputs valid JSON with ramp data', () => {
    const result = run([...base, 'generate', '--seed', '#2563EB', '--steps', '10', '--format', 'json']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');

    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('ramps');
    expect(parsed.ramps).toHaveLength(1);
    expect(parsed.ramps[0].steps).toHaveLength(10);
    expect(parsed.ramps[0].steps[0]).toHaveProperty('hex');
    expect(parsed.ramps[0].steps[0]).toHaveProperty('rgb');
    expect(parsed.ramps[0].steps[0]).toHaveProperty('oklch');
    expect(parsed).toHaveProperty('contrast');
    expect(parsed.contrast.length).toBeGreaterThan(0);
  });

  it('--format json with non-10 step count succeeds', () => {
    const result = run([...base, 'generate', '--seed', '#2563EB', '--steps', '5', '--format', 'json']);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ramps[0].steps).toHaveLength(5);
  });

  it('unknown format produces error', () => {
    const result = run([...base, 'generate', '--seed', '#2563EB', '--format', 'xml']);
    expect(result.code).toBe(1);
    expect(result.stderr).toBeTruthy();
  });

  it('no subcommand prints help to stderr and exits 1', () => {
    const result = run([...base]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('--seed');
    expect(result.stderr).toContain('generate');
  });
});
