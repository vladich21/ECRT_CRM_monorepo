import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';

import {
  useAddSwResponsible,
  useArchiveSwStructure,
  useCreateSwItem,
  useCreateSwStructure,
  useMarkSwStructureDeleted,
  useRemoveSwResponsible,
  useRestoreSwStructure,
  useSwItem,
  useSwItems,
  useSwReferences,
  useSwStructure,
  useUpdateSwStructure,
} from '@/api/swRegistry/swRegistryApiHooks';
import { BackButton } from '@/components/backButton/BackButton';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTIONS } from '@/shared/permissions';
import type { CreateSwItemPayload, SwItemListRow, SwStructureNode } from '@/types/swRegistry';
import { SwItemCreateModal } from './SwItemCreateModal';
import { SwProgramPanel } from './SwProgramPanel';
import { SwStructureDetailPanel, type SwStructureDetailActions } from './SwStructureDetailPanel';
import { SwStructureElementModal } from './SwStructureElementModal';
import { SwStructureListFiltersBar } from './SwStructureListFiltersBar';
import styles from './SwStructurePage.module.scss';
import type { SwStructureFilterTab } from './SwStructurePage.types';
import {
  collectStructurePathIds,
  countStructureNodes,
  findStructureNode,
  findStructureParent,
  firstStructureNode,
} from './swStructureTree';
import { buildNodeCounts, groupProgramsByElement, searchStructureTree } from './swStructurePrograms';
import { SwStructureTreeNode } from './SwStructureTreeNode';
import { SwStructureTreeToolbar } from './SwStructureTreeToolbar';

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; node: SwStructureNode }
  | { mode: 'child'; node: SwStructureNode }
  | { mode: 'responsible'; node: SwStructureNode };

function resolveFetchRecordState(tab: SwStructureFilterTab, showArchivedInTree: boolean): string {
  if (tab === 'archived') return 'archived';
  return showArchivedInTree ? 'all' : 'active';
}

/** Открытый в боковой панели документ относится к программе и уходит при смене программы. */
function dropDocumentParams(params: URLSearchParams) {
  params.delete('documentId');
  params.delete('docTab');
}

/** Снять выбор программы: вкладка панели, фильтр из свода и открытый документ относятся к ней и уходят вместе с ней. */
function dropProgramParams(params: URLSearchParams) {
  params.delete('itemId');
  params.delete('tab');
  params.delete('documentStatus');
  params.delete('sheetStatus');
  dropDocumentParams(params);
}

export default function SwStructurePage() {
  const { message } = App.useApp();
  const { hasSectionPermission } = usePermissions();
  const canEdit = hasSectionPermission(SECTIONS.SW_STRUCTURE, 'edit');
  // Регистрация ПО — право на программы, отдельное от права на структуру.
  const canCreateProgram = hasSectionPermission(SECTIONS.SW_ITEMS, 'edit');
  const [searchParams, setSearchParams] = useSearchParams();

  // Всё, что определяет «куда смотрим», живёт в адресе: ссылка из строки браузера открывает ровно то же.
  //   view=archived — вкладка «Архивные»; archived=1 — архивные в дереве действующих;
  //   elementId, itemId — выбор; tab — вкладка панели программы; documentStatus/sheetStatus — фильтр из свода.
  // Параметры по умолчанию в адрес не пишем. Каждый обработчик меняет адрес одним setSearchParams:
  // два вызова подряд строятся от одного и того же searchParams, и второй затирает первый.
  const filterTab: SwStructureFilterTab = searchParams.get('view') === 'archived' ? 'archived' : 'active';
  const showArchivedInTree = searchParams.get('archived') === '1';
  const selectedProgramId = searchParams.get('itemId');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('elementId'));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [modalState, setModalState] = useState<ModalState | null>(null);
  /** Элемент, на котором регистрируется ПО из меню «+» в дереве. */
  const [programTarget, setProgramTarget] = useState<SwStructureNode | null>(null);

  const fetchRecordState = resolveFetchRecordState(filterTab, showArchivedInTree);
  const structureQuery = useSwStructure(fetchRecordState);
  const activeTreeQuery = useSwStructure('active');
  const archivedTreeQuery = useSwStructure('archived');
  const typesQuery = useSwReferences('elementTypes');
  const rolesQuery = useSwReferences('responsibilityRoles');
  const kindsQuery = useSwReferences('developmentKinds');
  const docKindsQuery = useSwReferences('documentKinds');
  const statusesQuery = useSwReferences('statuses');
  // Программы грузим целиком: из них считаются счётчики веток и список программ узла. Какие — по режиму дерева:
  // действующие, архивные (вкладка «Архивные») или те и другие («Показывать архивные»). API отдаёт один статус
  // за запрос, поэтому запросов два.
  const showActivePrograms = fetchRecordState !== 'archived';
  const showArchivedPrograms = fetchRecordState !== 'active';
  const activeProgramsQuery = useSwItems({ recordState: 'active', limit: 500 }, { enabled: showActivePrograms });
  const archivedProgramsQuery = useSwItems({ recordState: 'archived', limit: 500 }, { enabled: showArchivedPrograms });
  const programsLoading =
    (showActivePrograms && activeProgramsQuery.isLoading) || (showArchivedPrograms && archivedProgramsQuery.isLoading);

  const createMut = useCreateSwStructure();
  const updateMut = useUpdateSwStructure();
  const archiveMut = useArchiveSwStructure();
  const restoreMut = useRestoreSwStructure();
  const markDeletedMut = useMarkSwStructureDeleted();
  const addRespMut = useAddSwResponsible();
  const removeRespMut = useRemoveSwResponsible();
  const createProgramMut = useCreateSwItem();

  const typeByCode = useMemo(
    () => new Map((typesQuery.data ?? []).map(t => [t.code, t.name])),
    [typesQuery.data],
  );
  const roleByCode = useMemo(
    () => new Map((rolesQuery.data ?? []).map(r => [r.code, r.name])),
    [rolesQuery.data],
  );
  const kindByCode = useMemo(
    () => new Map((kindsQuery.data ?? []).map(k => [k.code, k.name])),
    [kindsQuery.data],
  );

  const docKindByCode = useMemo(
    () => new Map((docKindsQuery.data ?? []).map(k => [k.code, k.name])),
    [docKindsQuery.data],
  );
  const gostCodeByKind = useMemo(
    () => new Map((docKindsQuery.data ?? []).map(k => [k.code, k.gostCode ?? ''])),
    [docKindsQuery.data],
  );
  const statusByCode = useMemo(
    () => new Map((statusesQuery.data ?? []).map(st => [st.code, st.name])),
    [statusesQuery.data],
  );

  // Выключенный запрос хранит данные прошлого режима — берём только те, что относятся к текущему.
  const programs = useMemo(
    () => [
      ...(showActivePrograms ? (activeProgramsQuery.data?.items ?? []) : []),
      ...(showArchivedPrograms ? (archivedProgramsQuery.data?.items ?? []) : []),
    ],
    [showActivePrograms, showArchivedPrograms, activeProgramsQuery.data, archivedProgramsQuery.data],
  );
  const programsByElement = useMemo(() => groupProgramsByElement(programs), [programs]);

  const rawTree = structureQuery.data ?? [];
  // Поиск идёт по элементам и по программам: дерево показывает программы из выдачи, счётчики веток — полные.
  const search = useMemo(
    () => searchStructureTree(rawTree, programsByElement, searchQuery),
    [rawTree, programsByElement, searchQuery],
  );
  const tree = search.tree;
  // Ветки с находками раскрыты поверх раскрытых вручную, иначе найденное в свёрнутой ветке не видно.
  const visibleExpandedIds = useMemo(
    () => (search.expandIds.size > 0 ? new Set([...expandedIds, ...search.expandIds]) : expandedIds),
    [expandedIds, search.expandIds],
  );

  const countsByNode = useMemo(() => buildNodeCounts(rawTree, programsByElement), [rawTree, programsByElement]);

  // «N из M» — элементы и программы вкладки.
  const totalInTab =
    countStructureNodes(rawTree) + rawTree.reduce((sum, root) => sum + (countsByNode.get(root.id)?.programs ?? 0), 0);
  const shownCount = searchQuery.trim() ? countStructureNodes(tree) + search.programCount : totalInTab;
  const activeCount = countStructureNodes(activeTreeQuery.data ?? []);
  const archivedCount = countStructureNodes(archivedTreeQuery.data ?? []);

  const selectedNode = useMemo(
    () => (selectedId ? findStructureNode(rawTree, selectedId) : null),
    [rawTree, selectedId],
  );
  // Программы, которых нет в дереве текущего режима (архивная из свода при дереве действующих, только что
  // ушедшая в архив), догружаем по id — иначе панель не открылась бы, а выбор молча ушёл бы на первый узел.
  const programFromList = useMemo(
    () => (selectedProgramId ? (programs.find(item => item.id === selectedProgramId) ?? null) : null),
    [programs, selectedProgramId],
  );
  const needsProgramFallback = Boolean(selectedProgramId) && !programsLoading && !programFromList;
  const programDetailQuery = useSwItem(needsProgramFallback ? (selectedProgramId ?? undefined) : undefined);
  const programNotFound = needsProgramFallback && programDetailQuery.isError;
  const resolvedProgram = programFromList ?? (needsProgramFallback ? (programDetailQuery.data ?? null) : null);

  // Пока программа догружается (сразу после «В архив» она уходит из списка действующих), держим последнюю
  // известную: иначе панель размонтируется и сбросит открытые модалки.
  const [lastProgram, setLastProgram] = useState<SwItemListRow | null>(null);
  useEffect(() => {
    if (resolvedProgram) setLastProgram(resolvedProgram);
  }, [resolvedProgram]);
  const selectedProgram: SwItemListRow | null =
    resolvedProgram ?? (!programNotFound && lastProgram?.id === selectedProgramId ? lastProgram : null);

  const parentNode = useMemo(
    () => (selectedId ? findStructureParent(rawTree, selectedId) : null),
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
      if (filterTab === 'active') next.set('archived', '1');
      setSearchParams(next, { replace: true });
    },
    [rawTree, selectNode, searchParams, setSearchParams, filterTab],
  );

  useEffect(() => {
    if (structureQuery.isLoading || rawTree.length === 0) return;

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
      // Элемент программы в архиве и скрыт — показываем архивные, иначе программу не найти в дереве.
      if (filterTab === 'active' && !showArchivedInTree) {
        const next = new URLSearchParams(searchParams);
        next.set('archived', '1');
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
    structureQuery.isLoading,
    rawTree,
    tree,
    filterTab,
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

  const fail = (err: unknown) => {
    message.error(getApiErrorMessage(err) ?? 'Не удалось выполнить действие');
  };

  const clearProgramSelection = () => {
    const next = new URLSearchParams(searchParams);
    dropProgramParams(next);
    setSearchParams(next, { replace: true });
  };

  const changeFilterTab = (tab: SwStructureFilterTab) => {
    setSelectedId(null);
    const next = new URLSearchParams(searchParams);
    if (tab === 'archived') next.set('view', 'archived');
    else next.delete('view');
    dropProgramParams(next);
    setSearchParams(next, { replace: true });
  };

  const changeShowArchived = (value: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('archived', '1');
    else next.delete('archived');
    setSearchParams(next, { replace: true });
  };

  const detailActions: SwStructureDetailActions = useMemo(
    () => ({
      onEdit: node => setModalState({ mode: 'edit', node }),
      onAssign: node => setModalState({ mode: 'responsible', node }),
      onArchive: node =>
        archiveMut.mutate(node.id, {
          onSuccess: () => message.success('Ветка переведена в архив'),
          onError: fail,
        }),
      onRestore: node =>
        restoreMut.mutate(node.id, {
          onSuccess: () => message.success('Ветка возвращена из архива'),
          onError: fail,
        }),
      onMarkDeleted: node =>
        markDeletedMut.mutate(node.id, {
          onSuccess: () => {
            message.success('Ветка помечена удаленной');
            setSelectedId(null);
            const next = new URLSearchParams(searchParams);
            next.delete('elementId');
            setSearchParams(next, { replace: true });
          },
          onError: fail,
        }),
      onRemoveResponsible: (node, userId, roleCode) =>
        removeRespMut.mutate(
          { elementId: node.id, userId, roleCode },
          { onSuccess: () => message.success('Ответственный снят'), onError: fail },
        ),
      onSelectParent: parent => selectNode(parent),
    }),
    [archiveMut, restoreMut, markDeletedMut, removeRespMut, message, selectNode, searchParams, setSearchParams],
  );

  const submitModal = (values: Record<string, string>) => {
    if (!modalState) return;
    if (modalState.mode === 'responsible') {
      addRespMut.mutate(
        { elementId: modalState.node.id, userId: values.userId, roleCode: values.roleCode },
        {
          onSuccess: () => {
            message.success('Ответственный закреплен');
            setModalState(null);
          },
          onError: fail,
        },
      );
      return;
    }
    const payload = {
      parentId: values.parentId || null,
      elementTypeCode: values.elementTypeCode,
      code: values.code,
      name: values.name,
      description: values.description || null,
    };
    if (modalState.mode === 'edit') {
      updateMut.mutate(
        { id: modalState.node.id, payload },
        {
          onSuccess: () => {
            message.success('Элемент обновлен');
            setModalState(null);
          },
          onError: fail,
        },
      );
      return;
    }
    createMut.mutate(payload, {
      onSuccess: () => {
        message.success('Элемент создан');
        setModalState(null);
      },
      onError: fail,
    });
  };

  // Зарегистрированную программу сразу открываем в дереве: пользователь продолжит с комплектом документации.
  const submitCreateProgram = (payload: CreateSwItemPayload) => {
    createProgramMut.mutate(payload, {
      onSuccess: data => {
        if (data.warnings?.length) message.warning(data.warnings.join(' '));
        else message.success('Программа зарегистрирована');
        setProgramTarget(null);
        selectProgram(data);
      },
      onError: err => message.error(getApiErrorMessage(err) ?? 'Не удалось зарегистрировать программу'),
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const modalMode =
    modalState?.mode === 'responsible'
      ? 'responsible'
      : modalState?.mode === 'edit'
        ? 'edit'
        : modalState?.mode === 'child'
          ? 'child'
          : 'create';

  if (structureQuery.isError) {
    return <NotFound errorMessage='Не удалось загрузить структуру' />;
  }

  const isInitialLoad = structureQuery.isLoading && !structureQuery.data;

  // «+» у элемента: добавлять можно только в действующее дерево; у архивного элемента «+» скрывает сам узел.
  const canAddElement = canEdit && filterTab === 'active';
  const canAddProgram = canCreateProgram && filterTab === 'active';

  return (
    <div className={styles.wrap}>
      <BackButton path='/' />

      <PageHeader
        title='Реестр программного обеспечения'
        titleWeight='medium'
        subtitle='структура изделия, программы и комплекты документации'
        filters={
          !isInitialLoad ? (
            <SwStructureListFiltersBar
              activeTab={filterTab}
              onTabChange={changeFilterTab}
              activeCount={activeCount}
              archivedCount={archivedCount}
            />
          ) : undefined
        }
      />

      {isInitialLoad ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : (
        <div className={styles.splitLayout}>
          <div className={styles.treePanel}>
            <SwStructureTreeToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              shownCount={shownCount}
              totalCount={totalInTab}
              showArchivedToggle={filterTab === 'active'}
              showArchived={showArchivedInTree}
              onShowArchivedChange={changeShowArchived}
            />
            {/* role='tree' только при наличии узлов: пустое состояние — обычный текст, а не дерево без treeitem. */}
            <div className={styles.treeBody} role={tree.length > 0 ? 'tree' : undefined}>
              {tree.length > 0 ? (
                tree.map(node => (
                  <SwStructureTreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    selectedId={selectedId}
                    expandedIds={visibleExpandedIds}
                    typeByCode={typeByCode}
                    onToggleExpand={toggleExpand}
                    onSelect={selectNode}
                    programsByElement={search.programsByElement}
                    selectedProgramId={selectedProgramId}
                    onSelectProgram={selectProgram}
                    canAddElement={canAddElement}
                    canAddProgram={canAddProgram}
                    onAddElement={parent => setModalState({ mode: 'child', node: parent })}
                    onAddProgram={element => setProgramTarget(element)}
                  />
                ))
              ) : rawTree.length > 0 ? (
                <div className={styles.treeEmpty}>Ничего не найдено</div>
              ) : (
                <div className={styles.treeEmpty}>
                  {filterTab === 'archived' ? 'Архивных элементов нет' : 'Элементов пока нет'}
                  {/* Пустое дерево: выбрать родителя не из чего, поэтому первый элемент создаётся отсюда. */}
                  {canEdit && filterTab === 'active' ? (
                    <Button type='link' icon={<PlusOutlined />} onClick={() => setModalState({ mode: 'create' })}>
                      Создать первый элемент
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          <div className={`${styles.detailPanel}${selectedProgram ? ` ${styles.detailPanelFitted}` : ''}`}>
            {selectedProgram ? (
              <SwProgramPanel
                item={selectedProgram}
                kindByCode={kindByCode}
                documentKindByCode={docKindByCode}
                gostCodeByKind={gostCodeByKind}
                statusByCode={statusByCode}
                onDeleted={clearProgramSelection}
                onSelectElement={selectElementById}
              />
            ) : programNotFound ? (
              <div className={styles.detailEmpty}>Программа не найдена или удалена</div>
            ) : selectedProgramId ? (
              <div className={styles.branchLoading}>
                <Spin />
              </div>
            ) : selectedNode ? (
              <SwStructureDetailPanel
                node={selectedNode}
                parent={parentNode}
                typeByCode={typeByCode}
                roleByCode={roleByCode}
                canEdit={canEdit}
                actions={detailActions}
                archiveLoading={archiveMut.isPending && archiveMut.variables === selectedNode.id}
                restoreLoading={restoreMut.isPending && restoreMut.variables === selectedNode.id}
                markDeletedLoading={markDeletedMut.isPending && markDeletedMut.variables === selectedNode.id}
                onSelectProgram={selectProgram}
              />
            ) : (
              <div className={styles.detailEmpty}>Выберите элемент в дереве слева</div>
            )}
          </div>
        </div>
      )}

      <SwStructureElementModal
        open={modalState != null}
        mode={modalMode}
        node={modalState && 'node' in modalState ? modalState.node : null}
        tree={activeTreeQuery.data ?? rawTree}
        elementTypes={typesQuery.data ?? []}
        roles={rolesQuery.data ?? []}
        confirmLoading={createMut.isPending || updateMut.isPending || addRespMut.isPending}
        onCancel={() => setModalState(null)}
        onSubmit={submitModal}
      />
      <SwItemCreateModal
        open={programTarget != null}
        defaultElementId={programTarget?.id}
        confirmLoading={createProgramMut.isPending}
        onCancel={() => setProgramTarget(null)}
        onSubmit={submitCreateProgram}
      />
    </div>
  );
}
