import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeedList } from '../SeedList';
import type { SeedRow } from '../SeedList';

const baseSeeds: SeedRow[] = [{ id: 's1', initialHex: null }];

describe('SeedList', () => {
  it('renders one input per seed and one Remove button for a single seed', () => {
    render(
      <SeedList
        seeds={baseSeeds}
        onSeedParsed={vi.fn()}
        onAddSeed={vi.fn()}
        onRemoveSeed={vi.fn()}
      />,
    );
    expect(
      screen.getAllByPlaceholderText('Paste a color (e.g., #2563EB)'),
    ).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
  });

  it('renders a Remove button for each seed when multiple are present', () => {
    render(
      <SeedList
        seeds={[
          { id: 's1', initialHex: null },
          { id: 's2', initialHex: null },
        ]}
        onSeedParsed={vi.fn()}
        onAddSeed={vi.fn()}
        onRemoveSeed={vi.fn()}
      />,
    );
    expect(
      screen.getAllByRole('button', { name: /remove/i }),
    ).toHaveLength(2);
  });

  it('calls onAddSeed when Add Seed is clicked', () => {
    const onAddSeed = vi.fn();
    render(
      <SeedList
        seeds={baseSeeds}
        onSeedParsed={vi.fn()}
        onAddSeed={onAddSeed}
        onRemoveSeed={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /add seed/i }));
    expect(onAddSeed).toHaveBeenCalledTimes(1);
  });

  it('disables Add Seed when at the cap', () => {
    render(
      <SeedList
        seeds={[
          { id: 's1', initialHex: null },
          { id: 's2', initialHex: null },
          { id: 's3', initialHex: null },
        ]}
        onSeedParsed={vi.fn()}
        onAddSeed={vi.fn()}
        onRemoveSeed={vi.fn()}
        maxSeeds={3}
      />,
    );
    expect(
      screen.getByRole('button', { name: /add seed/i }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('calls onRemoveSeed with the seed id when Remove is clicked', () => {
    const onRemoveSeed = vi.fn();
    render(
      <SeedList
        seeds={[
          { id: 's1', initialHex: null },
          { id: 's2', initialHex: null },
        ]}
        onSeedParsed={vi.fn()}
        onAddSeed={vi.fn()}
        onRemoveSeed={onRemoveSeed}
      />,
    );
    const removes = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removes[1]!);
    expect(onRemoveSeed).toHaveBeenCalledWith('s2');
  });
});
