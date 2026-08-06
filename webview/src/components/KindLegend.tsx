import { useEffect, useState } from 'react';
import { KIND_COLORS, KIND_LABELS, KIND_ORDER, kindGlyph } from '../nodes/kindStyles';

const STORAGE_KEY = 'btview.legendCollapsed';

interface KindLegendProps {
  visible: boolean;
  onToggle: () => void;
}

export function KindLegend({ visible, onToggle }: KindLegendProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`kind-legend ${collapsed ? 'collapsed' : ''}`}
      role="region"
      aria-label="Node kind legend"
    >
      <div className="kind-legend-header">
        <span>Node kinds</span>
        <button
          type="button"
          className="kind-legend-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          {collapsed ? '▸' : '▾'}
        </button>
        <button
          type="button"
          className="kind-legend-close"
          onClick={onToggle}
          aria-label="Hide legend"
        >
          ×
        </button>
      </div>
      {!collapsed && (
        <ul className="kind-legend-list">
          {KIND_ORDER.map((kind) => (
            <li key={kind}>
              <span className="kind-swatch" style={{ background: KIND_COLORS[kind] }}>
                {kindGlyph(kind)}
              </span>
              <span>{KIND_LABELS[kind] ?? kind}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
