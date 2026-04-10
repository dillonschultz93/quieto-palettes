import { useState } from 'react';

export type UseHoverResult = {
  hoveredStepId: string | null;
  setHoveredStepId: (id: string | null) => void;
};

/**
 * Lightweight hover state hook for the ramp container.
 * Tracks which step.id (if any) is currently being hovered or focused.
 * Lifted to the nearest common ancestor of the swatches so onMouseLeave
 * can be placed on the container (not individual swatches), avoiding the
 * flicker that would otherwise happen when moving between siblings.
 */
export function useHover(): UseHoverResult {
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);
  return { hoveredStepId, setHoveredStepId };
}
