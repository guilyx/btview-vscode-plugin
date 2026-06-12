import type { PaletteDragPayload } from '../panels/NodePaletteSidebar';

export const STAGE_NODE_EVENT = 'btview:stage-node';

export interface StageNodeEventDetail extends PaletteDragPayload {
  /** Screen coordinates for drop placement; omit to use canvas center. */
  clientX?: number;
  clientY?: number;
}

export function dispatchStageNode(detail: StageNodeEventDetail): void {
  window.dispatchEvent(new CustomEvent(STAGE_NODE_EVENT, { detail }));
}
