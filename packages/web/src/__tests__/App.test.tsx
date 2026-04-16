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

  it('regenerates the ramp with a new step count', () => {
    const { container } = render(<App />);
    enterColor('#2563EB');
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(10);

    const stepsInput = screen.getByLabelText(/steps/i);
    fireEvent.change(stepsInput, { target: { value: '12' } });
    fireEvent.blur(stepsInput);

    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(12);
    expect(container.querySelectorAll('[data-seed="true"]')).toHaveLength(1);
  });

  it('toggles distribution to eased and changes step spacing', () => {
    const { container } = render(<App />);
    enterColor('#2563EB');
    const linearLs = Array.from(
      container.querySelectorAll('[data-l]'),
    ).map((el) => parseFloat(el.getAttribute('data-l') ?? '0'));

    const dist = screen.getByLabelText(/distribution/i);
    fireEvent.change(dist, { target: { value: 'eased' } });

    const easedLs = Array.from(
      container.querySelectorAll('[data-l]'),
    ).map((el) => parseFloat(el.getAttribute('data-l') ?? '0'));

    expect(easedLs).toHaveLength(linearLs.length);
    const anyDiffers = easedLs.some(
      (l, i) => Math.abs(l - (linearLs[i] ?? l)) > 0.001,
    );
    expect(anyDiffers).toBe(true);
  });

  it('honors lightness ceiling via rangeMax', () => {
    const { container } = render(<App />);
    enterColor('#2563EB');
    const maxInput = screen.getByLabelText(/lightness max/i);
    fireEvent.change(maxInput, { target: { value: '0.85' } });
    fireEvent.blur(maxInput);

    const swatches = container.querySelectorAll('[data-l]');
    expect(swatches.length).toBeGreaterThan(0);
    for (const el of swatches) {
      const l = parseFloat(el.getAttribute('data-l') ?? '0');
      expect(l).toBeLessThanOrEqual(0.851);
    }
  });

  it('honors lightness floor via rangeMin', () => {
    const { container } = render(<App />);
    enterColor('#2563EB');
    const minInput = screen.getByLabelText(/lightness min/i);
    fireEvent.change(minInput, { target: { value: '0.15' } });
    fireEvent.blur(minInput);

    const swatches = container.querySelectorAll('[data-l]');
    expect(swatches.length).toBeGreaterThan(0);
    for (const el of swatches) {
      const l = parseFloat(el.getAttribute('data-l') ?? '0');
      expect(l).toBeGreaterThanOrEqual(0.149);
    }
  });

  it('keeps the previous ramp rendered when a new config is invalid', () => {
    const { container } = render(<App />);
    enterColor('#2563EB');
    const minInput = screen.getByLabelText(/lightness min/i);
    fireEvent.change(minInput, { target: { value: '0.99' } });
    fireEvent.blur(minInput);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(container.querySelectorAll('[role="listitem"]').length).toBeGreaterThan(0);
  });

  it('restores configuration from a URL hash', () => {
    const parsed = parseColor('#2563EB');
    if (!parsed.ok) throw new Error('fixture parse failed');
    const customRamp = generateRamp({
      seed: parsed.value.oklch,
      steps: 12,
      range: { min: 0.1, max: 0.9 },
      distribution: 'eased',
      name: 'color',
    });
    if (!customRamp.ok) throw new Error('fixture generate failed');
    const encoded = serializeState(paletteToState({ ramps: [customRamp.value] }));
    window.location.hash = '#s=' + encoded;

    const { container } = render(<App />);
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(12);
    expect((screen.getByLabelText(/distribution/i) as HTMLSelectElement).value).toBe('eased');
    expect((screen.getByLabelText(/steps/i) as HTMLInputElement).value).toBe('12');
    expect(
      parseFloat((screen.getByLabelText(/lightness min/i) as HTMLInputElement).value),
    ).toBeCloseTo(0.1, 2);
    expect(
      parseFloat((screen.getByLabelText(/lightness max/i) as HTMLInputElement).value),
    ).toBeCloseTo(0.9, 2);
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

  describe('multiple seeds', () => {
    function enterColorAt(index: number, value: string) {
      const inputs = screen.getAllByPlaceholderText(
        'Paste a color (e.g., #2563EB)',
      );
      const input = inputs[index];
      if (!input) throw new Error(`no input at index ${index}`);
      fireEvent.change(input, { target: { value } });
      fireEvent.keyDown(input, { key: 'Enter' });
    }

    it('starts with a single seed input and one Remove button', () => {
      render(<App />);
      expect(
        screen.getAllByPlaceholderText('Paste a color (e.g., #2563EB)'),
      ).toHaveLength(1);
      expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
    });

    it('Add Seed appends an empty seed row', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /add seed/i }));
      expect(
        screen.getAllByPlaceholderText('Paste a color (e.g., #2563EB)'),
      ).toHaveLength(2);
    });

    it('renders two ramps when two seeds are entered', () => {
      render(<App />);
      enterColorAt(0, '#2563EB');
      fireEvent.click(screen.getByRole('button', { name: /add seed/i }));
      enterColorAt(1, '#EB2525');

      const ramps = screen.getAllByRole('list', { name: /color ramp/i });
      expect(ramps).toHaveLength(2);
      for (const list of ramps) {
        expect(within(list).getAllByRole('listitem')).toHaveLength(10);
      }
    });

    it('disables Add Seed after the third seed is added', () => {
      render(<App />);
      const addButton = screen.getByRole('button', { name: /add seed/i });
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      expect(
        screen.getAllByPlaceholderText('Paste a color (e.g., #2563EB)'),
      ).toHaveLength(3);
      expect(addButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('removing a seed row removes its ramp', () => {
      render(<App />);
      enterColorAt(0, '#2563EB');
      fireEvent.click(screen.getByRole('button', { name: /add seed/i }));
      enterColorAt(1, '#EB2525');
      expect(screen.getAllByRole('list', { name: /color ramp/i })).toHaveLength(2);

      const removeButtons = screen.getAllByRole('button', {
        name: /remove/i,
      });
      fireEvent.click(removeButtons[0]!);
      expect(screen.getAllByRole('list', { name: /color ramp/i })).toHaveLength(1);
    });

    it('applies the same config to every ramp', () => {
      const { container } = render(<App />);
      enterColorAt(0, '#2563EB');
      fireEvent.click(screen.getByRole('button', { name: /add seed/i }));
      enterColorAt(1, '#EB2525');

      const stepsInput = screen.getByLabelText(/steps/i);
      fireEvent.change(stepsInput, { target: { value: '12' } });
      fireEvent.blur(stepsInput);

      const ramps = screen.getAllByRole('list', { name: /color ramp/i });
      expect(ramps).toHaveLength(2);
      for (const list of ramps) {
        expect(within(list).getAllByRole('listitem')).toHaveLength(12);
      }
      expect(container.querySelectorAll('[data-seed="true"]')).toHaveLength(2);
    });

    it('restores multiple seeds from a URL hash', () => {
      const seeds = ['#2563EB', '#EB2525'];
      const ramps = seeds.map((hex, i) => {
        const p = parseColor(hex);
        if (!p.ok) throw new Error('fixture parse failed');
        const r = generateRamp({
          seed: p.value.oklch,
          steps: 10,
          range: { min: 0.05, max: 0.97 },
          distribution: 'linear',
          name: `color-${i + 1}`,
        });
        if (!r.ok) throw new Error('fixture generate failed');
        return r.value;
      });
      window.location.hash = '#s=' + serializeState(paletteToState({ ramps }));
      render(<App />);

      expect(screen.getAllByRole('list', { name: /color ramp/i })).toHaveLength(2);
      expect(
        screen.getAllByPlaceholderText('Paste a color (e.g., #2563EB)'),
      ).toHaveLength(2);
    });

    it('CSS export contains variables for all ramps', () => {
      render(<App />);
      enterColorAt(0, '#2563EB');
      fireEvent.click(screen.getByRole('button', { name: /add seed/i }));
      enterColorAt(1, '#EB2525');

      fireEvent.click(screen.getByRole('button', { name: /export css/i }));
      const code = screen.getByLabelText(
        /generated css custom properties/i,
      );
      expect(code.textContent ?? '').toMatch(/--color-color-1-/);
      expect(code.textContent ?? '').toMatch(/--color-color-2-/);
    });
  });
});
