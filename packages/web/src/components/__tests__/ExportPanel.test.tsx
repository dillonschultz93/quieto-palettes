import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { generateRamp, parseColor } from '@quieto/engine';
import type { Palette, Ramp } from '@quieto/engine';
import { ExportPanel } from '../ExportPanel';

function buildRamp(input: string): Ramp {
  const parsed = parseColor(input);
  if (!parsed.ok) throw new Error('fixture parse failed');
  const ramp = generateRamp({
    seed: parsed.value.oklch,
    steps: 10,
    range: { min: 0.05, max: 0.97 },
    distribution: 'linear',
    name: 'color',
  });
  if (!ramp.ok) throw new Error('fixture generate failed');
  return ramp.value;
}

function buildPalette(input = '#2563EB'): Palette {
  return { ramps: [buildRamp(input)] };
}

describe('ExportPanel', () => {
  it('renders an Export CSS button collapsed by default', () => {
    render(<ExportPanel palette={buildPalette()} />);
    const button = screen.getByRole('button', { name: /export css/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText(/generated css/i)).toBeNull();
  });

  it('toggles the panel open when clicked', () => {
    render(<ExportPanel palette={buildPalette()} />);
    const button = screen.getByRole('button', { name: /export css/i });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText(/generated css/i)).toBeInTheDocument();
  });

  it('displays CSS containing --color-color-50 through --color-color-900', () => {
    render(<ExportPanel palette={buildPalette()} />);
    fireEvent.click(screen.getByRole('button', { name: /export css/i }));
    const code = screen.getByLabelText(/generated css/i);
    const text = code.textContent ?? '';
    expect(text).toContain(':root {');
    for (const step of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
      expect(text).toContain(`--color-color-${step}:`);
    }
  });

  it('closes the panel when toggled again', () => {
    render(<ExportPanel palette={buildPalette()} />);
    const button = screen.getByRole('button', { name: /export css/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText(/generated css/i)).toBeNull();
  });

  describe('copy button', () => {
    const writeText = vi.fn();

    beforeEach(() => {
      writeText.mockReset().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('copies the generated CSS string to the clipboard', async () => {
      render(<ExportPanel palette={buildPalette()} />);
      fireEvent.click(screen.getByRole('button', { name: /export css/i }));
      const copy = screen.getByRole('button', { name: /copy css to clipboard/i });
      await act(async () => {
        fireEvent.click(copy);
        await Promise.resolve();
      });
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(writeText.mock.calls[0]![0]).toContain('--color-color-50:');
    });

    it('shows "Copied!" feedback then reverts after 1.5s', async () => {
      render(<ExportPanel palette={buildPalette()} />);
      fireEvent.click(screen.getByRole('button', { name: /export css/i }));
      const copy = screen.getByRole('button', { name: /copy css to clipboard/i });
      await act(async () => {
        fireEvent.click(copy);
        await Promise.resolve();
      });
      expect(copy.textContent).toBe('Copied!');
      act(() => { vi.advanceTimersByTime(1500); });
      expect(copy.textContent).toBe('Copy');
    });
  });

  describe('download button', () => {
    it('creates a blob and triggers a download with palette.css filename', () => {
      const createObjectURL = vi.fn(() => 'blob:mock');
      const revokeObjectURL = vi.fn();
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

      const anchorClick = vi.fn();
      const originalCreate = document.createElement.bind(document);
      const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreate(tag) as HTMLElement;
        if (tag === 'a') {
          (el as HTMLAnchorElement).click = anchorClick;
        }
        return el;
      });

      try {
        render(<ExportPanel palette={buildPalette()} />);
        fireEvent.click(screen.getByRole('button', { name: /export css/i }));
        fireEvent.click(screen.getByRole('button', { name: /download css file/i }));

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        const blobArg = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
        expect(blobArg).toBeInstanceOf(Blob);
        expect(blobArg.type).toBe('text/css');
        expect(anchorClick).toHaveBeenCalledTimes(1);
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
      } finally {
        createSpy.mockRestore();
      }
    });
  });

  describe('copy link button', () => {
    const writeText = vi.fn();

    beforeEach(() => {
      writeText.mockReset().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });
    });

    it('copies window.location.href to clipboard', async () => {
      render(<ExportPanel palette={buildPalette()} />);
      fireEvent.click(screen.getByRole('button', { name: /export css/i }));
      const link = screen.getByRole('button', {
        name: /copy shareable link to clipboard/i,
      });
      await act(async () => {
        fireEvent.click(link);
        await Promise.resolve();
      });
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(writeText.mock.calls[0]![0]).toBe(window.location.href);
    });
  });

  it('has an accessible live region for copy feedback', () => {
    const { container } = render(<ExportPanel palette={buildPalette()} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toBeInTheDocument();
  });
});
