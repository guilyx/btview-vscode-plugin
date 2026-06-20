import { SHORTCUT_ROWS } from './shortcutData';

interface ShortcutHelpProps {
  onClose: () => void;
}

export function ShortcutHelp({ onClose }: ShortcutHelpProps) {
  return (
    <div className="shortcut-help-backdrop" role="presentation" onClick={onClose}>
      <div
        className="shortcut-help-dialog"
        role="dialog"
        aria-labelledby="shortcut-help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shortcut-help-header">
          <h2 id="shortcut-help-title">Keyboard shortcuts</h2>
          <button type="button" className="shortcut-help-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <table className="shortcut-help-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Shortcut</th>
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
        <p className="shortcut-help-hint">Press <kbd>?</kbd> or Escape to close.</p>
      </div>
    </div>
  );
}
