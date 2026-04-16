import type { ColorError, ParsedColor } from '@quieto/engine';
import { MAX_SEEDS } from '../App';
import { SeedInput } from './SeedInput';
import styles from './SeedList.module.css';

export type SeedRow = {
  id: string;
  initialHex: string | null;
};

type SeedListProps = {
  seeds: SeedRow[];
  seedErrors?: Map<string, ColorError>;
  onSeedParsed: (id: string, parsed: ParsedColor) => void;
  onAddSeed: () => void;
  onRemoveSeed: (id: string) => void;
  maxSeeds?: number;
};

export function SeedList({
  seeds,
  seedErrors,
  onSeedParsed,
  onAddSeed,
  onRemoveSeed,
  maxSeeds = MAX_SEEDS,
}: SeedListProps) {
  const atCap = seeds.length >= maxSeeds;

  return (
    <div className={styles.wrapper}>
      <ul className={styles.list} aria-label="Seed colors">
        {seeds.map((seed, index) => (
          <li key={seed.id} className={styles.row}>
            <div className={styles.inputSlot}>
              <SeedInput
                id={seed.id}
                ariaLabel={`Seed color ${index + 1}`}
                initialValue={
                  seed.initialHex ? `#${seed.initialHex}` : undefined
                }
                externalError={seedErrors?.get(seed.id)?.message}
                onColorParsed={(parsed, id) =>
                  onSeedParsed(id ?? seed.id, parsed)
                }
              />
            </div>
            <button
              type="button"
              className={styles.removeButton}
              aria-label={`Remove, seed ${index + 1}`}
              onClick={() => onRemoveSeed(seed.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={styles.addButton}
        aria-label="Add Seed"
        aria-disabled={atCap || undefined}
        onClick={atCap ? undefined : onAddSeed}
      >
        Add Seed
      </button>
    </div>
  );
}
