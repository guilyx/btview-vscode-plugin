import { useEffect, useRef } from 'react';
import { useGraphContext } from '../commands/graphContext';
import { postMessage } from '../vscodeApi';
import { removeStagedNode } from '../graph/stagedNodes';
import { btNodeDataToPayload } from '../utils/subtreeClipboard';

export type ContextTarget =
  | { kind: 'canvas' }
  | { kind: 'node'; node: import('../graph/layout').FlowNodeData }
  | { kind: 'staged'; node: import('../graph/layout').FlowNodeData };

interface ContextMenuProps {
  target: ContextTarget;
  x: number;
  y: number;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  action: () => void;
}

export function ContextMenu({ target, x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    treeId,
    setSelectedNode,
    setLegendVisible,
    legendVisible,
    setPortsVisible,
    portsVisible,
    deleteSelected,
    requestRename,
    fitViewRef,
    clipboardSubtree,
    findNodeSubtree,
    setClipboardSubtree,
    pushDrill,
  } = useGraphContext();

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const items: MenuItem[] = [];

  if (target.kind === 'canvas') {
    items.push(
      {
        label: 'Fit view',
        shortcut: 'Ctrl+0',
        action: () => fitViewRef.current?.(),
      },
      {
        label: legendVisible ? 'Hide color legend' : 'Show color legend',
        shortcut: 'Ctrl+Shift+G',
        action: () => setLegendVisible(!legendVisible),
      },
      {
        label: portsVisible ? 'Hide port labels' : 'Show port labels',
        shortcut: 'Ctrl+Alt+P',
        action: () => setPortsVisible(!portsVisible),
      },
      {
        label: 'Paste subtree',
        shortcut: 'Ctrl+V',
        disabled: !clipboardSubtree,
        action: () => {
          if (clipboardSubtree) {
            postMessage({
              type: 'pasteSubtree',
              treeId,
              parentPath: '0',
              subtree: btNodeDataToPayload(clipboardSubtree),
            });
          }
        },
      },
      {
        label: 'Reset layout',
        shortcut: 'Ctrl+Shift+L',
        action: () => postMessage({ type: 'resetLayout', treeId }),
      },
      {
        label: 'Export workspace config',
        action: () => postMessage({ type: 'exportWorkspaceConfig' }),
      },
    );
  } else if (target.kind === 'staged') {
    items.push(
      {
        label: 'Delete staged node',
        shortcut: 'Del',
        action: () => {
          removeStagedNode(treeId, target.node.path);
          setSelectedNode(null);
        },
      },
      {
        label: 'Cancel',
        shortcut: 'Esc',
        action: () => setSelectedNode(null),
      },
    );
  } else {
    const node = target.node;
    const canDelete = node.path !== '0';
    const canAddChild = node.kind === 'control' || node.kind === 'decorator';

    items.push(
      {
        label: 'Inspect',
        shortcut: 'Enter',
        action: () => setSelectedNode(node),
      },
      {
        label: 'Rename',
        shortcut: 'F2',
        disabled: node.staged,
        action: () => {
          setSelectedNode(node);
          requestRename(node.path);
        },
      },
      {
        label: 'Delete',
        shortcut: 'Del',
        disabled: !canDelete,
        action: deleteSelected,
      },
      {
        label: 'Copy subtree',
        shortcut: 'Ctrl+C',
        action: () => {
          const subtree = findNodeSubtree(node.path);
          if (subtree) {
            setClipboardSubtree(subtree);
          }
        },
      },
      {
        label: 'Cut subtree',
        shortcut: 'Ctrl+X',
        disabled: !canDelete,
        action: () => {
          const subtree = findNodeSubtree(node.path);
          if (subtree) {
            setClipboardSubtree(subtree);
          }
          postMessage({ type: 'deleteNode', treeId, path: node.path });
          setSelectedNode(null);
        },
      },
      {
        label: 'Go to XML source',
        shortcut: 'Alt+Enter',
        action: () => postMessage({ type: 'goToSource', path: node.path }),
      },
    );

    if (node.kind === 'subtree') {
      items.push({
        label: 'Open subtree',
        action: () => pushDrill(node.registeredId),
      });
    }

    if (canAddChild) {
      items.push({
        label: 'Add child (use palette)',
        disabled: true,
        action: () => undefined,
      });
    }
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className="context-menu-item"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            item.action();
            onClose();
          }}
        >
          <span>{item.label}</span>
          {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
        </button>
      ))}
    </div>
  );
}
