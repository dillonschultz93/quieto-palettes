import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  generateRamp,
  parseColor,
  paletteToState,
  serializeState,
} from '@quieto/engine';
import type { Ramp } from '@quieto/engine';
import { App } from '../App';

function encodedFor(input: string): string {
  const parsed = parseColor(input);
  if (!parsed.ok) throw new Error('fixture parse failed');
  const r = generateRamp({
    seed: parsed.value.oklch,
    steps: 10,
    range: { min: 0.05, max: 0.97 },
    distribution: 'linear',
    name: 'color',
  });
  if (!r.ok) throw new Error('fixture generate failed');
  const ramp: Ramp = r.value;
  return serializeState(paletteToState({ ramps: [ramp] }));
}

function enterColor(value: string) {
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('App', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('renders the title', () => {
    render(<App />);
    expect(screen.getByText('Quieto')).toBeInTheDocument();
  });

  it('renders the seed input', () => {
    render(<App />);
    expect(
      screen.getByPlaceholderText('Paste a color (e.g., #2563EB)'),
    ).toBeInTheDocument();
  });

  it('does not show a ramp initially', () => {
    render(<App />);
    expect(screen.queryByRole('list', { name: /color ramp/i })).toBeNull();
  });

  it('renders the ramp after a valid color is entered', () => {
    render(<App />);
    enterColor('#2563EB');

    const list = screen.getByRole('list', { name: /color ramp/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(10);
  });

  it('marks exactly one swatch as the seed', () => {
    const { container } = render(<App />);
    enterColor('#2563EB');

    expect(container.querySelectorAll('[data-seed="true"]')).toHaveLength(1);
  });

  it('restores the ramp from a valid URL hash on load', () => {
    window.location.hash = '#s=' + encodedFor('#2563EB');
    const { container } = render(<App />);

    const list = screen.getByRole('list', { name: /color ramp/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(10);
    const seedHex = container
      .querySelector('[data-seed="true"]')
      ?.textContent?.toLowerCase();
    expect(seedHex).toContain('2563eb');
  });

  it('renders empty state when the URL hash is malformed', () => {
    window.location.hash = '#s=not-valid-base64';
    render(<App />);
    expect(screen.queryByRole('list', { name: /color ramp/i })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('writes the URL hash when a ramp is generated', () => {
    render(<App />);
    enterColor('#2563EB');
    expect(window.location.hash).toMatch(/^#s=/);
  });

  it('regenerates the ramp when the seed changes', () => {
    const { container } = render(<App />);
    enterColor('#2563EB');
    const firstSeedHex = container.querySelector('[data-seed="true"]')?.textContent;

    enterColor('#EB2525');
    const secondSeedHex = container.querySelector('[data-seed="true"]')?.textContent;

    expect(firstSeedHex).toBeTruthy();
    expect(secondSeedHex).toBeTruthy();
    expect(secondSeedHex).not.toEqual(firstSeedHex);
  });
});
