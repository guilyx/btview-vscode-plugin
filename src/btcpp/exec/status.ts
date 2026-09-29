/** BehaviorTree.CPP node execution status. */
export type NodeStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILURE' | 'SKIPPED';

export const IDLE: NodeStatus = 'IDLE';
export const RUNNING: NodeStatus = 'RUNNING';
export const SUCCESS: NodeStatus = 'SUCCESS';
export const FAILURE: NodeStatus = 'FAILURE';
export const SKIPPED: NodeStatus = 'SKIPPED';

export function isCompleted(status: NodeStatus): boolean {
  return status === 'SUCCESS' || status === 'FAILURE';
}
