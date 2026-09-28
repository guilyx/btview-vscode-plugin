import { useGraphContext } from '../commands/graphContext';
import { describeSelection, describeSimulation } from '../utils/a11y';

/** Visually hidden live regions announcing selection and simulation status changes. */
export function LiveAnnouncer() {
  const { selectedNode, simTick, simRootStatus } = useGraphContext();
  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {describeSelection(selectedNode)}
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {describeSimulation(simTick, simRootStatus)}
      </div>
    </>
  );
}
