import { useEffect, useId, useState } from 'react';
import type { RampConfig } from '../hooks/usePalettes';
import styles from './RampControls.module.css';

type RampControlsProps = {
  value: RampConfig;
  onChange: (next: RampConfig) => void;
};

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function toInt(raw: string, fallback: number): number {
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toFloat(raw: string, fallback: number): number {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function RampControls({ value, onChange }: RampControlsProps) {
  const stepsId = useId();
  const minId = useId();
  const maxId = useId();
  const distId = useId();

  const [draft, setDraft] = useState({
    steps: String(value.steps),
    rangeMin: String(value.rangeMin),
    rangeMax: String(value.rangeMax),
  });

  useEffect(() => {
    setDraft({
      steps: String(value.steps),
      rangeMin: String(value.rangeMin),
      rangeMax: String(value.rangeMax),
    });
  }, [value.steps, value.rangeMin, value.rangeMax]);

  const commitSteps = () => {
    const next = clamp(toInt(draft.steps, value.steps), 2, 60);
    setDraft((d) => ({ ...d, steps: String(next) }));
    if (next !== value.steps) onChange({ ...value, steps: next });
  };

  const commitMin = () => {
    const next = clamp(toFloat(draft.rangeMin, value.rangeMin), 0, 1);
    setDraft((d) => ({ ...d, rangeMin: String(next) }));
    if (next !== value.rangeMin) onChange({ ...value, rangeMin: next });
  };

  const commitMax = () => {
    const next = clamp(toFloat(draft.rangeMax, value.rangeMax), 0, 1);
    setDraft((d) => ({ ...d, rangeMax: String(next) }));
    if (next !== value.rangeMax) onChange({ ...value, rangeMax: next });
  };

  const handleDistribution = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value === 'eased' ? 'eased' : 'linear';
    if (next !== value.distribution) onChange({ ...value, distribution: next });
  };

  const enterCommits = (commit: () => void) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      }
    };

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Ramp configuration</legend>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor={stepsId} className={styles.label}>
            Steps
          </label>
          <input
            id={stepsId}
            type="number"
            min={2}
            max={60}
            step={1}
            className={styles.input}
            value={draft.steps}
            onChange={(e) => setDraft((d) => ({ ...d, steps: e.target.value }))}
            onBlur={commitSteps}
            onKeyDown={enterCommits(commitSteps)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={minId} className={styles.label}>
            Lightness min
          </label>
          <input
            id={minId}
            type="number"
            min={0}
            max={1}
            step={0.01}
            className={styles.input}
            value={draft.rangeMin}
            onChange={(e) => setDraft((d) => ({ ...d, rangeMin: e.target.value }))}
            onBlur={commitMin}
            onKeyDown={enterCommits(commitMin)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={maxId} className={styles.label}>
            Lightness max
          </label>
          <input
            id={maxId}
            type="number"
            min={0}
            max={1}
            step={0.01}
            className={styles.input}
            value={draft.rangeMax}
            onChange={(e) => setDraft((d) => ({ ...d, rangeMax: e.target.value }))}
            onBlur={commitMax}
            onKeyDown={enterCommits(commitMax)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={distId} className={styles.label}>
            Distribution
          </label>
          <select
            id={distId}
            className={styles.select}
            value={value.distribution}
            onChange={handleDistribution}
          >
            <option value="linear">Linear</option>
            <option value="eased">Eased</option>
          </select>
        </div>
      </div>
    </fieldset>
  );
}
