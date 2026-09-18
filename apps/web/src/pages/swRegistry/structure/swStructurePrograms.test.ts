import { describe, expect, it } from 'vitest';

import type { SwItemListRow, SwRecordState, SwStructureNode } from '@/types/swRegistry';

import {
  archivedStructureTree,
  countArchivedElements,
  groupProgramsByElement,
  groupProgramsByResponsible,
  searchStructureTree,
} from './swStructurePrograms';

const node = (
  id: string,
  code: string,
  name: string,
  children: SwStructureNode[] = [],
  recordState: SwRecordState = 'active',
) => ({ id, code, name, children, recordState }) as SwStructureNode;

const program = (
  id: string,
  elementId: string,
  designation: string,
  shortName: string,
  fullName = shortName,
  responsible = { id: 'u1', name: 'Муравьёв Ю. Н.' },
) => ({ id, designation, shortName, fullName, element: { id: elementId }, responsible }) as SwItemListRow;

// БИ06 → МСУ → (Системное ПО); БИ07 без программ.
const tree = [
  node('bi06', 'БИ06', 'Блок индикации', [node('msu', 'МСУ', 'Модуль управления')]),
  node('bi07', 'БИ07', 'Пульт'),
];
const programs = groupProgramsByElement([
  program('p1', 'msu', 'RU.РУСВ.00010-01', 'Системное ПО', 'Системное программное обеспечение'),
  program('p2', 'msu', 'RU.РУСВ.00011-01', 'Прикладное ПО'),
]);

const ids = (nodes: SwStructureNode[]): string[] => nodes.flatMap(n => [n.id, ...ids(n.children ?? [])]);

describe('searchStructureTree', () => {
  it('без запроса отдаёт дерево и все программы как есть', () => {
    const result = searchStructureTree(tree, programs, '  ');
    expect(result.tree).toBe(tree);
    expect(result.programsByElement).toBe(programs);
    expect(result.expandIds.size).toBe(0);
    expect(result.programCount).toBe(2);
  });

  it('находит программу по наименованию и оставляет ветку до неё раскрытой', () => {
    const result = searchStructureTree(tree, programs, 'системное');
    expect(ids(result.tree)).toEqual(['bi06', 'msu']);
    expect(result.programsByElement.get('msu')?.map(p => p.id)).toEqual(['p1']);
    expect([...result.expandIds].sort()).toEqual(['bi06', 'msu']);
    expect(result.programCount).toBe(1);
  });

  it('находит программу по обозначению и по полному наименованию', () => {
    expect(
      searchStructureTree(tree, programs, '00011')
        .programsByElement.get('msu')
        ?.map(p => p.id),
    ).toEqual(['p2']);
    expect(
      searchStructureTree(tree, programs, 'программное')
        .programsByElement.get('msu')
        ?.map(p => p.id),
    ).toEqual(['p1']);
  });

  it('совпавший элемент показывает все свои программы и сам не раскрывается', () => {
    const result = searchStructureTree(tree, programs, 'мсу');
    expect(ids(result.tree)).toEqual(['bi06', 'msu']);
    expect(result.programsByElement.get('msu')?.map(p => p.id)).toEqual(['p1', 'p2']);
    expect([...result.expandIds]).toEqual(['bi06']);
  });

  it('ничего не найдено — пустое дерево', () => {
    const result = searchStructureTree(tree, programs, 'нет такого');
    expect(result.tree).toEqual([]);
    expect(result.programCount).toBe(0);
  });
});

describe('groupProgramsByResponsible', () => {
  it('собирает каждого ответственного один раз с его программами, по алфавиту', () => {
    const kashirin = { id: 'u2', name: 'Каширин В. В.' };
    const result = groupProgramsByResponsible([
      program('p1', 'e', 'D1', 'Системное ПО'),
      program('p2', 'e', 'D2', 'Драйвер CAN FD', 'Драйвер CAN FD', kashirin),
      program('p3', 'e', 'D3', 'ПО ПЛИС'),
    ]);
    expect(result.map(r => [r.name, r.programs.map(p => p.id)])).toEqual([
      ['Каширин В. В.', ['p2']],
      ['Муравьёв Ю. Н.', ['p1', 'p3']],
    ]);
  });

  it('без программ — пустой список', () => {
    expect(groupProgramsByResponsible([])).toEqual([]);
  });
});

describe('archivedStructureTree', () => {
  // Система (действует) → подсистема (действует, в ней архивная программа) и компонент (в архиве);
  // вторая система действует и без архивного.
  const fullTree = [
    node('sys', 'СИС', 'Система', [node('sub', 'ПОД', 'Подсистема'), node('cmp', 'КОМ', 'Компонент', [], 'archived')]),
    node('sys2', 'СИС2', 'Вторая система'),
  ];

  it('оставляет архивный элемент под действующим родителем вместе с веткой до него', () => {
    expect(ids(archivedStructureTree(fullTree, new Map()))).toEqual(['sys', 'cmp']);
  });

  it('оставляет действующий элемент, если в нём есть программа, ушедшая в архив одна', () => {
    const archivedPrograms = groupProgramsByElement([program('p9', 'sub', 'RU.00099-01', 'Старое ПО')]);
    expect(ids(archivedStructureTree(fullTree, archivedPrograms))).toEqual(['sys', 'sub', 'cmp']);
  });

  it('без архивного — пустое дерево', () => {
    expect(archivedStructureTree([node('a', 'A', 'A')], new Map())).toEqual([]);
  });
});

describe('countArchivedElements', () => {
  it('считает архивные элементы на любой глубине', () => {
    const nested = [node('a', 'A', 'A', [node('b', 'B', 'B', [node('c', 'C', 'C', [], 'archived')], 'archived')])];
    expect(countArchivedElements(nested)).toBe(2);
    expect(countArchivedElements(tree)).toBe(0);
  });
});
