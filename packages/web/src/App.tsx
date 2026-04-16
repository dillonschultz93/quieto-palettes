import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseColor } from '@quieto/engine';
import type { ColorError, ParsedColor, Palette } from '@quieto/engine';
import { SeedList } from './components/SeedList';
import type { SeedRow } from './components/SeedList';
import { PaletteView } from './components/PaletteView';
import { ExportPanel } from './components/ExportPanel';
import { RampControls } from './components/RampControls';
import { DEFAULT_RAMP_CONFIG, usePalettes } from './hooks/usePalettes';
import type { RampConfig } from './hooks/usePalettes';
import { useUrlState } from './hooks/useUrlState';
import styles from './App.module.css';

export const MAX_SEEDS = 3;

type AppSeed = {
  id: string;
  initialHex: string | null;
  parsed: ParsedColor | null;
};

function newSeedId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `seed-${Math.random().toString(36).slice(2, 11)}`;
}

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

function hydrateFromSeeds(initialSeeds: string[]): AppSeed[] {
  const capped = initialSeeds.slice(0, MAX_SEEDS);
  if (capped.length === 0) {
    return [{ id: newSeedId(), initialHex: null, parsed: null }];
  }
  return capped.map((hex) => {
    const r = parseColor('#' + hex);
    return {
      id: newSeedId(),
      initialHex: hex,
      parsed: r.ok ? r.value : null,
    };
  });
}

export function App() {
  const { initialSeeds, initialConfig, writeState, clearHash } = useUrlState();
  const [seeds, setSeeds] = useState<AppSeed[]>(() =>
    hydrateFromSeeds(initialSeeds),
  );
  const [config, setConfig] = useState<RampConfig>(
    initialConfig ?? DEFAULT_RAMP_CONFIG,
  );

  const hookSeeds = useMemo(
    () => seeds.map((s) => ({ id: s.id, parsed: s.parsed })),
    [seeds],
  );
  const { palette, errors } = usePalettes(hookSeeds, config);

  // Last-good palette so config/seed errors don't unmount the view.
  const lastGoodPaletteRef = useRef<Palette | null>(null);
  const seedCountRef = useRef(seeds.length);
  useEffect(() => {
    const anyParsed = seeds.some((s) => s.parsed !== null);
    if (!anyParsed) {
      lastGoodPaletteRef.current = null;
      seedCountRef.current = seeds.length;
      return;
    }
    if (seeds.length < seedCountRef.current) {
      lastGoodPaletteRef.current = null;
    }
    seedCountRef.current = seeds.length;
    if (palette) lastGoodPaletteRef.current = palette;
  }, [palette, seeds]);
  const anyParsed = seeds.some((s) => s.parsed !== null);
  const displayedPalette =
    palette ?? (anyParsed ? lastGoodPaletteRef.current : null);

  useEffect(() => {
    if (palette) {
      writeState(palette);
    } else if (!anyParsed) {
      clearHash();
    }
  }, [palette, anyParsed, writeState]);

  const perSeedCodes = new Set(['SEED_OUT_OF_RANGE']);
  const seedErrors = useMemo(() => {
    const result = new Map<string, ColorError>();
    for (const [id, err] of errors) {
      if (perSeedCodes.has(err.code)) result.set(id, err);
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);
  const firstConfigError = useMemo(() => {
    for (const [, err] of errors) {
      if (!perSeedCodes.has(err.code)) return err;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  const handleSeedParsed = useCallback((id: string, parsed: ParsedColor) => {
    setSeeds((prev) =>
      prev.map((s) => (s.id === id ? { ...s, parsed } : s)),
    );
  }, []);

  const handleAddSeed = useCallback(() => {
    setSeeds((prev) => {
      if (prev.length >= MAX_SEEDS) return prev;
      return [...prev, { id: newSeedId(), initialHex: null, parsed: null }];
    });
  }, []);

  const handleRemoveSeed = useCallback((id: string) => {
    setSeeds((prev) => {
      if (prev.length <= 1) {
        return [{ id: newSeedId(), initialHex: null, parsed: null }];
      }
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const seedRows: SeedRow[] = useMemo(
    () => seeds.map((s) => ({ id: s.id, initialHex: s.initialHex })),
    [seeds],
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Quieto</h1>
      <SeedList
        seeds={seedRows}
        seedErrors={seedErrors}
        onSeedParsed={handleSeedParsed}
        onAddSeed={handleAddSeed}
        onRemoveSeed={handleRemoveSeed}
        maxSeeds={MAX_SEEDS}
      />
      <RampControls value={config} onChange={setConfig} />
      {firstConfigError && (
        <p className={styles.error} role="alert">
          {errorMessage(firstConfigError)}
        </p>
      )}
      {displayedPalette && <PaletteView palette={displayedPalette} />}
      {displayedPalette && <ExportPanel palette={displayedPalette} />}
    </div>
  );
}
