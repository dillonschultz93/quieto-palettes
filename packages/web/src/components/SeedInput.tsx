import { useRef, useState } from 'react';
import { parseColor } from '@quieto/engine';
import type { ParsedColor } from '@quieto/engine';
import styles from './SeedInput.module.css';

type SeedInputProps = {
  onColorParsed: (parsed: ParsedColor) => void;
};

function oklchToCss(oklch: { l: number; c: number; h: number }): string {
  return `oklch(${oklch.l} ${oklch.c} ${oklch.h})`;
}

export function SeedInput({ onColorParsed }: SeedInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedColor | null>(null);
  const lastSubmitted = useRef('');

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === lastSubmitted.current) return;

    lastSubmitted.current = trimmed;
    const result = parseColor(trimmed);
    if (result.ok) {
      setError(null);
      setPreview(result.value);
      onColorParsed(result.value);
    } else {
      setError(result.error.message);
      setPreview(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    lastSubmitted.current = '';
    if (error) setError(null);
  };

  const errorId = 'seed-input-error';

  return (
    <div className={styles.wrapper}>
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleSubmit}
        placeholder="Paste a color (e.g., #2563EB)"
        aria-label="Seed color input"
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
      />
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
      {preview && (
        <div className={styles.previewRow}>
          <div
            className={styles.swatch}
            style={{ backgroundColor: oklchToCss(preview.oklch) }}
            aria-label={`Preview swatch: ${preview.original}`}
          />
          <span className={styles.format}>
            {preview.format.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
