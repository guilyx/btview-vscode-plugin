import { useEffect } from 'react';
import { useGraphContext } from './graphContext';
import { btNodeDataToPayload } from '../utils/subtreeClipboard';
import { postMessage } from '../vscodeApi';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function useGraphHotkeys(): void {
  const {
    selectedNode,
    setSelectedNode,
    setSearchQuery,
    setLegendVisible,
    legendVisible,
    setPortsVisible,
    portsVisible,
    deleteSelected,
    requestRename,
    fitViewRef,
    treeId,
    clipboardSubtree,
    setClipboardSubtree,
    findNodeSubtree,
  } = useGraphContext();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        return;
      }

      const mod = e.ctrlKey || e.metaKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode) {
          e.preventDefault();
          deleteSelected();
        }
        return;
      }

      if (e.key === 'Escape') {
        setSelectedNode(null);
        return;
      }

      if (e.key === 'F2' && selectedNode && !selectedNode.staged) {
        e.preventDefault();
        requestRename(selectedNode.path);
        return;
      }

      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        postMessage({ type: 'undo' });
        return;
      }

      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        postMessage({ type: 'redo' });
        return;
      }

      if (mod && e.key === 'f') {
        e.preventDefault();
        const el = document.getElementById('btview-node-search') as HTMLInputElement | null;
        el?.focus();
        return;
      }

      if (mod && e.key === '0') {
        e.preventDefault();
        fitViewRef.current?.();
        return;
      }

      if (mod && e.shiftKey && e.key === 'g') {
        e.preventDefault();
        setLegendVisible(!legendVisible);
        return;
      }

      if (mod && e.altKey && e.key === 'p') {
        e.preventDefault();
        setPortsVisible(!portsVisible);
        return;
      }

      if (mod && e.key === 'c' && selectedNode && !selectedNode.staged) {
        e.preventDefault();
        const subtree = findNodeSubtree(selectedNode.path);
        if (subtree) {
          setClipboardSubtree(subtree);
        }
        return;
      }

      if (
        mod &&
        e.key === 'x' &&
        selectedNode &&
        !selectedNode.staged &&
        selectedNode.path !== '0'
      ) {
        e.preventDefault();
        const subtree = findNodeSubtree(selectedNode.path);
        if (subtree) {
          setClipboardSubtree(subtree);
        }
        postMessage({ type: 'deleteNode', treeId, path: selectedNode.path });
        setSelectedNode(null);
        return;
      }

      if (mod && e.key === 'v' && clipboardSubtree) {
        e.preventDefault();
        const parentPath = selectedNode?.path && !selectedNode.staged ? selectedNode.path : '0';
        postMessage({
          type: 'pasteSubtree',
          treeId,
          parentPath,
          subtree: btNodeDataToPayload(clipboardSubtree),
        });
        return;
      }

      if (
        mod &&
        e.key === 'd' &&
        selectedNode &&
        !selectedNode.staged &&
        selectedNode.path !== '0'
      ) {
        e.preventDefault();
        const subtree = findNodeSubtree(selectedNode.path);
        if (subtree) {
          const parentPath = selectedNode.path.includes('-')
            ? selectedNode.path.replace(/-[^-]+$/, '')
            : '0';
          postMessage({
            type: 'pasteSubtree',
            treeId,
            parentPath,
            subtree: btNodeDataToPayload(subtree),
          });
        }
        return;
      }

      if (mod && e.shiftKey && e.key === 'l') {
        e.preventDefault();
        postMessage({ type: 'resetLayout', treeId });
        return;
      }

      if (e.altKey && e.key === 'Enter' && selectedNode && !selectedNode.staged) {
        e.preventDefault();
        postMessage({ type: 'goToSource', path: selectedNode.path });
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    selectedNode,
    setSelectedNode,
    setSearchQuery,
    setLegendVisible,
    legendVisible,
    setPortsVisible,
    portsVisible,
    deleteSelected,
    requestRename,
    fitViewRef,
    treeId,
    clipboardSubtree,
    setClipboardSubtree,
    findNodeSubtree,
  ]);
}
