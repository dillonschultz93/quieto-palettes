import { useMemo, useRef, useState } from 'react';
import { exportCSS } from '@quieto/engine';
import type { Palette } from '@quieto/engine';
import styles from './ExportPanel.module.css';

type ExportPanelProps = {
  palette: Palette;
};

export function ExportPanel({ palette }: ExportPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const codeRef = useRef<HTMLElement | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const result = useMemo(() => exportCSS(palette, { naming: 'numeric' }), [palette]);
  const cssString = result.ok ? result.value : '';

  const handleCopy = async () => {
    if (!result.ok) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(cssString);
      } else if (codeRef.current) {
        const range = document.createRange();
        range.selectNodeContents(codeRef.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setCopyStatus('Copied!');
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyStatus(''), 1500);
    } catch {
      setCopyStatus('Copy failed');
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyStatus(''), 1500);
    }
  };

  const handleDownload = () => {
    if (!result.ok) return;
    const blob = new Blob([cssString], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'palette.css';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isOpen}
        aria-controls="export-panel-content"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Export CSS
      </button>

      {isOpen && (
        <div id="export-panel-content" className={styles.panel}>
          {result.ok ? (
            <>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.action}
                  aria-label="Copy CSS to clipboard"
                  onClick={handleCopy}
                >
                  {copyStatus === 'Copied!' ? 'Copied!' : 'Copy'}
                </button>
                <button
                  type="button"
                  className={styles.action}
                  aria-label="Download CSS file"
                  onClick={handleDownload}
                >
                  Download
                </button>
              </div>
              <pre className={styles.code}>
                <code
                  ref={codeRef}
                  aria-label="Generated CSS custom properties"
                >
                  {cssString}
                </code>
              </pre>
            </>
          ) : (
            <p className={styles.error} role="alert">
              {result.error.message}
            </p>
          )}
        </div>
      )}

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      >
        {copyStatus}
      </div>
    </div>
  );
}
