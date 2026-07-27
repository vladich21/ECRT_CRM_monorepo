import { describe, expect, it } from 'vitest';

import { mapApiHierarchyToGantt } from './mapApiHierarchyToGantt';

describe('mapApiHierarchyToGantt', () => {
  it('maps project → contract → stage → task with budget and hours', () => {
    const { tasks, links } = mapApiHierarchyToGantt({
      projects: [
        {
          id: 'p1',
          kind: 'project',
          name: 'Проект',
          project_code: 'P-1',
          start: '2026-01-01',
          end: '2026-12-31',
          budget: 1000,
          planned_hours: 40,
          actual_hours: 10,
          children: [
            {
              id: 'c1',
              kind: 'contract',
              name: 'Договор',
              contract_number: '1',
              start: '2026-02-01',
              end: '2026-06-01',
              budget: 1000,
              children: [
                {
                  id: 's1',
                  kind: 'stage',
                  name: 'Этап',
                  stage_number: 1,
                  start: '2026-02-01',
                  end: '2026-03-01',
                  budget: 500,
                  children: [
                    {
                      id: 't1',
                      kind: 'task',
                      name: 'Задача',
                      start: '2026-02-05',
                      end: '2026-02-20',
                      planned_hours: 40,
                      actual_hours: 10,
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      links: [{ id: 'l1', source: 't1', target: 't1', type: 'e2s' }],
      date_warnings: [],
    });

    expect(tasks).toHaveLength(4);
    expect(tasks.find(t => t.id === 'p1')?.entityKind).toBe('project');
    expect(tasks.find(t => t.id === 'c1')?.entityKind).toBe('contract');
    expect(tasks.find(t => t.id === 's1')?.entityKind).toBe('stage');
    expect(tasks.find(t => t.id === 't1')?.entityKind).toBe('task');
    expect(tasks.find(t => t.id === 'p1')?.budget).toBe(1000);
    expect(tasks.find(t => t.id === 't1')?.laborHours).toBe(40);
    expect(tasks.find(t => t.id === 't1')?.actualHours).toBe(10);
    expect(links).toHaveLength(1);
  });

  it('shows stage without tasks using parent dates and stage budget', () => {
    const { tasks } = mapApiHierarchyToGantt({
      projects: [
        {
          id: 'p1',
          kind: 'project',
          name: 'Проект',
          start: '2026-01-01',
          end: '2026-12-31',
          budget: 800,
          children: [
            {
              id: 'c1',
              kind: 'contract',
              name: 'Договор',
              start: '2026-02-01',
              end: '2026-06-01',
              budget: 800,
              children: [
                {
                  id: 's1',
                  kind: 'stage',
                  name: 'Новый этап',
                  stage_number: 2,
                  start: null,
                  end: null,
                  budget: 300,
                  children: [],
                },
                {
                  id: 's2',
                  kind: 'stage',
                  name: 'Второй',
                  stage_number: 3,
                  start: '2026-03-01',
                  end: '2026-04-01',
                  budget: 500,
                  children: [],
                },
              ],
            },
          ],
        },
      ],
      links: [],
      date_warnings: [],
    });

    expect(tasks.find(t => t.id === 's1')).toMatchObject({
      entityKind: 'stage',
      budget: 300,
    });
    expect(tasks.find(t => t.id === 's2')?.budget).toBe(500);
    expect(tasks.find(t => t.id === 'c1')?.budget).toBe(800);
  });
});
