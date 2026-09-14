import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Checkbox, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useLocation, useSearchParams } from 'react-router-dom';

import {
  useAddSwResponsible,
  useArchiveSwStructure,
  useCreateSwStructure,
  useMarkSwStructureDeleted,
  useRemoveSwResponsible,
  useRestoreSwStructure,
  useSwItems,
  useSwReferences,
  useSwStructure,
  useUpdateSwStructure,
} from '@/api/swRegistry/swRegistryApiHooks';
import { BackButton } from '@/components/backButton/BackButton';
import { CanAccess } from '@/components/canAccess/CanAccess';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTIONS } from '@/shared/permissions';
import type { SwItemListRow, SwStructureNode } from '@/types/swRegistry';
import { SwProgramPanel } from './SwProgramPanel';
import { SwStructureDetailPanel, type SwStructureDetailActions } from './SwStructureDetailPanel';
import { SwStructureElementModal } from './SwStructureElementModal';
import { SwStructureListFiltersBar } from './SwStructureListFiltersBar';
import styles from './SwStructurePage.module.scss';
import type { SwStructureFilterTab } from './SwStructurePage.types';
import {
  collectStructurePathIds,
  countStructureNodes,
  filterStructureTree,
  findStructureNode,
  findStructureParent,
  firstStructureNode,
} from './swStructureTree';
import { buildNodeCounts, collectBranchPrograms, groupProgramsByElement } from './swStructurePrograms';
import { SwStructureTreeNode } from './SwStructureTreeNode';

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; node: SwStructureNode }
  | { mode: 'child'; node: SwStructureNode }
  | { mode: 'responsible'; node: SwStructureNode };

function resolveFetchRecordState(tab: SwStructureFilterTab, showArchivedInTree: boolean): string {
  if (tab === 'archived') return 'archived';
  return showArchivedInTree ? 'all' : 'active';
}

export default function SwStructurePage() {
  const { message } = App.useApp();
  const location = useLocation();
  const { hasSectionPermission } = usePermissions();
  const canEdit = hasSectionPermission(SECTIONS.SW_STRUCTURE, 'edit');
  const [searchParams, setSearchParams] = useSearchParams();

  const [filterTab, setFilterTab] = useState<SwStructureFilterTab>('active');
  const [showArchivedInTree, setShowArchivedInTree] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('elementId'));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(() => searchParams.get('itemId'));
  const [modalState, setModalState] = useState<ModalState | null>(null);

  const fetchRecordState = resolveFetchRecordState(filterTab, showArchivedInTree);
  const structureQuery = useSwStructure(fetchRecordState);
  const activeTreeQuery = useSwStructure('active');
  const archivedTreeQuery = useSwStructure('archived');
  const typesQuery = useSwReferences('elementTypes');
  const rolesQuery = useSwReferences('responsibilityRoles');
  const kindsQuery = useSwReferences('developmentKinds');
  const docKindsQuery = useSwReferences('documentKinds');
  const statusesQuery = useSwReferences('statuses');
  // Программы грузим целиком: из них считаются счётчики веток и список программ узла.
  const programsQuery = useSwItems({ recordState: 'active', limit: 500 });

  const createMut = useCreateSwStructure();
  const updateMut = useUpdateSwStructure();
  const archiveMut = useArchiveSwStructure();
  const restoreMut = useRestoreSwStructure();
  const markDeletedMut = useMarkSwStructureDeleted();
  const addRespMut = useAddSwResponsible();
  const removeRespMut = useRemoveSwResponsible();

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

  const programs = programsQuery.data?.items ?? [];
  const programsByElement = useMemo(() => groupProgramsByElement(programs), [programs]);

  const rawTree = structureQuery.data ?? [];
  const tree = useMemo(() => filterStructureTree(rawTree, searchQuery), [rawTree, searchQuery]);
  const shownCount = countStructureNodes(tree);
  const totalInTab = countStructureNodes(rawTree);
  const activeCount = countStructureNodes(activeTreeQuery.data ?? []);
  const archivedCount = countStructureNodes(archivedTreeQuery.data ?? []);

  const countsByNode = useMemo(() => buildNodeCounts(rawTree, programsByElement), [rawTree, programsByElement]);

  const selectedNode = useMemo(
    () => (selectedId ? findStructureNode(rawTree, selectedId) : null),
    [rawTree, selectedId],
  );
  const branchPrograms = useMemo(
    () => (selectedNode ? collectBranchPrograms(selectedNode, programsByElement) : []),
    [selectedNode, programsByElement],
  );
  const selectedProgram = useMemo(
    () => (selectedProgramId ? (programs.find(item => item.id === selectedProgramId) ?? null) : null),
    [programs, selectedProgramId],
  );
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
      setSelectedProgramId(null);
      expandPath(node.id, rawTree);
      // Раскрываем сам узел: иначе счётчик обещает программы, а в дереве их не видно.
      setExpandedIds(prev => (prev.has(node.id) ? prev : new Set(prev).add(node.id)));
      const next = new URLSearchParams(searchParams);
      next.set('elementId', node.id);
      next.delete('itemId');
      setSearchParams(next, { replace: true });
    },
    [expandPath, rawTree, searchParams, setSearchParams],
  );

  const selectProgram = useCallback(
    (item: SwItemListRow) => {
      setSelectedProgramId(item.id);
      setSelectedId(item.element.id);
      expandPath(item.element.id, rawTree);
      setExpandedIds(prev => new Set(prev).add(item.element.id));
      const next = new URLSearchParams(searchParams);
      next.set('elementId', item.element.id);
      next.set('itemId', item.id);
      setSearchParams(next, { replace: true });
    },
    [expandPath, rawTree, searchParams, setSearchParams],
  );

  useEffect(() => {
    if (structureQuery.isLoading || rawTree.length === 0) return;

    const urlId = searchParams.get('elementId');
    if (urlId && findStructureNode(rawTree, urlId)) {
      setSelectedId(prev => (prev === urlId ? prev : urlId));
      expandPath(urlId, rawTree);
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
  }, [structureQuery.isLoading, rawTree, tree, filterTab, showArchivedInTree, searchParams, selectedId, expandPath, setSearchParams]);

  // Пришли по ссылке с выбранной программой — раскрываем её ветку, иначе непонятно, что выбрано.
  useEffect(() => {
    if (!selectedProgramId || rawTree.length === 0) return;
    const program = programs.find(item => item.id === selectedProgramId);
    if (!program) return;
    expandPath(program.element.id, rawTree);
    setExpandedIds(prev => (prev.has(program.element.id) ? prev : new Set(prev).add(program.element.id)));
  }, [selectedProgramId, programs, rawTree, expandPath]);

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

  return (
    <div className={styles.wrap}>
      <BackButton path='/' />

      <PageHeader
        title='Реестр программного обеспечения'
        titleWeight='medium'
        subtitle='структура изделия, программы и комплекты документации'
        actions={
          <div className={styles.headerActions}>
            {filterTab === 'active' ? (
              <Checkbox checked={showArchivedInTree} onChange={e => setShowArchivedInTree(e.target.checked)}>
                <span className={styles.showArchived}>Показывать архивные</span>
              </Checkbox>
            ) : null}
            <CanAccess section={SECTIONS.SW_STRUCTURE} action='edit'>
              <Button type='primary' icon={<PlusOutlined />} onClick={() => setModalState({ mode: 'create' })}>
                Создать элемент
              </Button>
            </CanAccess>
          </div>
        }
        filters={
          !isInitialLoad ? (
            <SwStructureListFiltersBar
              activeTab={filterTab}
              onTabChange={tab => {
                setFilterTab(tab);
                setSelectedId(null);
              }}
              activeCount={activeCount}
              archivedCount={archivedCount}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              shownCount={shownCount}
              totalCount={totalInTab}
            />
          ) : undefined
        }
      />

      {isInitialLoad ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : tree.length === 0 ? (
        <div className={styles.empty}>Элементов пока нет</div>
      ) : (
        <div className={styles.splitLayout}>
          <div className={styles.treePanel} role='tree'>
            {tree.map(node => (
              <SwStructureTreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                expandedIds={expandedIds}
                typeByCode={typeByCode}
                onToggleExpand={toggleExpand}
                onSelect={selectNode}
                programsByElement={programsByElement}
                countsByNode={countsByNode}
                selectedProgramId={selectedProgramId}
                onSelectProgram={selectProgram}
              />
            ))}
          </div>
          <div className={`${styles.detailPanel}${selectedProgram ? ` ${styles.detailPanelFitted}` : ''}`}>
            {selectedProgram ? (
              <SwProgramPanel
                item={selectedProgram}
                kindByCode={kindByCode}
                documentKindByCode={docKindByCode}
                gostCodeByKind={gostCodeByKind}
                statusByCode={statusByCode}
                returnPath={`${location.pathname}${location.search}`}
              />
            ) : selectedNode ? (
              <SwStructureDetailPanel
                node={selectedNode}
                parent={parentNode}
                typeByCode={typeByCode}
                roleByCode={roleByCode}
                kindByCode={kindByCode}
                canEdit={canEdit}
                actions={detailActions}
                archiveLoading={archiveMut.isPending && archiveMut.variables === selectedNode.id}
                restoreLoading={restoreMut.isPending && restoreMut.variables === selectedNode.id}
                markDeletedLoading={markDeletedMut.isPending && markDeletedMut.variables === selectedNode.id}
                branchPrograms={branchPrograms}
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
    </div>
  );
}
