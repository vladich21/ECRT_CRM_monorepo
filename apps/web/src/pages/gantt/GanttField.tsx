import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Spin } from 'antd';
import { Locale } from '@svar-ui/react-core';
import {
  ContextMenu,
  Editor,
  Gantt,
  Willow,
  type IApi,
  type ILink,
} from '@svar-ui/react-gantt';

import './svar-gantt.css';

import { useGanttHierarchy } from '../../api/gantt/ganttApiHooks';
import { GanttChromeToolbar } from './GanttChromeToolbar';
import { USE_GANTT_MOCKS } from './ganttConfig';
import {
  createGanttContextMenuOptions,
  filterGanttContextMenu,
} from './ganttContextMenu';
import { GANTT_UI } from './ganttFeatures';
import { GANTT_GRID_COLUMNS } from './ganttGridColumns';
import { GANTT_RU_LOCALE } from './ganttRuLocale';
import { createGanttToolbarItems } from './ganttToolbar';
import { GANTT_MONTH_CELL_WIDTH, GANTT_MONTH_SCALES, GANTT_ZOOM_CONFIG } from './ganttZoom';
import { autoScheduleFs, tasksDatesEqual } from './lib/autoScheduleFs';
import { assertTaskDatesWithinStage } from './lib/stageDateBounds';
import { isGanttWorkTask } from './lib/ganttTaskStore';
import { attachApiTaskPersist } from './lib/attachApiTaskPersist';
import { attachConfirmGuards } from './lib/attachConfirmGuards';
import {
  attachCriticalPathHighlight,
  type CriticalPathController,
} from './lib/attachCriticalPathHighlight';
import { attachChartPersist, loadChartSnapshot } from './lib/chartPersist';
import { attachHierarchyMoveGuard } from './lib/attachHierarchyMoveGuard';
import { attachSelectionChrome } from './lib/attachSelectionChrome';
import { attachTaskTypeSync } from './lib/attachTaskTypeSync';
import { attachTimelinePan } from './lib/attachTimelinePan';
import { attachTodayMarker } from './lib/attachTodayMarker';
import { attachZoomAnchor } from './lib/attachZoomAnchor';
import { exportGanttToExcel } from './lib/exportGanttToExcel';
import { filterGanttLinksByTasks, filterGanttTasksByQuery } from './lib/filterGanttTasksByQuery';
import { cloneGanttTasks, linksFromApi, scrollChartToCurrentMonth } from './lib/ganttApi';
import { hierarchyChartKey } from './lib/hierarchyChartKey';
import { mapApiHierarchyToGantt } from './lib/mapApiHierarchyToGantt';
import { mapAllMockProjectsToGantt } from './lib/mapHierarchyToGantt';
import { openLinkedBranches } from './lib/openLinkedBranches';
import { presentGanttDateWarnings } from './lib/presentGanttDateWarnings';
import { applyOpenState, attachTreeOpenPersist, loadOpenIdsForChart } from './lib/treeOpenState';
import { highlightWorkCalendar } from './lib/workCalendar';
import { GANTT_MOCK_PROJECTS } from './mock/ganttHierarchyMock';
import styles from './GanttField.module.scss';

type GanttFieldProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
};

/**
 * Gantt chart + chrome (search / hotkeys / excel / critical path).
 * Runtime attach* вынесены в lib; этот файл только wiring.
 */
export function GanttField({ searchQuery, onSearchQueryChange }: GanttFieldProps) {
  const { modal, message } = App.useApp();
  const schedulingRef = useRef(false);
  const linksFallbackRef = useRef<ILink[]>([]);
  const chartRootRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<IApi | null>(null);
  const confirmRef = useRef(modal.confirm);
  confirmRef.current = modal.confirm;
  const criticalRef = useRef<CriticalPathController | null>(null);
  const warningsShownRef = useRef(false);

  const [api, setApi] = useState<IApi | null>(null);
  const [chartEpoch, setChartEpoch] = useState(0);
  const [criticalPathEnabled, setCriticalPathEnabled] = useState(false);
  const [excelExporting, setExcelExporting] = useState(false);

  const hierarchyQuery = useGanttHierarchy(!USE_GANTT_MOCKS);
  const refetchHierarchy = hierarchyQuery.refetch;
  const chartDataKey = USE_GANTT_MOCKS
    ? 'mocks'
    : hierarchyChartKey(hierarchyQuery.data);

  const toolbarItems = useMemo(
    () => createGanttToolbarItems(() => apiRef.current, props => confirmRef.current(props)),
    [],
  );
  const contextMenuOptions = useMemo(() => createGanttContextMenuOptions(), []);

  const sourceChart = useMemo(() => {
    if (USE_GANTT_MOCKS) {
      return (
        (GANTT_UI.chartPersist ? loadChartSnapshot() : null) ??
        mapAllMockProjectsToGantt(GANTT_MOCK_PROJECTS)
      );
    }
    if (!hierarchyQuery.data) return { tasks: [], links: [] as ILink[] };
    return mapApiHierarchyToGantt(hierarchyQuery.data);
  }, [hierarchyQuery.data]);

  const mapped = useMemo(() => {
    const filteredTasks = filterGanttTasksByQuery(sourceChart.tasks, searchQuery);
    const filteredLinks = filterGanttLinksByTasks(sourceChart.links, filteredTasks);
    const scheduled = autoScheduleFs(cloneGanttTasks(filteredTasks), filteredLinks);
    let tasks = GANTT_UI.openLinkedBranches
      ? openLinkedBranches(scheduled, filteredLinks)
      : scheduled;
    if (GANTT_UI.treeOpenPersist) {
      tasks = applyOpenState(tasks, loadOpenIdsForChart());
    }
    return { tasks, links: filteredLinks };
  }, [searchQuery, sourceChart]);

  useEffect(() => {
    linksFallbackRef.current = mapped.links;
  }, [mapped]);

  useEffect(() => {
    if (USE_GANTT_MOCKS || !hierarchyQuery.data || warningsShownRef.current) return;
    const warnings = hierarchyQuery.data.date_warnings ?? [];
    if (warnings.length === 0) return;
    warningsShownRef.current = true;
    presentGanttDateWarnings(warnings, props => confirmRef.current(props), () => {
      void refetchHierarchy();
    });
  }, [hierarchyQuery.data, refetchHierarchy]);

  const applyAutoSchedule = useCallback(async (ganttApi: IApi) => {
    if (!GANTT_UI.fsAutoSchedule || schedulingRef.current) return;
    schedulingRef.current = true;
    try {
      const before = ganttApi.serialize();
      const links = linksFromApi(ganttApi, linksFallbackRef.current);
      linksFallbackRef.current = links;
      const scheduled = autoScheduleFs(cloneGanttTasks(before), links);
      const beforeById = new Map(before.map(task => [String(task.id), task]));

      const updates: Promise<unknown>[] = [];
      for (const task of scheduled) {
        if (task.id == null || !task.start || !task.end) continue;
        const previous = beforeById.get(String(task.id));
        if (previous && tasksDatesEqual(previous, task)) continue;

        // FS не должен уводить задачи за срок этапа → иначе API 400.
        // Даты project/contract не трогаем — только из карточек.
        const kind = (task as { entityKind?: string }).entityKind;
        if (kind === 'project' || kind === 'contract' || kind === 'stage') continue;
        if ((task as { type?: string }).type === 'summary') continue;

        if (isGanttWorkTask(task)) {
          const stageError = assertTaskDatesWithinStage(ganttApi, task.id, {
            start: task.start,
            end: task.end,
          });
          if (stageError) continue;
        }

        updates.push(
          ganttApi.exec('update-task', {
            id: task.id,
            task: {
              start: task.start,
              end: task.end,
              duration: task.duration,
            },
            skipConfirm: true,
          }),
        );
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }
    } finally {
      schedulingRef.current = false;
    }
  }, []);

  const handleInit = useCallback(
    (ganttApi: IApi) => {
      apiRef.current = ganttApi;
      setApi(ganttApi);
      setChartEpoch(epoch => epoch + 1);

      const tag = { tag: 'gantt-fs-all-projects' };
      ganttApi.detach(tag.tag);

      const scheduleIfIdle = () => {
        if (schedulingRef.current) return;
        void applyAutoSchedule(ganttApi);
      };

      ganttApi.on(
        'update-task',
        (ev: { inProgress?: boolean; task?: Partial<{ start?: unknown; end?: unknown; duration?: unknown }> }) => {
          if (ev?.inProgress) return;
          // Только сдвиг дат — не progress / text (иначе FS двигает чужие задачи).
          const patch = ev?.task;
          if (!patch) return;
          if (!('start' in patch || 'end' in patch || 'duration' in patch)) return;
          scheduleIfIdle();
        },
        tag,
      );
      ganttApi.on('add-task', scheduleIfIdle, tag);
      ganttApi.on('add-link', scheduleIfIdle, tag);
      ganttApi.on('update-link', scheduleIfIdle, tag);
      ganttApi.on('delete-link', scheduleIfIdle, tag);
    },
    [applyAutoSchedule],
  );

  useEffect(() => {
    if (!api) return;

    const detachSelection = attachSelectionChrome(api);
    const detachHierarchy = attachHierarchyMoveGuard(api);
    const detachTypeSync = attachTaskTypeSync(api);
    const detachConfirm = attachConfirmGuards(api, props => confirmRef.current(props));
    const detachTreeOpen = GANTT_UI.treeOpenPersist ? attachTreeOpenPersist(api) : null;
    const detachChart =
      USE_GANTT_MOCKS && GANTT_UI.chartPersist
        ? attachChartPersist(api, () => linksFallbackRef.current)
        : null;
    const detachApi =
      !USE_GANTT_MOCKS
        ? attachApiTaskPersist(api, () => {
            void refetchHierarchy();
          })
        : null;

    return () => {
      detachSelection();
      detachHierarchy();
      detachTypeSync();
      detachConfirm();
      detachTreeOpen?.();
      detachChart?.();
      detachApi?.();
    };
  }, [api, refetchHierarchy]);

  useEffect(() => {
    const root = chartRootRef.current;
    if (!root || !api || chartEpoch === 0) return;

    let detachPan: (() => void) | null = null;
    let detachToday: (() => void) | null = null;
    let detachZoom: (() => void) | null = null;

    const timer = window.setTimeout(() => {
      detachPan = attachTimelinePan(api, root);
      detachZoom = attachZoomAnchor(api, root);
      const chartEl = root.querySelector('.wx-chart') as HTMLElement | null;
      if (chartEl) {
        scrollChartToCurrentMonth(api, chartEl);
      }
      if (GANTT_UI.todayMarker) {
        detachToday = attachTodayMarker(api);
      }
    }, 80);

    return () => {
      window.clearTimeout(timer);
      detachPan?.();
      detachZoom?.();
      detachToday?.();
    };
  }, [api, chartEpoch, searchQuery]);

  useEffect(() => {
    const root = chartRootRef.current;
    if (!root || !api || chartEpoch === 0 || !GANTT_UI.criticalPath) return;

    const controller = attachCriticalPathHighlight(api, root, {
      initiallyEnabled: criticalPathEnabled,
      linksFallback: () => linksFallbackRef.current,
    });
    criticalRef.current = controller;
    controller.setEnabled(criticalPathEnabled);

    return () => {
      controller.detach();
      if (criticalRef.current === controller) {
        criticalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, chartEpoch, searchQuery]);

  useEffect(() => {
    criticalRef.current?.setEnabled(criticalPathEnabled);
  }, [criticalPathEnabled]);

  const handleExcelExport = useCallback(async () => {
    const ganttApi = apiRef.current;
    if (!ganttApi) {
      message.warning('Диаграмма ещё не готова');
      return;
    }
    setExcelExporting(true);
    try {
      const tasks = ganttApi.serialize();
      const links = linksFromApi(ganttApi, linksFallbackRef.current);
      await exportGanttToExcel(tasks, links);
      message.success('Excel сохранён');
    } catch {
      message.error('Не удалось выгрузить Excel');
    } finally {
      setExcelExporting(false);
    }
  }, [message]);

  const toolbar = (
    <GanttChromeToolbar
      searchQuery={searchQuery}
      onSearchQueryChange={onSearchQueryChange}
      api={api}
      toolbarItems={toolbarItems}
      criticalPathEnabled={criticalPathEnabled}
      onCriticalPathEnabledChange={setCriticalPathEnabled}
      excelExporting={excelExporting}
      excelDisabled={mapped.tasks.length === 0}
      onExcelExport={() => void handleExcelExport()}
    />
  );

  if (!USE_GANTT_MOCKS && hierarchyQuery.isLoading) {
    return (
      <div className={styles.root}>
        {toolbar}
        <div className={styles.empty}>
          <Spin size='large' />
        </div>
      </div>
    );
  }

  if (!USE_GANTT_MOCKS && hierarchyQuery.isError) {
    return (
      <div className={styles.root}>
        {toolbar}
        <div className={styles.empty}>Не удалось загрузить иерархию Ганта</div>
      </div>
    );
  }

  if (mapped.tasks.length === 0) {
    return (
      <div className={styles.root}>
        {toolbar}
        <div className={styles.empty}>
          {searchQuery.trim()
            ? 'Ничего не найдено по запросу'
            : 'Нет проектов для отображения'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {toolbar}
      <div className={styles.chartHost}>
        <Willow>
          <Locale words={GANTT_RU_LOCALE}>
            <ContextMenu
              api={api ?? undefined}
              options={contextMenuOptions}
              filter={(option, task) => filterGanttContextMenu(option, task)}
            >
              <div ref={chartRootRef} className={styles.chart}>
                <Gantt
                  key={`${searchQuery.trim().toLowerCase() || 'all'}-${chartDataKey}`}
                  tasks={mapped.tasks}
                  links={mapped.links}
                  scales={GANTT_MONTH_SCALES}
                  columns={GANTT_GRID_COLUMNS}
                  cellWidth={GANTT_MONTH_CELL_WIDTH}
                  zoom={GANTT_ZOOM_CONFIG}
                  criticalPath={
                    GANTT_UI.criticalPath && criticalPathEnabled
                      ? { type: 'flexible' }
                      : undefined
                  }
                  highlightTime={
                    GANTT_UI.workCalendarHighlight ? highlightWorkCalendar : undefined
                  }
                  init={handleInit}
                />
                {GANTT_UI.taskEditing && api ? (
                  <Editor api={api} placement='sidebar' />
                ) : null}
              </div>
            </ContextMenu>
          </Locale>
        </Willow>
      </div>
    </div>
  );
}
