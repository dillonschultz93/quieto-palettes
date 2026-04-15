import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RampControls } from '../RampControls';
import type { RampConfig } from '../../hooks/usePalette';

const baseConfig: RampConfig = {
  steps: 10,
  rangeMin: 0.05,
  rangeMax: 0.97,
  distribution: 'linear',
};

describe('RampControls', () => {
  it('renders all four fields with labels', () => {
    render(<RampControls value={baseConfig} onChange={() => {}} />);
    expect(screen.getByLabelText(/steps/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lightness min/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lightness max/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/distribution/i)).toBeInTheDocument();
  });

  it('commits steps on blur', () => {
    const onChange = vi.fn();
    render(<RampControls value={baseConfig} onChange={onChange} />);
    const input = screen.getByLabelText(/steps/i);
    fireEvent.change(input, { target: { value: '12' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ ...baseConfig, steps: 12 });
  });

  it('commits steps on Enter', () => {
    const onChange = vi.fn();
    render(<RampControls value={baseConfig} onChange={onChange} />);
    const input = screen.getByLabelText(/steps/i);
    fireEvent.change(input, { target: { value: '8' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith({ ...baseConfig, steps: 8 });
  });

  it('clamps steps below 2 to 2', () => {
    const onChange = vi.fn();
    render(<RampControls value={baseConfig} onChange={onChange} />);
    const input = screen.getByLabelText(/steps/i);
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ ...baseConfig, steps: 2 });
  });

  it('clamps steps above 60 to 60', () => {
    const onChange = vi.fn();
    render(<RampControls value={baseConfig} onChange={onChange} />);
    const input = screen.getByLabelText(/steps/i);
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ ...baseConfig, steps: 60 });
  });

  it('commits range min on blur', () => {
    const onChange = vi.fn();
    render(<RampControls value={baseConfig} onChange={onChange} />);
    const input = screen.getByLabelText(/lightness min/i);
    fireEvent.change(input, { target: { value: '0.15' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ ...baseConfig, rangeMin: 0.15 });
  });

  it('clamps range min outside [0,1]', () => {
    const onChange = vi.fn();
    render(<RampControls value={baseConfig} onChange={onChange} />);
    const input = screen.getByLabelText(/lightness min/i);
    fireEvent.change(input, { target: { value: '-1' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ ...baseConfig, rangeMin: 0 });
  });

  it('toggles distribution via select', () => {
    const onChange = vi.fn();
    render(<RampControls value={baseConfig} onChange={onChange} />);
    const select = screen.getByLabelText(/distribution/i);
    fireEvent.change(select, { target: { value: 'eased' } });
    expect(onChange).toHaveBeenCalledWith({ ...baseConfig, distribution: 'eased' });
  });

  it('does not call onChange when the committed value is unchanged', () => {
    const onChange = vi.fn();
    render(<RampControls value={baseConfig} onChange={onChange} />);
    const input = screen.getByLabelText(/steps/i);
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reflects updates to value prop in the inputs', () => {
    const { rerender } = render(
      <RampControls value={baseConfig} onChange={() => {}} />,
    );
    const stepsInput = screen.getByLabelText(/steps/i) as HTMLInputElement;
    expect(stepsInput.value).toBe('10');
    rerender(
      <RampControls value={{ ...baseConfig, steps: 24 }} onChange={() => {}} />,
    );
    expect(stepsInput.value).toBe('24');
  });

  it('wraps fields in a fieldset with a legend', () => {
    render(<RampControls value={baseConfig} onChange={() => {}} />);
    const legend = screen.getByText(/ramp configuration/i);
    expect(legend.tagName).toBe('LEGEND');
    expect(legend.closest('fieldset')).not.toBeNull();
  });
});
