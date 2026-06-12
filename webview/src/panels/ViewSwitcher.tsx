import { postMessage } from '../vscodeApi';

/** In-graph view switcher — works when editor title bar icons are hidden (e.g. Cursor). */
export function ViewSwitcher() {
  return (
    <div className="view-switcher" role="toolbar" aria-label="Editor view">
      <button
        type="button"
        className="view-switcher-btn"
        onClick={() => postMessage({ type: 'openSource' })}
      >
        XML Source
      </button>
      <button
        type="button"
        className="view-switcher-btn"
        onClick={() => postMessage({ type: 'openGraphSide' })}
        title="Open graph beside XML (Ctrl+K V)"
      >
        Graph beside
      </button>
    </div>
  );
}
