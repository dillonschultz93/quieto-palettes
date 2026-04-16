import { useEffect, useRef, useState } from 'react';
import type { Ramp, RampStep } from '@quieto/engine';
import { SwatchItem, type HighlightState } from './SwatchItem';
import { useContrast } from '../hooks/useContrast';
import { useHover } from '../hooks/useHover';
import styles from './RampView.module.css';

type RampViewProps = {
  ramp: Ramp;
};

function classifyContrast(
  contrastMap: ReturnType<typeof useContrast>,
  hoveredId: string | null,
  step: RampStep,
): HighlightState {
  if (!hoveredId) return 'none';
  if (hoveredId === step.id) return 'active';
  const result = contrastMap.get(hoveredId)?.get(step.id);
  if (!result) return 'none';
  if (result.aaa) return 'aaa';
  if (result.aa) return 'aa';
  return 'fail';
}

function buildAnnouncement(
  contrastMap: ReturnType<typeof useContrast>,
  hoveredId: string | null,
  ramp: Ramp,
): string {
  if (!hoveredId) return '';
  const indexById = new Map(ramp.steps.map((s, i) => [s.id, i + 1]));
  const focused = ramp.steps.find((s) => s.id === hoveredId);
  if (!focused) return '';

  const aaaSteps: number[] = [];
  const aaSteps: number[] = [];
  const failSteps: number[] = [];
  for (const other of ramp.steps) {
    if (other.id === focused.id) continue;
    const result = contrastMap.get(focused.id)?.get(other.id);
    if (!result) continue;
    const stepNum = indexById.get(other.id)!;
    if (result.aaa) aaaSteps.push(stepNum);
    else if (result.aa) aaSteps.push(stepNum);
    else failSteps.push(stepNum);
  }

  const focusedNum = indexById.get(focused.id);
  const parts = [`Step ${focusedNum}, ${focused.hex}`];
  if (aaaSteps.length) parts.push(`AAA with steps ${aaaSteps.join(', ')}`);
  if (aaSteps.length) parts.push(`AA with steps ${aaSteps.join(', ')}`);
  if (failSteps.length) parts.push(`fails with steps ${failSteps.join(', ')}`);
  return parts.join('; ');
}

export function RampView({ ramp }: RampViewProps) {
  const contrastMap = useContrast(ramp);
  const { hoveredStepId, setHoveredStepId } = useHover();

  // Reset hover state when ramp changes (e.g., seed color updated)
  useEffect(() => {
    setHoveredStepId(null);
  }, [ramp.steps]);

  const announcement = buildAnnouncement(contrastMap, hoveredStepId, ramp);

  // Debounce SR announcements to avoid thrashing on rapid hover
  const [debouncedAnnouncement, setDebouncedAnnouncement] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!announcement) {
      setDebouncedAnnouncement('');
      return;
    }
    timerRef.current = setTimeout(() => {
      setDebouncedAnnouncement(announcement);
    }, 150);
    return () => clearTimeout(timerRef.current);
  }, [announcement]);

  return (
    <div className={styles.rampWrapper}>
      <ul
        role="list"
        aria-label={ramp.name ? `Color ramp: ${ramp.name}` : 'Color ramp'}
        className={styles.ramp}
        onMouseLeave={(e) => {
          // Don't clear if a swatch still has keyboard focus
          if (!e.currentTarget.contains(document.activeElement)) {
            setHoveredStepId(null);
          }
        }}
        onBlur={(e) => {
          const related = e.relatedTarget;
          if (related instanceof Node && e.currentTarget.contains(related)) {
            return; // Focus moved between swatches within the ramp
          }
          // Only clear if window still has focus (ignore window-level blur)
          if (document.hasFocus()) {
            setHoveredStepId(null);
          }
        }}
      >
        {ramp.steps.map((step, index) => (
          <SwatchItem
            key={step.id}
            step={step}
            index={index}
            highlightState={classifyContrast(contrastMap, hoveredStepId, step)}
            onHover={setHoveredStepId}
            onFocus={setHoveredStepId}
          />
        ))}
      </ul>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      >
        {debouncedAnnouncement}
      </div>
    </div>
  );
}
