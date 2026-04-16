import { useEffect, useRef, useState } from 'react';
import { parseColor } from '@quieto/engine';
import type { ParsedColor } from '@quieto/engine';
import styles from './SeedInput.module.css';

type SeedInputProps = {
  onColorParsed: (parsed: ParsedColor, id?: string) => void;
  initialValue?: string;
  id?: string;
  ariaLabel?: string;
  externalError?: string;
};

function oklchToCss(oklch: { l: number; c: number; h: number }): string {
  return `oklch(${oklch.l} ${oklch.c} ${oklch.h})`;
}

export function SeedInput({
  onColorParsed,
  initialValue,
  id,
  ariaLabel,
  externalError,
}: SeedInputProps) {
  const [value, setValue] = useState(initialValue ?? '');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedColor | null>(null);
  const lastSubmitted = useRef('');
  const didAutoSubmitRef = useRef(false);

  const onColorParsedRef = useRef(onColorParsed);
  onColorParsedRef.current = onColorParsed;

  useEffect(() => {
    if (didAutoSubmitRef.current) return;
    const trimmed = (initialValue ?? '').trim();
    if (!trimmed) return;
    didAutoSubmitRef.current = true;
    lastSubmitted.current = trimmed;
    const result = parseColor(trimmed);
    if (result.ok) {
      setPreview(result.value);
      onColorParsedRef.current(result.value, id);
    } else {
      setError(result.error.message);
      setPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue, id]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === lastSubmitted.current) return;

    lastSubmitted.current = trimmed;
    const result = parseColor(trimmed);
    if (result.ok) {
      setError(null);
      setPreview(result.value);
      onColorParsed(result.value, id);
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

  const errorId = id ? `seed-input-error-${id}` : 'seed-input-error';
  const displayedError = error ?? externalError ?? null;

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
        aria-label={ariaLabel ?? 'Seed color input'}
        aria-describedby={displayedError ? errorId : undefined}
        aria-invalid={displayedError ? true : undefined}
      />
      {displayedError && (
        <p id={errorId} className={styles.error} role="alert">
          {displayedError}
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
