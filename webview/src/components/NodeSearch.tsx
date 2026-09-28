import { useEffect, useMemo, useState } from 'react';
import { useGraphContext } from '../commands/graphContext';
import { collectSearchMatches } from '../utils/searchMatches';

export function NodeSearch() {
  const { doc, searchQuery, setSearchQuery, selectPath } = useGraphContext();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeTree = doc.trees.find((t) => t.id === doc.activeTreeId) ?? doc.trees[0];
  const matches = useMemo(
    () => collectSearchMatches(activeTree?.root ?? null, searchQuery),
    [activeTree?.root, searchQuery],
  );

  useEffect(() => {
    setActiveIndex(null);
  }, [searchQuery, doc.activeTreeId]);

  const step = (dir: 1 | -1) => {
    if (matches.length === 0) {
      return;
    }
    const next =
      activeIndex == null
        ? dir === 1
          ? 0
          : matches.length - 1
        : (activeIndex + dir + matches.length) % matches.length;
    setActiveIndex(next);
    selectPath(matches[next]!);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      step(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      e.currentTarget.blur();
    }
  };

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div className="node-search">
      <input
        id="btview-node-search"
        type="search"
        placeholder="Search nodes… (Ctrl+F)"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Search nodes"
        title="Enter: next match · Shift+Enter: previous · Esc: clear"
      />
      {hasQuery && (
        <span
          className={`node-search-count ${matches.length === 0 ? 'no-match' : ''}`}
          aria-live="polite"
        >
          {matches.length === 0
            ? 'No matches'
            : activeIndex == null
              ? `${matches.length} match${matches.length === 1 ? '' : 'es'}`
              : `${activeIndex + 1}/${matches.length}`}
        </span>
      )}
    </div>
  );
}
