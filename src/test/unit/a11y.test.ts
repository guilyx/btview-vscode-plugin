import { describe, expect, it } from 'vitest';
import {
  describeSelection,
  describeSimulation,
  nextMenuIndex,
  nodeAriaLabel,
} from '../../../webview/src/utils/a11y';

describe('nodeAriaLabel', () => {
  it('names kind, type and instance name', () => {
    expect(nodeAriaLabel({ kind: 'action', registeredId: 'OpenGripper' })).toBe(
      'action OpenGripper',
    );
    expect(
      nodeAriaLabel({ kind: 'control', registeredId: 'Sequence', instanceName: 'root_sequence' }),
    ).toBe('control Sequence “root_sequence”');
    // An instance name equal to the type adds nothing.
    expect(
      nodeAriaLabel({ kind: 'control', registeredId: 'Sequence', instanceName: 'Sequence' }),
    ).toBe('control Sequence');
  });

  it('adds children, status, issues and staged state', () => {
    expect(
      nodeAriaLabel({
        kind: 'control',
        registeredId: 'Fallback',
        childCount: 2,
        status: 'RUNNING',
        hasWarning: true,
      }),
    ).toBe('control Fallback, 2 children, status RUNNING, has validation issues');
    expect(nodeAriaLabel({ kind: 'decorator', registeredId: 'Inverter', childCount: 1 })).toBe(
      'decorator Inverter, 1 child',
    );
    expect(nodeAriaLabel({ kind: 'action', registeredId: 'A', status: 'IDLE', staged: true })).toBe(
      'staged action A',
    );
  });
});

describe('live region text', () => {
  it('describes the selection', () => {
    expect(describeSelection(null)).toBe('');
    expect(describeSelection({ kind: 'action', registeredId: 'Say' })).toBe('Selected action Say');
  });

  it('announces simulation state changes, not every tick', () => {
    expect(describeSimulation(0, null)).toBe('');
    expect(describeSimulation(0, 'IDLE')).toBe('');
    expect(describeSimulation(3, 'RUNNING')).toBe(describeSimulation(4, 'RUNNING'));
    expect(describeSimulation(1, 'SUCCESS')).toBe('Simulation finished: SUCCESS after 1 tick');
    expect(describeSimulation(5, 'FAILURE')).toBe('Simulation finished: FAILURE after 5 ticks');
  });
});

describe('nextMenuIndex', () => {
  const disabled = [false, true, false, false];

  it('moves down/up skipping disabled items and wrapping', () => {
    expect(nextMenuIndex(disabled, 0, 'ArrowDown')).toBe(2);
    expect(nextMenuIndex(disabled, 3, 'ArrowDown')).toBe(0);
    expect(nextMenuIndex(disabled, 2, 'ArrowUp')).toBe(0);
    expect(nextMenuIndex(disabled, 0, 'ArrowUp')).toBe(3);
  });

  it('enters the menu from outside and supports Home/End', () => {
    expect(nextMenuIndex(disabled, -1, 'ArrowDown')).toBe(0);
    expect(nextMenuIndex(disabled, -1, 'ArrowUp')).toBe(3);
    expect(nextMenuIndex([true, false, false, true], 2, 'Home')).toBe(1);
    expect(nextMenuIndex([true, false, false, true], 1, 'End')).toBe(2);
  });

  it('ignores other keys and fully disabled menus', () => {
    expect(nextMenuIndex(disabled, 0, 'a')).toBeNull();
    expect(nextMenuIndex([true, true], 0, 'ArrowDown')).toBeNull();
  });
});
