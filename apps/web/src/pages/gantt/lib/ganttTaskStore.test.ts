import { describe, expect, it } from 'vitest';

import { filterGanttContextMenu } from '../ganttContextMenu';
import { isGanttWorkTask } from './ganttTaskStore';

describe('isGanttWorkTask', () => {
  it('accepts entityKind=task', () => {
    expect(isGanttWorkTask({ entityKind: 'task', type: 'task' })).toBe(true);
  });

  it('rejects structural kinds', () => {
    expect(isGanttWorkTask({ entityKind: 'project', type: 'summary' })).toBe(false);
    expect(isGanttWorkTask({ entityKind: 'contract', type: 'summary' })).toBe(false);
    expect(isGanttWorkTask({ entityKind: 'stage', type: 'summary' })).toBe(false);
    expect(isGanttWorkTask({ entityKind: 'workPackage', type: 'summary' })).toBe(false);
  });

  it('treats new rows without entityKind as work tasks unless summary', () => {
    expect(isGanttWorkTask({ type: 'task' })).toBe(true);
    expect(isGanttWorkTask({ type: 'summary' })).toBe(false);
    expect(isGanttWorkTask(undefined)).toBe(false);
  });
});

describe('filterGanttContextMenu', () => {
  it('blocks add-task on project/contract', () => {
    expect(filterGanttContextMenu({ id: 'add-task:child' }, { entityKind: 'project' } as never)).toBe(
      false,
    );
    expect(
      filterGanttContextMenu({ id: 'add-task:child' }, { entityKind: 'contract' } as never),
    ).toBe(false);
  });

  it('allows only child add on stage', () => {
    expect(filterGanttContextMenu({ id: 'add-task:child' }, { entityKind: 'stage' } as never)).toBe(
      true,
    );
    expect(filterGanttContextMenu({ id: 'add-task:before' }, { entityKind: 'stage' } as never)).toBe(
      false,
    );
  });

  it('hides convert/move/indent everywhere', () => {
    expect(
      filterGanttContextMenu({ id: 'convert-task:task' }, { entityKind: 'task' } as never),
    ).toBe(false);
    expect(filterGanttContextMenu({ id: 'move-task:up' }, { entityKind: 'task' } as never)).toBe(
      false,
    );
  });
});
