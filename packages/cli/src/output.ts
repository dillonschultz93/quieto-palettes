import { exportCSS, exportJSON } from '@quieto/engine';
import type { Palette, CssExportOptions, ColorError, Result } from '@quieto/engine';

export function formatCSS(palette: Palette, options: CssExportOptions): Result<string, ColorError> {
  return exportCSS(palette, options);
}

export function formatJSON(palette: Palette): Result<string, ColorError> {
  return exportJSON(palette);
}
