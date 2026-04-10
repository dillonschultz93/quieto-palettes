import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';

describe('App', () => {
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

  it('does not show ramp placeholder initially', () => {
    render(<App />);
    expect(screen.queryByText(/ramp visualization/i)).not.toBeInTheDocument();
  });

  it('shows ramp placeholder after valid color input', () => {
    render(<App />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '#2563EB' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText(/ramp visualization/i)).toBeInTheDocument();
  });
});
