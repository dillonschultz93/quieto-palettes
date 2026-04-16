import type { Palette } from '@quieto/engine';
import { RampView } from './RampView';
import styles from './PaletteView.module.css';

type PaletteViewProps = {
  palette: Palette;
};

export function PaletteView({ palette }: PaletteViewProps) {
  return (
    <div className={styles.stack}>
      {palette.ramps.map((ramp, index) => (
        <RampView key={`${ramp.name}-${index}`} ramp={ramp} />
      ))}
    </div>
  );
}
