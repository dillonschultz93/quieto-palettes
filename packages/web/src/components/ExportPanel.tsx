import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { exportCSS } from '@quieto/engine';
import type { Palette } from '@quieto/engine';
import styles from './ExportPanel.module.css';

type ExportPanelProps = {
  palette: Palette;
};

type CopyScope = 'css' | 'link' | null;
type CopyStatus = { scope: CopyScope; text: string };

const EMPTY_STATUS: CopyStatus = { scope: null, text: '' };

export function ExportPanel({ palette }: ExportPanelProps) {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(EMPTY_STATUS);
  const codeRef = useRef<HTMLElement | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);

  const result = useMemo(() => exportCSS(palette, { naming: 'numeric' }), [palette]);
  const cssString = result.ok ? result.value : '';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!result.ok) console.error('[ExportPanel] exportCSS failed:', result.error);
  }, [result]);

  const announceStatus = (scope: Exclude<CopyScope, null>, text: string) => {
    if (!mountedRef.current) return;
    flushSync(() => setCopyStatus(EMPTY_STATUS));
    setCopyStatus({ scope, text });
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setCopyStatus(EMPTY_STATUS);
    }, 1500);
  };

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
        const copied = document.execCommand?.('copy') ?? false;
        selection?.removeAllRanges();
        if (!copied) throw new Error('execCommand copy failed');
      } else {
        throw new Error('No clipboard mechanism available');
      }
      announceStatus('css', 'Copied!');
    } catch {
      announceStatus('css', 'Copy failed');
    }
  };

  const handleCopyLink = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('input');
        ta.readOnly = true;
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        try {
          ta.select();
          const copied = document.execCommand?.('copy') ?? false;
          if (!copied) throw new Error('execCommand copy failed');
        } finally {
          document.body.removeChild(ta);
        }
      }
      announceStatus('link', 'Copied link!');
    } catch {
      announceStatus('link', 'Copy link failed');
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
    try {
      a.click();
    } finally {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const cssLabel =
    copyStatus.scope === 'css'
      ? copyStatus.text === 'Copied!'
        ? 'Copied!'
        : 'Failed'
      : 'Copy';

  const linkLabel =
    copyStatus.scope === 'link'
      ? copyStatus.text === 'Copied link!'
        ? 'Copied link!'
        : 'Failed'
      : 'Copy Link';

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Export CSS
      </button>

      {isOpen && (
        <div id={panelId} className={styles.panel}>
          {result.ok ? (
            <>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.action}
                  aria-label="Copy CSS to clipboard"
                  onClick={handleCopy}
                >
                  {cssLabel}
                </button>
                <button
                  type="button"
                  className={styles.action}
                  aria-label="Download CSS file"
                  onClick={handleDownload}
                >
                  Download
                </button>
                <button
                  type="button"
                  className={styles.action}
                  aria-label="Copy shareable link to clipboard"
                  onClick={handleCopyLink}
                >
                  {linkLabel}
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
              Could not generate CSS. Please try a different color.
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
        {copyStatus.text}
      </div>
    </div>
  );
}
