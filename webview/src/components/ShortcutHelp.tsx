import { useEffect, useRef } from 'react';
import { SHORTCUT_ROWS } from './shortcutData';

interface ShortcutHelpProps {
  onClose: () => void;
}

export function ShortcutHelp({ onClose }: ShortcutHelpProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Modal dialog: take focus on open, give it back on close.
  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Keep graph hotkeys from firing underneath the dialog.
    e.stopPropagation();
    if (e.key === 'Escape' || e.key === '?') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      // Only the close button is focusable: keep Tab inside the dialog.
      e.preventDefault();
      closeRef.current?.focus();
    }
  };

  return (
    <div className="shortcut-help-backdrop" role="presentation" onClick={onClose}>
      <div
        className="shortcut-help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header className="shortcut-help-header">
          <h2 id="shortcut-help-title">Keyboard shortcuts</h2>
          <button
            ref={closeRef}
            type="button"
            className="shortcut-help-close"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
          >
            ×
          </button>
        </header>
        <table className="shortcut-help-table">
          <thead>
            <tr>
              <th scope="col">Action</th>
              <th scope="col">Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUT_ROWS.map((row) => (
              <tr key={row.action}>
                <td>{row.action}</td>
                <td>
                  <kbd>{row.shortcut}</kbd>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="shortcut-help-hint">
          Press <kbd>?</kbd> or Escape to close.
        </p>
      </div>
    </div>
  );
}
