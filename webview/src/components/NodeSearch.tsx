import { useGraphContext } from '../commands/graphContext';

export function NodeSearch() {
  const { searchQuery, setSearchQuery } = useGraphContext();

  return (
    <div className="node-search">
      <input
        id="btview-node-search"
        type="search"
        placeholder="Search nodes… (Ctrl+F)"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="Search nodes"
      />
    </div>
  );
}
