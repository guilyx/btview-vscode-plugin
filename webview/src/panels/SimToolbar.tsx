import { useGraphContext } from '../commands/graphContext';

/** Offline simulation controls: step/play/pause/reset + live tick + blackboard readout. */
export function SimToolbar() {
  const {
    simStep,
    simReset,
    simPlay,
    simPause,
    simPlaying,
    simTick,
    simRootStatus,
    simBlackboard,
  } = useGraphContext();

  const bbEntries = Object.entries(simBlackboard);
  const active = simTick > 0;

  return (
    <div className="sim-toolbar" role="group" aria-label="Simulation controls">
      <span className="sim-label">Sim</span>
      <button
        type="button"
        className="header-btn"
        onClick={simStep}
        title="Step one tick"
        aria-label="Step simulation one tick"
      >
        Step
      </button>
      {simPlaying ? (
        <button
          type="button"
          className="header-btn"
          onClick={simPause}
          title="Pause"
          aria-label="Pause simulation"
        >
          Pause
        </button>
      ) : (
        <button
          type="button"
          className="header-btn"
          onClick={simPlay}
          title="Play (auto-step)"
          aria-label="Play simulation"
        >
          Play
        </button>
      )}
      <button
        type="button"
        className="header-btn"
        onClick={simReset}
        disabled={!active && !simPlaying}
        title="Reset simulation"
        aria-label="Reset simulation"
      >
        Reset
      </button>
      {active && (
        <span className="sim-status">
          tick {simTick}
          {simRootStatus ? ` · ${simRootStatus}` : ''}
        </span>
      )}
      {bbEntries.length > 0 && (
        <span className="sim-blackboard" title="Blackboard">
          {bbEntries
            .slice(0, 4)
            .map(([k, v]) => `${k}=${v}`)
            .join('  ')}
        </span>
      )}
    </div>
  );
}
