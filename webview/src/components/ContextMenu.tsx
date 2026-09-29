import { useEffect, useRef } from 'react';
import { useGraphContext } from '../commands/graphContext';
import { postMessage } from '../vscodeApi';
import { removeStagedNode } from '../graph/stagedNodes';
import { btNodeDataToPayload } from '../utils/subtreeClipboard';
import { nextMenuIndex } from '../utils/a11y';

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
    simpleMode,
  } = useGraphContext();

  useEffect(() => {
    // Remember what had focus so closing the menu (Escape / Tab / action) returns there.
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [onClose]);

  const menuItems = (): HTMLButtonElement[] =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);

  // Focus the first enabled item when the menu opens (keyboard and mouse alike).
  useEffect(() => {
    menuItems()
      .find((el) => el.getAttribute('aria-disabled') !== 'true')
      ?.focus();
  }, []);

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keep keys inside the menu away from the global graph hotkeys.
    e.stopPropagation();
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      onClose();
      return;
    }
    const els = menuItems();
    const current = els.indexOf(document.activeElement as HTMLButtonElement);
    const next = nextMenuIndex(
      els.map((el) => el.getAttribute('aria-disabled') === 'true'),
      current,
      e.key,
    );
    if (next !== null) {
      e.preventDefault();
      els[next]?.focus();
    }
  };

  const items: MenuItem[] = [];
  const menuLabel =
    target.kind === 'canvas'
      ? 'Canvas actions'
      : `Actions for ${target.node.instanceName ?? target.node.registeredId}`;

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
    );
    if (!simpleMode) {
      items.push({
        label: 'Export workspace config',
        action: () => postMessage({ type: 'exportWorkspaceConfig' }),
      });
    }
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
    );

    if (!simpleMode) {
      items.push({
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
      });
    }

    items.push({
      label: 'Go to XML source',
      shortcut: 'Alt+Enter',
      action: () => postMessage({ type: 'goToSource', path: node.path }),
    });

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
      aria-label={menuLabel}
      aria-orientation="vertical"
      onKeyDown={onMenuKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className="context-menu-item"
          role="menuitem"
          tabIndex={-1}
          // aria-disabled (not `disabled`) keeps items discoverable while arrowing through.
          aria-disabled={item.disabled || undefined}
          onClick={() => {
            if (item.disabled) {
              return;
            }
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
