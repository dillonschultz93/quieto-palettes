import { useState } from 'react';
import type { ParsedColor } from '@quieto/engine';
import { SeedInput } from './components/SeedInput';
import styles from './App.module.css';

export function App() {
  const [parsedColor, setParsedColor] = useState<ParsedColor | null>(null);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Quieto</h1>
      <SeedInput onColorParsed={setParsedColor} />
      {parsedColor && (
        <div className={styles.rampPlaceholder}>
          Ramp visualization will appear here (Story 3.2)
        </div>
      )}
    </div>
  );
}
