import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Spin } from 'antd';
import { useSearchParams } from 'react-router-dom';

import { useCreateSwItem, useSwItem, useSwItems } from '@/api/swRegistry/itemsHooks';
import { useSwReferences } from '@/api/swRegistry/referencesHooks';
import { useAddSwResponsible, useArchiveSwStructure, useCreateSwStructure, useMarkSwStructureDeleted, useRemoveSwResponsible, useRestoreSwStructure, useSwStructure, useUpdateSwStructure } from '@/api/swRegistry/structureHooks';
import { BackButton } from '@/components/backButton/BackButton';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTIONS } from '@/shared/permissions';
import type { CreateSwItemPayload, SwItemListRow, SwStructureNode } from '@/types/swRegistry';

import { SwItemModal } from '../items/SwItemModal';
import { SwProgramPanel } from '../program/SwProgramPanel';
import { SwStructureDetailPanel, type SwStructureDetailActions } from './SwStructureDetailPanel';
import { SwStructureElementModal } from './SwStructureElementModal';
import styles from './SwStructurePage.module.scss';
import { groupProgramsByElement, searchStructureTree } from './swStructurePrograms';
import {
  collectStructurePathIds,
  countStructureNodes,
  findStructureNode,
  findStructureParent,
  firstStructureNode,
} from './swStructureTree';
import { SwStructureTreeNode } from './SwStructureTreeNode';
import { SwStructureTreeToolbar } from './SwStructureTreeToolbar';
import { useStructureSelection } from './useStructureSelection';

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; node: SwStructureNode }
  | { mode: 'child'; node: SwStructureNode }
  | { mode: 'responsible'; node: SwStructureNode };

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
  //   archived=1 — архивные элементы и программы в том же дереве; старый view=archived сводим к этой галке;
  //   elementId, itemId — выбор; tab — вкладка панели программы; documentStatus/sheetStatus — фильтр из свода.
  const showArchivedInTree = searchParams.get('archived') === '1' || searchParams.get('view') === 'archived';
  const selectedProgramId = searchParams.get('itemId');

  const [searchQuery, setSearchQuery] = useState('');
  const [modalState, setModalState] = useState<ModalState | null>(null);
  /** Элемент, на котором регистрируется ПО из меню «+» в дереве. */
  const [programTarget, setProgramTarget] = useState<SwStructureNode | null>(null);

  const structureQuery = useSwStructure(showArchivedInTree ? 'all' : 'active');
  const typesQuery = useSwReferences('elementTypes');
  const rolesQuery = useSwReferences('responsibilityRoles');
  const kindsQuery = useSwReferences('developmentKinds');
  const docKindsQuery = useSwReferences('documentKinds');
  const statusesQuery = useSwReferences('statuses');
  const activeProgramsQuery = useSwItems({ recordState: 'active', limit: 500 });
  const archivedProgramsQuery = useSwItems({ recordState: 'archived', limit: 500 });
  const programsLoading = activeProgramsQuery.isLoading || (showArchivedInTree && archivedProgramsQuery.isLoading);

  const createMut = useCreateSwStructure();
  const updateMut = useUpdateSwStructure();
  const archiveMut = useArchiveSwStructure();
  const restoreMut = useRestoreSwStructure();
  const markDeletedMut = useMarkSwStructureDeleted();
  const addRespMut = useAddSwResponsible();
  const removeRespMut = useRemoveSwResponsible();
  const createProgramMut = useCreateSwItem();

  const typeByCode = useMemo(() => new Map((typesQuery.data ?? []).map(t => [t.code, t.name])), [typesQuery.data]);
  const roleByCode = useMemo(() => new Map((rolesQuery.data ?? []).map(r => [r.code, r.name])), [rolesQuery.data]);
  const kindByCode = useMemo(() => new Map((kindsQuery.data ?? []).map(k => [k.code, k.name])), [kindsQuery.data]);

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

  const programs = useMemo(
    () => [
      ...(activeProgramsQuery.data?.items ?? []),
      ...(showArchivedInTree ? (archivedProgramsQuery.data?.items ?? []) : []),
    ],
    [showArchivedInTree, activeProgramsQuery.data, archivedProgramsQuery.data],
  );
  const programsByElement = useMemo(() => groupProgramsByElement(programs), [programs]);

  const rawTree = structureQuery.data ?? [];
  // Поиск идёт по элементам и по программам: дерево показывает программы из выдачи.
  const search = useMemo(
    () => searchStructureTree(rawTree, programsByElement, searchQuery),
    [rawTree, programsByElement, searchQuery],
  );
  const tree = search.tree;
  const totalInTab = countStructureNodes(rawTree) + programs.length;
  const shownCount = searchQuery.trim() ? countStructureNodes(tree) + search.programCount : totalInTab;

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

  const selection = useStructureSelection({
    rawTree,
    tree,
    structureLoading: structureQuery.isLoading,
    selectedProgram,
    selectedProgramId,
    showArchivedInTree,
  });
  const { selectedId, selectedNode, expandedIds, setSelectedId } = selection;

  const parentNode = useMemo(
    () => (selectedId ? findStructureParent(rawTree, selectedId) : null),
    [rawTree, selectedId],
  );

  const { selectNode, selectProgram, selectElementById, clearProgramSelection, changeShowArchived, toggleExpand } =
    selection;

  // Ветки с находками раскрыты поверх раскрытых вручную, иначе найденное в свёрнутой ветке не видно.
  const visibleExpandedIds = useMemo(
    () => (search.expandIds.size > 0 ? new Set([...expandedIds, ...search.expandIds]) : expandedIds),
    [expandedIds, search.expandIds],
  );

  const fail = (err: unknown) => {
    message.error(getApiErrorMessage(err) ?? 'Не удалось выполнить действие');
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
            message.success('Ветка удалена');
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

  const canAddElement = canEdit;
  const canAddProgram = canCreateProgram;

  return (
    <div className={styles.wrap}>
      <BackButton path='/' />

      <PageHeader
        title='Реестр программного обеспечения'
        titleWeight='medium'
        subtitle='структура изделия, программы и комплекты документации'
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
                  Элементов пока нет
                  {canEdit ? (
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
                referencesLoading={statusesQuery.isLoading}
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
        tree={rawTree}
        elementTypes={typesQuery.data ?? []}
        roles={rolesQuery.data ?? []}
        confirmLoading={createMut.isPending || updateMut.isPending || addRespMut.isPending}
        onCancel={() => setModalState(null)}
        onSubmit={submitModal}
      />
      <SwItemModal
        mode='create'
        open={programTarget != null}
        defaultElementId={programTarget?.id}
        confirmLoading={createProgramMut.isPending}
        onCancel={() => setProgramTarget(null)}
        onSubmit={submitCreateProgram}
      />
    </div>
  );
}
