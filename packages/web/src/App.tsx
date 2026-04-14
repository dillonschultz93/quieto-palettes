import { useMemo, useState } from 'react';
import type { ParsedColor, Palette } from '@quieto/engine';
import { SeedInput } from './components/SeedInput';
import { RampView } from './components/RampView';
import { ExportPanel } from './components/ExportPanel';
import { usePalette } from './hooks/usePalette';
import styles from './App.module.css';

export function App() {
  const [parsedColor, setParsedColor] = useState<ParsedColor | null>(null);
  const { ramp, error } = usePalette(parsedColor);

  const palette = useMemo<Palette | null>(
    () => (ramp ? { ramps: [ramp] } : null),
    [ramp],
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Quieto</h1>
      <SeedInput onColorParsed={setParsedColor} />
      {error && (
        <p className={styles.error} role="alert">
          {error.message}
        </p>
      )}
      {ramp && <RampView ramp={ramp} />}
      {palette && <ExportPanel palette={palette} />}
    </div>
  );
}
