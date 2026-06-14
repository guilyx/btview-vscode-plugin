import { useMemo, useState } from 'react';
import type { SerializedDocument } from '../types';
import { dispatchStageNode } from '../graph/stageNodeEvent';

export const BTVIEW_NODE_DRAG = 'application/btview-node';

export interface PaletteDragPayload {
  id: string;
  kind: string;
}

interface NodePaletteSidebarProps {
  doc: SerializedDocument;
}

const KIND_ORDER = ['control', 'decorator', 'action', 'condition', 'subtree', 'script'] as const;

const KIND_LABELS: Record<string, string> = {
  control: 'Controls',
  decorator: 'Decorators',
  action: 'Actions',
  condition: 'Conditions',
  subtree: 'Subtrees',
  script: 'Scripts',
  model: 'From model',
};

function paletteEntries(doc: SerializedDocument): { id: string; kind: string; source: string }[] {
  const seen = new Set<string>();
  const entries: { id: string; kind: string; source: string }[] = [];

  const add = (id: string, kind: string, source: string) => {
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    entries.push({ id, kind, source });
  };

  for (const e of doc.nodePalette ?? []) {
    add(e.id, e.kind, 'builtin');
  }
  for (const m of doc.models) {
    add(m.id, m.kind, 'model');
  }

  return entries;
}

export function NodePaletteSidebar({ doc }: NodePaletteSidebarProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = paletteEntries(doc);
    if (!q) {
      return all;
    }
    return all.filter((e) => e.id.toLowerCase().includes(q) || e.kind.toLowerCase().includes(q));
  }, [doc, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filtered>();
    for (const entry of filtered) {
      const key = entry.source === 'model' ? 'model' : entry.kind;
      const list = groups.get(key) ?? [];
      list.push(entry);
      groups.set(key, list);
    }
    return groups;
  }, [filtered]);

  const stageNode = (registeredId: string, kind: string) => {
    dispatchStageNode({ id: registeredId, kind });
  };

  const onDragStart = (e: React.DragEvent, entry: PaletteDragPayload) => {
    e.dataTransfer.setData(BTVIEW_NODE_DRAG, JSON.stringify(entry));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="palette-sidebar" aria-label="Node palette">
      <div className="palette-sidebar-header">
        <h2 className="palette-title">Nodes</h2>
        <input
          type="search"
          className="palette-search"
          placeholder="Search nodes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search node palette"
        />
        <p className="palette-hint">
          Drag onto canvas to place unconnected nodes, then connect with edge handles (parent bottom
          → child top).
        </p>
      </div>
      <div className="palette-scroll">
        {filtered.length === 0 && (
          <p className="palette-empty">No nodes match &quot;{query}&quot;</p>
        )}
        {[...KIND_ORDER, 'model'].map((kindKey) => {
          const entries = grouped.get(kindKey);
          if (!entries?.length) {
            return null;
          }
          return (
            <section key={kindKey} className="palette-section">
              <h3 className="palette-section-title">{KIND_LABELS[kindKey] ?? kindKey}</h3>
              <ul className="palette-list">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="palette-node"
                      draggable
                      onDragStart={(e) => onDragStart(e, { id: entry.id, kind: entry.kind })}
                      onClick={() => stageNode(entry.id, entry.kind)}
                      title={`Stage ${entry.id} (${entry.kind}) on canvas`}
                    >
                      <span className="palette-node-id">{entry.id}</span>
                      <span className="palette-node-kind">{entry.kind}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
