import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeedInput } from '../SeedInput';

describe('SeedInput', () => {
  it('renders input with placeholder', () => {
    render(<SeedInput onColorParsed={vi.fn()} />);
    expect(
      screen.getByPlaceholderText('Paste a color (e.g., #2563EB)'),
    ).toBeInTheDocument();
  });

  it('shows preview swatch and format on valid hex input via Enter', () => {
    const onColorParsed = vi.fn();
    render(<SeedInput onColorParsed={onColorParsed} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '#2563EB' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('HEX')).toBeInTheDocument();
    expect(screen.getByLabelText(/Preview swatch/)).toBeInTheDocument();
    expect(onColorParsed).toHaveBeenCalledTimes(1);
    expect(onColorParsed).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'hex', original: '#2563EB' }),
    );
  });

  it('shows preview swatch on valid rgb input', () => {
    const onColorParsed = vi.fn();
    render(<SeedInput onColorParsed={onColorParsed} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'rgb(37, 99, 235)' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('RGB')).toBeInTheDocument();
    expect(onColorParsed).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'rgb' }),
    );
  });

  it('shows preview swatch on valid hsl input', () => {
    const onColorParsed = vi.fn();
    render(<SeedInput onColorParsed={onColorParsed} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hsl(217, 91%, 53%)' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('HSL')).toBeInTheDocument();
    expect(onColorParsed).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'hsl' }),
    );
  });

  it('shows preview swatch on valid hsb input', () => {
    const onColorParsed = vi.fn();
    render(<SeedInput onColorParsed={onColorParsed} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hsb(217, 84%, 92%)' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('HSB')).toBeInTheDocument();
    expect(onColorParsed).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'hsb' }),
    );
  });

  it('shows error message on invalid input', () => {
    render(<SeedInput onColorParsed={vi.fn()} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'not-a-color' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const error = screen.getByRole('alert');
    expect(error).toBeInTheDocument();
    expect(error).toHaveTextContent(/.+/);
  });

  it('clears error when user starts typing again', () => {
    render(<SeedInput onColorParsed={vi.fn()} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'bad' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'b' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('triggers parsing on blur', () => {
    const onColorParsed = vi.fn();
    render(<SeedInput onColorParsed={onColorParsed} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '#ff0000' } });
    fireEvent.blur(input);

    expect(onColorParsed).toHaveBeenCalledTimes(1);
    expect(screen.getByText('HEX')).toBeInTheDocument();
  });

  it('does not double-fire onColorParsed on Enter then blur', () => {
    const onColorParsed = vi.fn();
    render(<SeedInput onColorParsed={onColorParsed} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '#2563EB' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);

    expect(onColorParsed).toHaveBeenCalledTimes(1);
  });

  it('has aria-label on input', () => {
    render(<SeedInput onColorParsed={vi.fn()} />);
    expect(screen.getByLabelText('Seed color input')).toBeInTheDocument();
  });

  it('sets aria-describedby when error is shown', () => {
    render(<SeedInput onColorParsed={vi.fn()} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input).toHaveAttribute('aria-describedby', 'seed-input-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not call onColorParsed on empty input', () => {
    const onColorParsed = vi.fn();
    render(<SeedInput onColorParsed={onColorParsed} />);

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onColorParsed).not.toHaveBeenCalled();
  });
});
