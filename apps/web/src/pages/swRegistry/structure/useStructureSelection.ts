import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { SwItemListRow, SwStructureNode } from '@/types/swRegistry';

import { collectStructurePathIds, findStructureNode, firstStructureNode } from './swStructureTree';

function dropDocumentParams(params: URLSearchParams) {
  params.delete('documentId');
  params.delete('docTab');
}

/** Снять выбор программы: вкладка панели, фильтр из свода и открытый документ уходят вместе с ней. */
function dropProgramParams(params: URLSearchParams) {
  params.delete('itemId');
  params.delete('tab');
  params.delete('documentStatus');
  params.delete('sheetStatus');
  dropDocumentParams(params);
}

/**
 * Выбор в дереве структуры. Всё, что определяет «куда смотрим», живёт в адресе,
 * поэтому выбор узла, программы и раскрытие веток собраны здесь: страница только
 * рисует дерево и панели.
 */
export function useStructureSelection(input: {
  rawTree: SwStructureNode[];
  tree: SwStructureNode[];
  structureLoading: boolean;
  selectedProgram: SwItemListRow | null;
  selectedProgramId: string | null;
  showArchivedInTree: boolean;
}) {
  const { rawTree, tree, structureLoading, selectedProgram, selectedProgramId, showArchivedInTree } = input;
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('elementId'));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // Ссылки из прежней версии экрана носили вкладку view=archived; сводим их к галке,
  // чтобы дальше в адресе был один способ сказать «показывать архивные».
  useEffect(() => {
    if (searchParams.get('view') !== 'archived') return;
    const next = new URLSearchParams(searchParams);
    next.delete('view');
    next.set('archived', '1');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const selectedNode = useMemo(
    () => (selectedId ? findStructureNode(rawTree, selectedId) : null),
    [rawTree, selectedId],
  );

  const expandPath = useCallback((id: string, sourceTree: SwStructureNode[]) => {
    const path = collectStructurePathIds(sourceTree, id);
    if (path.length === 0) return;
    setExpandedIds(prev => {
      const next = new Set(prev);
      for (const nodeId of path.slice(0, -1)) next.add(nodeId);
      return next;
    });
  }, []);

  const selectNode = useCallback(
    (node: SwStructureNode) => {
      setSelectedId(node.id);
      expandPath(node.id, rawTree);
      // Раскрываем сам узел: иначе счётчик обещает программы, а в дереве их не видно.
      setExpandedIds(prev => (prev.has(node.id) ? prev : new Set(prev).add(node.id)));
      const next = new URLSearchParams(searchParams);
      next.set('elementId', node.id);
      dropProgramParams(next);
      setSearchParams(next, { replace: true });
    },
    [expandPath, rawTree, searchParams, setSearchParams],
  );

  const selectProgram = useCallback(
    (item: SwItemListRow) => {
      setSelectedId(item.element.id);
      expandPath(item.element.id, rawTree);
      setExpandedIds(prev => new Set(prev).add(item.element.id));
      const next = new URLSearchParams(searchParams);
      next.set('elementId', item.element.id);
      // Вкладка панели сохраняется при переходе между программами; фильтр из свода и открытый документ — нет.
      if (next.get('itemId') !== item.id) {
        next.delete('documentStatus');
        next.delete('sheetStatus');
        dropDocumentParams(next);
      }
      next.set('itemId', item.id);
      setSearchParams(next, { replace: true });
    },
    [expandPath, rawTree, searchParams, setSearchParams],
  );

  // Переход из панели программы к её элементу структуры.
  const selectElementById = useCallback(
    (elementId: string) => {
      const node = findStructureNode(rawTree, elementId);
      if (node) {
        selectNode(node);
        return;
      }
      // Элемента нет в текущем дереве (архивный, скрыт) — показываем архивные, выбор подхватит эффект по elementId.
      const next = new URLSearchParams(searchParams);
      next.set('elementId', elementId);
      dropProgramParams(next);
      next.set('archived', '1');
      setSearchParams(next, { replace: true });
    },
    [rawTree, selectNode, searchParams, setSearchParams],
  );

  useEffect(() => {
    if (structureLoading || rawTree.length === 0) return;

    const urlId = searchParams.get('elementId');
    if (urlId && findStructureNode(rawTree, urlId)) {
      setSelectedId(prev => (prev === urlId ? prev : urlId));
      expandPath(urlId, rawTree);
      return;
    }

    // Пришли с программой без элемента (свод, РИД): выбираем элемент программы.
    // Пока программа грузится или не найдена — первый узел не подставляем.
    if (selectedProgramId) {
      if (!selectedProgram) return;
      const elementId = selectedProgram.element.id;
      if (findStructureNode(rawTree, elementId)) {
        setSelectedId(elementId);
        expandPath(elementId, rawTree);
        const next = new URLSearchParams(searchParams);
        next.set('elementId', elementId);
        setSearchParams(next, { replace: true });
        return;
      }
      if (!showArchivedInTree) {
        const next = new URLSearchParams(searchParams);
        next.set('archived', '1');
        next.delete('view');
        setSearchParams(next, { replace: true });
      }
      return;
    }

    if (selectedId && findStructureNode(rawTree, selectedId)) {
      expandPath(selectedId, rawTree);
      return;
    }

    const first = firstStructureNode(tree);
    if (!first) return;

    setSelectedId(first.id);
    expandPath(first.id, rawTree);
    const next = new URLSearchParams(searchParams);
    next.set('elementId', first.id);
    setSearchParams(next, { replace: true });
  }, [
    structureLoading,
    rawTree,
    tree,
    showArchivedInTree,
    searchParams,
    selectedId,
    expandPath,
    setSearchParams,
    selectedProgramId,
    selectedProgram,
  ]);

  // Выбрана программа — раскрываем её ветку, иначе непонятно, что выбрано.
  useEffect(() => {
    if (!selectedProgram || rawTree.length === 0) return;
    const elementId = selectedProgram.element.id;
    expandPath(elementId, rawTree);
    setExpandedIds(prev => (prev.has(elementId) ? prev : new Set(prev).add(elementId)));
  }, [selectedProgram, rawTree, expandPath]);

  const clearProgramSelection = () => {
    const next = new URLSearchParams(searchParams);
    dropProgramParams(next);
    setSearchParams(next, { replace: true });
  };

  const changeShowArchived = (value: boolean) => {
    const next = new URLSearchParams(searchParams);
    next.delete('view');
    if (value) next.set('archived', '1');
    else {
      next.delete('archived');
      if (selectedProgram?.recordState === 'archived' || selectedNode?.recordState === 'archived') {
        dropProgramParams(next);
        if (selectedNode?.recordState === 'archived') {
          next.delete('elementId');
          setSelectedId(null);
        }
      }
    }
    setSearchParams(next, { replace: true });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return {
    selectedId,
    selectedNode,
    setSelectedId,
    expandedIds,
    selectNode,
    selectProgram,
    selectElementById,
    clearProgramSelection,
    changeShowArchived,
    toggleExpand,
  };
}
