import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import { generateRamp, parseColor } from '@quieto/engine';
import type { Ramp } from '@quieto/engine';
import { RampView } from '../RampView';

function buildRamp(input: string): Ramp {
  const parsed = parseColor(input);
  if (!parsed.ok) throw new Error('fixture parse failed');
  const ramp = generateRamp({
    seed: parsed.value.oklch,
    steps: 10,
    range: { min: 0.05, max: 0.97 },
    distribution: 'linear',
    name: 'color',
  });
  if (!ramp.ok) throw new Error('fixture generate failed');
  return ramp.value;
}

describe('RampView', () => {
  it('renders 10 swatch items for a 10-step ramp', () => {
    render(<RampView ramp={buildRamp('#2563EB')} />);
    const list = screen.getByRole('list', { name: /color ramp/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(10);
  });

  it('renders the list container with an aria-label', () => {
    render(<RampView ramp={buildRamp('#2563EB')} />);
    expect(screen.getByRole('list')).toHaveAttribute(
      'aria-label',
      'Color ramp: color',
    );
  });

  it('renders exactly one seed-emphasized swatch', () => {
    const { container } = render(<RampView ramp={buildRamp('#2563EB')} />);
    const seedItems = container.querySelectorAll('[data-seed="true"]');
    expect(seedItems).toHaveLength(1);
  });

  it('renders swatches in the order provided by the ramp (lightest to darkest)', () => {
    const ramp = buildRamp('#2563EB');
    const { container } = render(<RampView ramp={ramp} />);
    const items = container.querySelectorAll('[role="listitem"]');
    items.forEach((el, i) => {
      expect(el.textContent).toContain(ramp.steps[i]!.hex);
    });
  });

  it('all swatches default to highlight state "none" when nothing is hovered', () => {
    const { container } = render(<RampView ramp={buildRamp('#2563EB')} />);
    const items = container.querySelectorAll('[role="listitem"]');
    items.forEach((el) => {
      expect(el.getAttribute('data-highlight')).toBe('none');
    });
  });

  it('classifies hovered swatch as "active" and others by contrast tier', () => {
    const ramp = buildRamp('#2563EB');
    const { container } = render(<RampView ramp={ramp} />);
    const items = Array.from(
      container.querySelectorAll<HTMLLIElement>('[role="listitem"]'),
    );
    // Hover the first (lightest) swatch
    fireEvent.mouseEnter(items[0]!);
    expect(items[0]!.getAttribute('data-highlight')).toBe('active');
    // Other swatches must each have a non-"none" classification
    for (let i = 1; i < items.length; i++) {
      const tier = items[i]!.getAttribute('data-highlight');
      expect(['aaa', 'aa', 'fail']).toContain(tier);
    }
  });

  it('clears highlight states when the mouse leaves the ramp container', () => {
    const ramp = buildRamp('#2563EB');
    const { container } = render(<RampView ramp={ramp} />);
    const list = container.querySelector('ul[role="list"]')!;
    const items = Array.from(
      container.querySelectorAll<HTMLLIElement>('[role="listitem"]'),
    );
    fireEvent.mouseEnter(items[0]!);
    expect(items[0]!.getAttribute('data-highlight')).toBe('active');
    fireEvent.mouseLeave(list);
    items.forEach((el) => {
      expect(el.getAttribute('data-highlight')).toBe('none');
    });
  });

  it('focusing a swatch triggers the same highlighting as hover', () => {
    const ramp = buildRamp('#2563EB');
    const { container } = render(<RampView ramp={ramp} />);
    const items = Array.from(
      container.querySelectorAll<HTMLLIElement>('[role="listitem"]'),
    );
    fireEvent.focus(items[0]!);
    expect(items[0]!.getAttribute('data-highlight')).toBe('active');
    expect(items[0]!).toHaveAttribute('tabindex', '0');
  });

  it('announces contrast data via the polite live region when a swatch is hovered', () => {
    vi.useFakeTimers();
    try {
      const ramp = buildRamp('#2563EB');
      const { container } = render(<RampView ramp={ramp} />);
      const live = container.querySelector('[aria-live="polite"]')!;
      expect(live.textContent).toBe('');
      const items = container.querySelectorAll<HTMLLIElement>('[role="listitem"]');
      fireEvent.mouseEnter(items[0]!);
      act(() => { vi.advanceTimersByTime(150); });
      expect(live.textContent).toMatch(/^Step 1, #/);
      // The lightest step should pass AAA against several darker steps
      expect(live.textContent).toMatch(/AAA with steps/);
    } finally {
      vi.useRealTimers();
    }
  });
});
