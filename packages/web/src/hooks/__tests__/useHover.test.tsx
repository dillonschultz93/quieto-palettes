import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHover } from '../useHover';

describe('useHover', () => {
  it('starts with no hovered step', () => {
    const { result } = renderHook(() => useHover());
    expect(result.current.hoveredStepId).toBeNull();
  });

  it('sets hoveredStepId via setHoveredStepId', () => {
    const { result } = renderHook(() => useHover());
    act(() => result.current.setHoveredStepId('step-abc'));
    expect(result.current.hoveredStepId).toBe('step-abc');
  });

  it('clears hoveredStepId when set to null', () => {
    const { result } = renderHook(() => useHover());
    act(() => result.current.setHoveredStepId('step-abc'));
    act(() => result.current.setHoveredStepId(null));
    expect(result.current.hoveredStepId).toBeNull();
  });
});
