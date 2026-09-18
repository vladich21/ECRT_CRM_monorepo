// @vitest-environment jsdom
import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { SwItemListRow, SwStructureNode } from '@/types/swRegistry';

import { useStructureSelection } from './useStructureSelection';

function node(id: string, children: SwStructureNode[] = []): SwStructureNode {
  return {
    id,
    parentId: null,
    elementTypeCode: 'system',
    code: id.toUpperCase(),
    name: `Элемент ${id}`,
    description: null,
    recordState: 'active',
    archivedByCascade: false,
    responsibles: [],
    children,
  };
}

const child = node('child');
const root = node('root', [child]);
const tree = [root];

function program(id: string, elementId: string): SwItemListRow {
  return {
    id,
    designation: 'РОФ.ГКМН.620013-01',
    shortName: 'ПО',
    fullName: 'Программное обеспечение',
    element: { id: elementId, code: 'ROOT', name: 'Элемент' },
    partner: { id: 'p1', name: 'Контрагент' },
    responsible: { id: 'u1', name: 'Иванов И.И.' },
    developmentKindCode: 'rnd',
    documentsCount: 0,
    recordState: 'active',
  } as SwItemListRow;
}

/** Хук и адрес живут вместе, поэтому проверяем их парой: состояние + query. */
function setup(initialUrl: string, over: Partial<Parameters<typeof useStructureSelection>[0]> = {}) {
  return renderHook(
    () => {
      const [params] = useSearchParams();
      const selection = useStructureSelection({
        rawTree: tree,
        tree,
        structureLoading: false,
        selectedProgram: null,
        selectedProgramId: null,
        showArchivedInTree: false,
        ...over,
      });
      return { selection, params };
    },
    { wrapper: ({ children }) => <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter> },
  );
}

describe('useStructureSelection', () => {
  it('выбор узла пишет элемент в адрес и раскрывает ветку до него', () => {
    const { result } = setup('/sw/structure');

    act(() => result.current.selection.selectNode(child));

    expect(result.current.params.get('elementId')).toBe('child');
    expect(result.current.selection.selectedId).toBe('child');
    // Родитель раскрыт, чтобы выбранное было видно, и сам узел — чтобы были видны его программы.
    expect([...result.current.selection.expandedIds].sort()).toEqual(['child', 'root']);
  });

  it('выбор программы снимает фильтр из свода, но оставляет вкладку панели', () => {
    const { result } = setup('/sw/structure?itemId=old&tab=firmware&documentStatus=in_approval');

    act(() => result.current.selection.selectProgram(program('new', 'root')));

    expect(result.current.params.get('itemId')).toBe('new');
    expect(result.current.params.get('tab')).toBe('firmware');
    expect(result.current.params.get('documentStatus')).toBeNull();
  });

  it('снятие выбора программы убирает её вкладку и открытый документ', () => {
    const { result } = setup('/sw/structure?itemId=x&tab=rid&documentId=d1');

    act(() => result.current.selection.clearProgramSelection());

    expect(result.current.params.get('itemId')).toBeNull();
    expect(result.current.params.get('tab')).toBeNull();
    expect(result.current.params.get('documentId')).toBeNull();
  });

  it('старый адрес view=archived сводится к галке «показывать архивные»', () => {
    const { result } = setup('/sw/structure?view=archived');

    expect(result.current.params.get('view')).toBeNull();
    expect(result.current.params.get('archived')).toBe('1');
  });

  it('выключение архивных снимает выбор с архивной программы', () => {
    const archived = { ...program('arch', 'root'), recordState: 'archived' as const };
    const { result } = setup('/sw/structure?archived=1&itemId=arch', {
      selectedProgram: archived,
      selectedProgramId: 'arch',
      showArchivedInTree: true,
    });

    act(() => result.current.selection.changeShowArchived(false));

    expect(result.current.params.get('archived')).toBeNull();
    expect(result.current.params.get('itemId')).toBeNull();
  });
});
