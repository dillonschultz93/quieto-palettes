import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { App } from '../App';

function enterColor(value: string) {
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

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
