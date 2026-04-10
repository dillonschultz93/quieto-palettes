import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { RampStep } from '@quieto/engine';
import { SwatchItem } from '../SwatchItem';

function makeStep(overrides: Partial<RampStep> = {}): RampStep {
  return {
    oklch: { l: 0.5, c: 0.1, h: 240 },
    hex: '#2563EB',
    rgb: 'rgb(37, 99, 235)',
    hsl: 'hsl(221, 83%, 53%)',
    hsb: 'hsb(221, 84%, 92%)',
    isSeed: false,
    isOverride: false,
    isGamutClamped: false,
    id: 'step-1',
    ...overrides,
  };
}

describe('SwatchItem', () => {
  it('renders the hex value as text', () => {
    render(<SwatchItem step={makeStep()} index={0} />);
    expect(screen.getByText('#2563EB')).toBeInTheDocument();
  });

  it('applies the hex as background color', () => {
    render(<SwatchItem step={makeStep({ hex: '#FF0000' })} index={0} />);
    const item = screen.getByRole('listitem');
    expect(item).toHaveStyle({ backgroundColor: '#FF0000' });
  });

  it('has a listitem role with an aria-label describing the step', () => {
    render(<SwatchItem step={makeStep({ hex: '#2563EB' })} index={2} />);
    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('aria-label');
    expect(item.getAttribute('aria-label')).toContain('#2563EB');
  });

  it('prefixes aria-label with the 1-indexed step number', () => {
    render(<SwatchItem step={makeStep({ hex: '#2563EB' })} index={2} />);
    const item = screen.getByRole('listitem');
    expect(item.getAttribute('aria-label')).toMatch(/^Step 3:/);
  });

  it('includes "seed color" in aria-label when step is the seed', () => {
    render(<SwatchItem step={makeStep({ isSeed: true })} index={0} />);
    const item = screen.getByRole('listitem');
    expect(item.getAttribute('aria-label')).toMatch(/seed color/i);
  });

  it('does not include "seed color" in aria-label when step is not the seed', () => {
    render(<SwatchItem step={makeStep({ isSeed: false })} index={0} />);
    const item = screen.getByRole('listitem');
    expect(item.getAttribute('aria-label')).not.toMatch(/seed color/i);
  });

  it('applies a seed-emphasis data attribute when isSeed is true', () => {
    render(<SwatchItem step={makeStep({ isSeed: true })} index={0} />);
    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('data-seed', 'true');
  });

  it('uses dark text for light swatches (l > 0.6)', () => {
    render(
      <SwatchItem
        step={makeStep({ oklch: { l: 0.8, c: 0.05, h: 240 } })}
        index={0}
      />,
    );
    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('data-text-tone', 'dark');
  });

  it('uses light text for dark swatches (l <= 0.6)', () => {
    render(
      <SwatchItem
        step={makeStep({ oklch: { l: 0.4, c: 0.1, h: 240 } })}
        index={0}
      />,
    );
    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('data-text-tone', 'light');
  });

  it('uses light text at the l === 0.6 boundary (threshold is strict >)', () => {
    render(
      <SwatchItem
        step={makeStep({ oklch: { l: 0.6, c: 0.1, h: 240 } })}
        index={0}
      />,
    );
    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('data-text-tone', 'light');
  });

  it('is keyboard-focusable via tabIndex=0', () => {
    render(<SwatchItem step={makeStep()} index={0} />);
    expect(screen.getByRole('listitem')).toHaveAttribute('tabindex', '0');
  });

  it('defaults data-highlight to "none" when no highlightState prop is provided', () => {
    render(<SwatchItem step={makeStep()} index={0} />);
    expect(screen.getByRole('listitem')).toHaveAttribute('data-highlight', 'none');
  });

  it('reflects the highlightState prop on the data-highlight attribute', () => {
    render(<SwatchItem step={makeStep()} index={0} highlightState="aaa" />);
    expect(screen.getByRole('listitem')).toHaveAttribute('data-highlight', 'aaa');
  });

  it('invokes onHover with step.id on mouse enter', () => {
    const onHover = vi.fn();
    render(<SwatchItem step={makeStep({ id: 'step-xyz' })} index={0} onHover={onHover} />);
    fireEvent.mouseEnter(screen.getByRole('listitem'));
    expect(onHover).toHaveBeenCalledWith('step-xyz');
  });

  it('invokes onFocus with step.id when focused', () => {
    const onFocus = vi.fn();
    render(<SwatchItem step={makeStep({ id: 'step-xyz' })} index={0} onFocus={onFocus} />);
    screen.getByRole('listitem').focus();
    expect(onFocus).toHaveBeenCalledWith('step-xyz');
  });
});
