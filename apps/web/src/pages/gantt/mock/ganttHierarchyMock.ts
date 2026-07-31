/**
 * Доменная иерархия для Gantt (моки / скелет).
 * Project → Contract → Stage → WorkPackage → Task
 */

export type GanttEntityKind = 'project' | 'contract' | 'stage' | 'workPackage' | 'task';

export type GanttHierarchyNode = {
  id: string;
  kind: GanttEntityKind;
  name: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  deadline?: string;
  boundStart?: string;
  laborHours?: number | null;
  actualHours?: number | null;
  budget?: number | null;
  taskClass?: 'technical' | 'coexecutor' | 'auxiliary';
  isAutoAuxiliary?: boolean;
  hourlyRate?: number | null;
  planAmount?: number | null;
  factAmount?: number | null;
  progress?: number;
  children?: GanttHierarchyNode[];
  projectCode?: string;
  contractNumber?: string;
  contractDateSigned?: string;
  stageNumber?: number;
  responsibleUserId?: string | null;
  assigneeIds?: string[];
  status?: string;
};

export type GanttMockLink = {
  id: string;
  source: string;
  target: string;
  type: 'e2s' | 's2s' | 'e2e' | 's2e';
};

export type GanttMockProjectBundle = {
  projectId: string;
  projectName: string;
  tree: GanttHierarchyNode;
  links: GanttMockLink[];
};

function daysBetween(start: string, end: string): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1);
}

export function durationDays(start: string, end: string): number {
  return daysBetween(start, end);
}

function task(
  id: string,
  name: string,
  start: string,
  end: string,
  extra?: Partial<GanttHierarchyNode>,
): GanttHierarchyNode {
  return {
    id,
    kind: 'task',
    name,
    start,
    end,
    progress: 0,
    laborHours: 40,
    actualHours: 0,
    deadline: end,
    ...extra,
  };
}

function workPackage(
  id: string,
  name: string,
  start: string,
  end: string,
  children: GanttHierarchyNode[],
  extra?: Partial<GanttHierarchyNode>,
): GanttHierarchyNode {
  return {
    id,
    kind: 'workPackage',
    name,
    start,
    end,
    progress: 0,
    laborHours: children.reduce((sum, child) => sum + (child.laborHours ?? 0), 0),
    actualHours: children.reduce((sum, child) => sum + (child.actualHours ?? 0), 0),
    deadline: end,
    children,
    ...extra,
  };
}

/**
 * Учебный сценарий критического пути (смотрите сверху списка):
 *
 *   [1 Проектирование] ──► [2 Закупка] ──► [3 Монтаж] ──► [4 Приёмка]   ← длинная цепочка = КРИТИЧЕСКИЙ ПУТЬ
 *           │
 *           └──► [Параллель: логотип]   ← короткая ветка, есть запас времени (НЕ критическая)
 *
 * Включите тумблер «Критический путь»: полоски 1→2→3→4 станут красными, «логотип» останется синим.
 * (CPM считается по каждому проекту отдельно — DEMO не конкурирует с длинным ВСМ.)
 */
const CRITICAL_PATH_DEMO: GanttMockProjectBundle = {
  projectId: 'mock-critical-demo',
  projectName: 'DEMO — Критический путь',
  tree: {
    id: 'mock-critical-demo',
    kind: 'project',
    projectCode: 'DEMO-CP',
    name: 'DEMO — Критический путь (включите тумблер)',
    start: '2026-06-01',
    end: '2026-09-18',
    progress: 15,
    laborHours: 2_000,
    actualHours: 200,
    deadline: '2026-09-18',
    children: [
      {
        id: 'mock-cp-contract',
        kind: 'contract',
        contractNumber: 'DEMO-CP-1',
        contractDateSigned: '2026-06-01',
        name: 'Сценарий: длинная цепочка vs короткая параллель',
        start: '2026-06-01',
        end: '2026-09-18',
        progress: 15,
        laborHours: 2_000,
        actualHours: 200,
        deadline: '2026-09-18',
        children: [
          {
            id: 'mock-cp-stage',
            kind: 'stage',
            stageNumber: 1,
            name: 'Этап демонстрации CPM',
            start: '2026-06-01',
            end: '2026-09-18',
            progress: 15,
            laborHours: 2_000,
            actualHours: 200,
            deadline: '2026-09-18',
            children: [
              workPackage(
                'mock-cp-wp-main',
                'Основная цепочка (критическая)',
                '2026-06-01',
                '2026-09-18',
                [
                  task('mock-cp-t1', '1. Проектирование', '2026-06-01', '2026-06-12', {
                    progress: 100,
                    laborHours: 80,
                    actualHours: 80,
                  }),
                  task('mock-cp-t2', '2. Закупка оборудования', '2026-06-15', '2026-07-10', {
                    progress: 40,
                    laborHours: 120,
                    actualHours: 50,
                  }),
                  task('mock-cp-t3', '3. Монтаж', '2026-07-13', '2026-08-21', {
                    progress: 0,
                    laborHours: 320,
                    actualHours: 0,
                  }),
                  task('mock-cp-t4', '4. Приёмка заказчиком', '2026-08-24', '2026-09-04', {
                    progress: 0,
                    laborHours: 40,
                    actualHours: 0,
                  }),
                ],
                { progress: 20 },
              ),
              workPackage(
                'mock-cp-wp-side',
                'Параллель (есть запас — НЕ критическая)',
                '2026-06-15',
                '2026-06-19',
                [
                  task(
                    'mock-cp-side',
                    'Параллель: согласование логотипа (короткая)',
                    '2026-06-15',
                    '2026-06-19',
                    {
                      progress: 50,
                      laborHours: 16,
                      actualHours: 8,
                    },
                  ),
                ],
                { progress: 50 },
              ),
            ],
          },
        ],
      },
    ],
  },
  links: [
    // длинная цепочка = критический путь
    { id: 'cp-l1', source: 'mock-cp-t1', target: 'mock-cp-t2', type: 'e2s' },
    { id: 'cp-l2', source: 'mock-cp-t2', target: 'mock-cp-t3', type: 'e2s' },
    { id: 'cp-l3', source: 'mock-cp-t3', target: 'mock-cp-t4', type: 'e2s' },
    // короткая параллель с запасом
    { id: 'cp-l-side', source: 'mock-cp-t1', target: 'mock-cp-side', type: 'e2s' },
  ],
};

/** Несколько проектов с глубокой вложенностью (скелет UI). */
export const GANTT_MOCK_PROJECTS: GanttMockProjectBundle[] = [
  CRITICAL_PATH_DEMO,
  {
    projectId: 'mock-project-1',
    projectName: '240015 - ВСМ Москва — Санкт-Петербург',
    tree: {
      id: 'mock-project-1',
      kind: 'project',
      projectCode: '240015',
      name: 'ВСМ Москва — Санкт-Петербург',
      start: '2026-01-15',
      end: '2026-12-20',
      progress: 28,
      laborHours: 12_400,
      actualHours: 3_200,
      deadline: '2026-12-20',
      children: [
        {
          id: 'mock-contract-1',
          kind: 'contract',
          contractNumber: '123-Д',
          contractDateSigned: '2026-01-15',
          name: 'Подвижной состав',
          start: '2026-01-15',
          end: '2026-08-31',
          progress: 40,
          laborHours: 6_200,
          actualHours: 2_100,
          deadline: '2026-08-31',
          children: [
            {
              id: 'mock-stage-1-1',
              kind: 'stage',
              stageNumber: 1,
              name: 'Проектирование',
              start: '2026-01-15',
              end: '2026-03-31',
              progress: 85,
              laborHours: 2_400,
              actualHours: 1_800,
              deadline: '2026-03-31',
              children: [
                workPackage(
                  'mock-wp-1-1-a',
                  'Конструкторская документация',
                  '2026-01-15',
                  '2026-02-28',
                  [
                    task('mock-task-1-1-1', 'Техническое задание на вагоны', '2026-01-15', '2026-02-05', {
                      progress: 100,
                      laborHours: 160,
                      actualHours: 172,
                    }),
                    task('mock-task-1-1-2', 'Эскизный проект', '2026-02-06', '2026-02-28', {
                      progress: 100,
                      laborHours: 320,
                      actualHours: 298,
                    }),
                  ],
                  { progress: 100 },
                ),
                workPackage(
                  'mock-wp-1-1-b',
                  'Согласования',
                  '2026-03-01',
                  '2026-03-31',
                  [
                    task('mock-task-1-1-3', 'Согласование с заказчиком', '2026-03-01', '2026-03-20', {
                      progress: 60,
                      laborHours: 80,
                      actualHours: 48,
                    }),
                    task('mock-task-1-1-4', 'Экспертиза документации', '2026-03-10', '2026-03-31', {
                      progress: 40,
                      laborHours: 120,
                      actualHours: 40,
                    }),
                  ],
                  { progress: 50 },
                ),
              ],
            },
            {
              id: 'mock-stage-1-2',
              kind: 'stage',
              stageNumber: 2,
              name: 'Изготовление опытного состава',
              start: '2026-04-01',
              end: '2026-08-31',
              progress: 20,
              laborHours: 3_800,
              actualHours: 300,
              deadline: '2026-08-31',
              children: [
                workPackage(
                  'mock-wp-1-2-a',
                  'Закупки и комплектация',
                  '2026-04-01',
                  '2026-05-15',
                  [
                    task('mock-task-1-2-1', 'Закупка комплектующих', '2026-04-01', '2026-05-15', {
                      progress: 45,
                      laborHours: 200,
                      actualHours: 90,
                    }),
                  ],
                  { progress: 45 },
                ),
                workPackage(
                  'mock-wp-1-2-b',
                  'Сборка и испытания',
                  '2026-05-16',
                  '2026-08-31',
                  [
                    task('mock-task-1-2-2', 'Сборка головного вагона', '2026-05-16', '2026-07-20', {
                      progress: 10,
                      laborHours: 900,
                      actualHours: 120,
                    }),
                    task('mock-task-1-2-3', 'Заводские испытания', '2026-07-21', '2026-08-31', {
                      progress: 0,
                      laborHours: 400,
                      actualHours: 0,
                    }),
                  ],
                  { progress: 5 },
                ),
              ],
            },
          ],
        },
        {
          id: 'mock-contract-2',
          kind: 'contract',
          contractNumber: '45',
          contractDateSigned: '2026-02-01',
          name: 'Инфраструктура участка',
          start: '2026-02-01',
          end: '2026-12-20',
          progress: 15,
          laborHours: 6_200,
          actualHours: 1_100,
          deadline: '2026-12-20',
          children: [
            {
              id: 'mock-stage-2-1',
              kind: 'stage',
              stageNumber: 1,
              name: 'Изыскания',
              start: '2026-02-01',
              end: '2026-04-30',
              progress: 50,
              laborHours: 1_500,
              actualHours: 800,
              deadline: '2026-04-30',
              children: [
                workPackage(
                  'mock-wp-2-1-a',
                  'Полевые работы',
                  '2026-02-01',
                  '2026-04-30',
                  [
                    task('mock-task-2-1-1', 'Геодезия трассы', '2026-02-01', '2026-03-15', {
                      progress: 80,
                      laborHours: 280,
                      actualHours: 240,
                    }),
                    task('mock-task-2-1-2', 'Инженерные изыскания', '2026-03-01', '2026-04-30', {
                      progress: 30,
                      laborHours: 360,
                      actualHours: 110,
                    }),
                  ],
                  { progress: 50 },
                ),
              ],
            },
            {
              id: 'mock-stage-2-2',
              kind: 'stage',
              stageNumber: 2,
              name: 'Строительство участка',
              start: '2026-05-01',
              end: '2026-12-20',
              progress: 5,
              laborHours: 4_700,
              actualHours: 300,
              deadline: '2026-12-20',
              children: [
                workPackage(
                  'mock-wp-2-2-a',
                  'Земляное полотно и путь',
                  '2026-05-01',
                  '2026-12-20',
                  [
                    task('mock-task-2-2-1', 'Земляные работы', '2026-05-01', '2026-07-31', {
                      progress: 15,
                      laborHours: 1_200,
                      actualHours: 280,
                    }),
                    task('mock-task-2-2-2', 'Укладка пути', '2026-08-01', '2026-11-15', {
                      progress: 0,
                      laborHours: 2_000,
                      actualHours: 0,
                    }),
                    task('mock-task-2-2-3', 'Сдача участка', '2026-11-16', '2026-12-20', {
                      progress: 0,
                      laborHours: 160,
                      actualHours: 0,
                    }),
                  ],
                  { progress: 5 },
                ),
              ],
            },
          ],
        },
      ],
    },
    links: [
      { id: 'l-1', source: 'mock-task-1-1-1', target: 'mock-task-1-1-2', type: 'e2s' },
      { id: 'l-2', source: 'mock-task-1-1-2', target: 'mock-task-1-1-3', type: 'e2s' },
      { id: 'l-3', source: 'mock-task-1-1-3', target: 'mock-task-1-1-4', type: 'e2s' },
      { id: 'l-4', source: 'mock-task-1-1-4', target: 'mock-task-1-2-1', type: 'e2s' },
      { id: 'l-5', source: 'mock-task-1-2-1', target: 'mock-task-1-2-2', type: 'e2s' },
      { id: 'l-6', source: 'mock-task-1-2-2', target: 'mock-task-1-2-3', type: 'e2s' },
      { id: 'l-7', source: 'mock-task-2-1-1', target: 'mock-task-2-1-2', type: 'e2s' },
      { id: 'l-8', source: 'mock-task-2-1-2', target: 'mock-task-2-2-1', type: 'e2s' },
      { id: 'l-9', source: 'mock-task-2-2-1', target: 'mock-task-2-2-2', type: 'e2s' },
      { id: 'l-10', source: 'mock-task-2-2-2', target: 'mock-task-2-2-3', type: 'e2s' },
    ],
  },
  {
    projectId: 'mock-project-2',
    projectName: '240028 - Модернизация депо',
    tree: {
      id: 'mock-project-2',
      kind: 'project',
      projectCode: '240028',
      name: 'Модернизация депо',
      start: '2026-03-01',
      end: '2026-09-30',
      progress: 10,
      laborHours: 4_800,
      actualHours: 420,
      deadline: '2026-09-30',
      children: [
        {
          id: 'mock-contract-3',
          kind: 'contract',
          contractNumber: 'ДГ-2026-001',
          contractDateSigned: '2026-03-01',
          name: 'Поставка и монтаж оборудования',
          start: '2026-03-01',
          end: '2026-09-30',
          progress: 10,
          laborHours: 4_800,
          actualHours: 420,
          deadline: '2026-09-30',
          children: [
            {
              id: 'mock-stage-3-1',
              kind: 'stage',
              stageNumber: 1,
              name: 'Поставка оборудования',
              start: '2026-03-01',
              end: '2026-06-15',
              progress: 20,
              laborHours: 1_600,
              actualHours: 400,
              deadline: '2026-06-15',
              children: [
                workPackage(
                  'mock-wp-3-1-a',
                  'Закупочные процедуры',
                  '2026-03-01',
                  '2026-06-15',
                  [
                    task('mock-task-3-1-1', 'Конкурсная закупка', '2026-03-01', '2026-04-15', {
                      progress: 40,
                      laborHours: 200,
                      actualHours: 90,
                    }),
                    task('mock-task-3-1-2', 'Поставка станков', '2026-04-16', '2026-06-15', {
                      progress: 5,
                      laborHours: 120,
                      actualHours: 20,
                    }),
                  ],
                  { progress: 20 },
                ),
              ],
            },
            {
              id: 'mock-stage-3-2',
              kind: 'stage',
              stageNumber: 2,
              name: 'Монтаж и пусконаладка',
              start: '2026-06-16',
              end: '2026-09-30',
              progress: 0,
              laborHours: 3_200,
              actualHours: 20,
              deadline: '2026-09-30',
              children: [
                workPackage(
                  'mock-wp-3-2-a',
                  'Монтаж линии',
                  '2026-06-16',
                  '2026-08-31',
                  [
                    task('mock-task-3-2-1', 'Монтаж линии', '2026-06-16', '2026-08-31', {
                      progress: 0,
                      laborHours: 2_400,
                      actualHours: 0,
                    }),
                  ],
                ),
                workPackage(
                  'mock-wp-3-2-b',
                  'Пусконаладка',
                  '2026-09-01',
                  '2026-09-30',
                  [
                    task('mock-task-3-2-2', 'Пусконаладочные работы', '2026-09-01', '2026-09-30', {
                      progress: 0,
                      laborHours: 800,
                      actualHours: 0,
                    }),
                  ],
                ),
              ],
            },
          ],
        },
      ],
    },
    links: [
      { id: 'l-a', source: 'mock-task-3-1-1', target: 'mock-task-3-1-2', type: 'e2s' },
      { id: 'l-b', source: 'mock-task-3-1-2', target: 'mock-task-3-2-1', type: 'e2s' },
      { id: 'l-c', source: 'mock-task-3-2-1', target: 'mock-task-3-2-2', type: 'e2s' },
    ],
  },
  {
    projectId: 'mock-project-3',
    projectName: '240041 - ЦР ПП / Поручения РЖД',
    tree: {
      id: 'mock-project-3',
      kind: 'project',
      projectCode: '240041',
      name: 'ЦР ПП — Поручения РЖД',
      start: '2026-01-01',
      end: '2026-12-30',
      progress: 12,
      laborHours: 8_500,
      actualHours: 1_100,
      deadline: '2026-12-30',
      children: [
        {
          id: 'mock-contract-4',
          kind: 'contract',
          contractNumber: 'РЖД-2026/07',
          contractDateSigned: '2026-01-10',
          name: 'Подготовка контрактов на проектирование',
          start: '2026-01-10',
          end: '2026-06-30',
          progress: 25,
          laborHours: 2_200,
          actualHours: 600,
          deadline: '2026-06-30',
          children: [
            {
              id: 'mock-stage-4-1',
              kind: 'stage',
              stageNumber: 1,
              name: 'Подготовка ТЗ',
              start: '2026-01-10',
              end: '2026-03-31',
              progress: 40,
              laborHours: 900,
              actualHours: 400,
              deadline: '2026-03-31',
              children: [
                workPackage(
                  'mock-wp-4-1-a',
                  'Сбор исходных данных',
                  '2026-01-10',
                  '2026-02-20',
                  [
                    task('mock-task-4-1-1', 'Анализ поручений', '2026-01-10', '2026-01-31', {
                      progress: 100,
                      laborHours: 80,
                      actualHours: 76,
                    }),
                    task('mock-task-4-1-2', 'Формирование ТЗ', '2026-02-01', '2026-02-20', {
                      progress: 70,
                      laborHours: 120,
                      actualHours: 90,
                    }),
                  ],
                  { progress: 80 },
                ),
                workPackage(
                  'mock-wp-4-1-b',
                  'Внутренние согласования',
                  '2026-02-21',
                  '2026-03-31',
                  [
                    task('mock-task-4-1-3', 'Согласование с ЦР ПП', '2026-02-21', '2026-03-15', {
                      progress: 20,
                      laborHours: 60,
                      actualHours: 12,
                    }),
                    task('mock-task-4-1-4', 'Утверждение ТЗ', '2026-03-16', '2026-03-31', {
                      progress: 0,
                      laborHours: 40,
                      actualHours: 0,
                    }),
                  ],
                  { progress: 10 },
                ),
              ],
            },
          ],
        },
        {
          id: 'mock-contract-5',
          kind: 'contract',
          contractNumber: 'РЖД-2026/09',
          contractDateSigned: '2026-04-01',
          name: '0008_Гибридный тепловоз',
          start: '2026-04-01',
          end: '2026-12-30',
          progress: 5,
          laborHours: 6_300,
          actualHours: 500,
          deadline: '2026-12-30',
          children: [
            {
              id: 'mock-stage-5-1',
              kind: 'stage',
              stageNumber: 1,
              name: 'НИОКР',
              start: '2026-04-01',
              end: '2026-08-31',
              progress: 10,
              laborHours: 3_000,
              actualHours: 400,
              deadline: '2026-08-31',
              children: [
                workPackage(
                  'mock-wp-5-1-a',
                  'Исследования и прототип',
                  '2026-04-01',
                  '2026-08-31',
                  [
                    task('mock-task-5-1-1', 'Исследование силовой установки', '2026-04-01', '2026-06-15', {
                      progress: 30,
                      laborHours: 600,
                      actualHours: 220,
                    }),
                    task('mock-task-5-1-2', 'Прототип гибридной схемы', '2026-06-16', '2026-08-31', {
                      progress: 0,
                      laborHours: 1_200,
                      actualHours: 0,
                    }),
                  ],
                  { progress: 10 },
                ),
              ],
            },
          ],
        },
      ],
    },
    links: [
      { id: 'l-d', source: 'mock-task-4-1-1', target: 'mock-task-4-1-2', type: 'e2s' },
      { id: 'l-e', source: 'mock-task-4-1-2', target: 'mock-task-4-1-3', type: 'e2s' },
      { id: 'l-f', source: 'mock-task-4-1-3', target: 'mock-task-4-1-4', type: 'e2s' },
      { id: 'l-g', source: 'mock-task-5-1-1', target: 'mock-task-5-1-2', type: 'e2s' },
    ],
  },
];

export function getGanttMockByProjectId(projectId: string): GanttMockProjectBundle | undefined {
  return GANTT_MOCK_PROJECTS.find(item => item.projectId === projectId);
}
