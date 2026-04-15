import type { RampStep } from '@quieto/engine';
import styles from './SwatchItem.module.css';

export type HighlightState = 'none' | 'active' | 'aaa' | 'aa' | 'fail';

type SwatchItemProps = {
  step: RampStep;
  index: number;
  highlightState?: HighlightState;
  onHover?: (id: string | null) => void;
  onFocus?: (id: string) => void;
};

export function SwatchItem({
  step,
  index,
  highlightState = 'none',
  onHover,
  onFocus,
}: SwatchItemProps) {
  const textTone = step.oklch.l > 0.6 ? 'dark' : 'light';
  const stepNumber = index + 1;
  const label = step.isSeed
    ? `Step ${stepNumber}: ${step.hex}, seed color`
    : `Step ${stepNumber}: ${step.hex}`;

  return (
    <li
      role="listitem"
      tabIndex={0}
      className={styles.swatch}
      style={{ backgroundColor: step.hex }}
      data-seed={step.isSeed ? 'true' : 'false'}
      data-text-tone={textTone}
      data-highlight={highlightState}
      data-l={step.oklch.l.toFixed(3)}
      aria-label={label}
      onMouseEnter={onHover ? () => onHover(step.id) : undefined}
      onFocus={onFocus ? () => onFocus(step.id) : undefined}
    >
      <span className={styles.hex}>{step.hex}</span>
      {step.isSeed && <span className={styles.seedBadge}>seed</span>}
    </li>
  );
}
