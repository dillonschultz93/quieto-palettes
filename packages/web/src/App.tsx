import { useEffect, useMemo, useRef, useState } from 'react';
import { parseColor } from '@quieto/engine';
import type { ColorError, ParsedColor, Palette, Ramp } from '@quieto/engine';
import { SeedInput } from './components/SeedInput';
import { RampView } from './components/RampView';
import { ExportPanel } from './components/ExportPanel';
import { RampControls } from './components/RampControls';
import { DEFAULT_RAMP_CONFIG, usePalette } from './hooks/usePalette';
import type { RampConfig } from './hooks/usePalette';
import { useUrlState } from './hooks/useUrlState';
import styles from './App.module.css';

function errorMessage(error: ColorError): string {
  switch (error.code) {
    case 'INVALID_RANGE':
      return 'Lightness minimum must be less than maximum.';
    case 'SEED_OUT_OF_RANGE':
      return 'Seed lightness is outside the configured range. Widen the range or choose a different seed.';
    case 'INVALID_STEPS':
      return 'Step count must be a whole number between 2 and 60.';
    default:
      return error.message;
  }
}

export function App() {
  const { initialSeedHex, initialConfig, writeState } = useUrlState();
  const [parsedColor, setParsedColor] = useState<ParsedColor | null>(() => {
    if (!initialSeedHex) return null;
    const r = parseColor('#' + initialSeedHex);
    return r.ok ? r.value : null;
  });
  const [config, setConfig] = useState<RampConfig>(
    initialConfig ?? DEFAULT_RAMP_CONFIG,
  );
  const { ramp, error } = usePalette(parsedColor, config);

  const lastGoodRampRef = useRef<Ramp | null>(null);
  useEffect(() => {
    if (!parsedColor) {
      lastGoodRampRef.current = null;
      return;
    }
    if (ramp) lastGoodRampRef.current = ramp;
  }, [ramp, parsedColor]);
  const displayedRamp = ramp ?? (parsedColor ? lastGoodRampRef.current : null);

  const palette = useMemo<Palette | null>(
    () => (displayedRamp ? { ramps: [displayedRamp] } : null),
    [displayedRamp],
  );

  useEffect(() => {
    if (palette && ramp) writeState(palette);
  }, [palette, ramp, writeState]);

  const initialSeedValue = initialSeedHex ? `#${initialSeedHex}` : undefined;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Quieto</h1>
      <SeedInput
        onColorParsed={setParsedColor}
        initialValue={initialSeedValue}
      />
      <RampControls value={config} onChange={setConfig} />
      {error && (
        <p className={styles.error} role="alert">
          {errorMessage(error)}
        </p>
      )}
      {displayedRamp && <RampView ramp={displayedRamp} />}
      {palette && <ExportPanel palette={palette} />}
    </div>
  );
}
