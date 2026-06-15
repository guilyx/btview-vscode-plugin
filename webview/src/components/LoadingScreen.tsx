/** Branded splash shown while the behavior tree document is loading. */

interface LoadingScreenProps {
  /** Shown under the progress bar (e.g. boot vs waiting for host). */
  subtitle?: string;
}

export function LoadingScreen({ subtitle = 'Loading behavior tree…' }: LoadingScreenProps) {
  return (
    <div className="btview-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="btview-loader-logo" aria-hidden="true">
        <svg viewBox="0 0 128 128" width="72" height="72" className="btview-loader-tree">
          <circle className="btview-loader-node btview-loader-node-root" cx="64" cy="24" r="12" />
          <circle className="btview-loader-node btview-loader-node-left" cx="36" cy="64" r="10" />
          <circle className="btview-loader-node btview-loader-node-right" cx="92" cy="64" r="10" />
          <circle className="btview-loader-node btview-loader-node-leaf" cx="64" cy="104" r="10" />
          <line x1="64" y1="36" x2="36" y2="54" className="btview-loader-edge" />
          <line x1="64" y1="36" x2="92" y2="54" className="btview-loader-edge" />
          <line x1="36" y1="74" x2="64" y2="94" className="btview-loader-edge" />
          <line x1="92" y1="74" x2="64" y2="94" className="btview-loader-edge" />
        </svg>
      </div>
      <p className="btview-loader-title">BTView</p>
      <div className="btview-loader-bar" aria-hidden="true">
        <div className="btview-loader-bar-fill" />
      </div>
      <p className="btview-loader-subtitle">{subtitle}</p>
    </div>
  );
}
