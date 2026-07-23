import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App } from 'antd';
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

import { GanttChromeToolbar } from './GanttChromeToolbar';
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
import { attachConfirmGuards } from './lib/attachConfirmGuards';
import {
  attachCriticalPathHighlight,
  type CriticalPathController,
} from './lib/attachCriticalPathHighlight';
import { attachChartPersist, loadChartSnapshot } from './lib/chartPersist';
import { attachHierarchyMoveGuard } from './lib/attachHierarchyMoveGuard';
import { attachTaskTypeSync } from './lib/attachTaskTypeSync';
import { attachTimelinePan } from './lib/attachTimelinePan';
import { attachTodayMarker } from './lib/attachTodayMarker';
import { exportGanttToExcel } from './lib/exportGanttToExcel';
import { filterGanttLinksByTasks, filterGanttTasksByQuery } from './lib/filterGanttTasksByQuery';
import { cloneGanttTasks, linksFromApi, scrollChartToCurrentMonth } from './lib/ganttApi';
import { mapAllMockProjectsToGantt } from './lib/mapHierarchyToGantt';
import { openLinkedBranches } from './lib/openLinkedBranches';
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

  const [api, setApi] = useState<IApi | null>(null);
  const [chartEpoch, setChartEpoch] = useState(0);
  const [criticalPathEnabled, setCriticalPathEnabled] = useState(false);
  const [excelExporting, setExcelExporting] = useState(false);

  const toolbarItems = useMemo(
    () => createGanttToolbarItems(() => apiRef.current, props => confirmRef.current(props)),
    [],
  );
  const contextMenuOptions = useMemo(() => createGanttContextMenuOptions(), []);

  const mapped = useMemo(() => {
    const chart =
      (GANTT_UI.chartPersist ? loadChartSnapshot() : null) ??
      mapAllMockProjectsToGantt(GANTT_MOCK_PROJECTS);
    const filteredTasks = filterGanttTasksByQuery(chart.tasks, searchQuery);
    const filteredLinks = filterGanttLinksByTasks(chart.links, filteredTasks);
    const scheduled = autoScheduleFs(cloneGanttTasks(filteredTasks), filteredLinks);
    let tasks = GANTT_UI.openLinkedBranches
      ? openLinkedBranches(scheduled, filteredLinks)
      : scheduled;
    if (GANTT_UI.treeOpenPersist) {
      tasks = applyOpenState(tasks, loadOpenIdsForChart());
    }
    return { tasks, links: filteredLinks };
  }, [searchQuery]);

  useEffect(() => {
    linksFallbackRef.current = mapped.links;
  }, [mapped]);

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

        updates.push(
          ganttApi.exec('update-task', {
            id: task.id,
            task: {
              start: task.start,
              end: task.end,
              duration: task.duration,
            },
            // внутренний FS-пересчёт — без confirm на каждую сдвинутую задачу
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
        (ev: { inProgress?: boolean }) => {
          if (ev?.inProgress) return;
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

  // Guards + tree/chart persist (живут на api, без DOM)
  useEffect(() => {
    if (!api) return;

    const detachHierarchy = attachHierarchyMoveGuard(api);
    const detachTypeSync = attachTaskTypeSync(api);
    const detachConfirm = attachConfirmGuards(api, props => confirmRef.current(props));
    const detachTreeOpen = GANTT_UI.treeOpenPersist ? attachTreeOpenPersist(api) : null;
    const detachChart = GANTT_UI.chartPersist
      ? attachChartPersist(api, () => linksFallbackRef.current)
      : null;

    return () => {
      detachHierarchy();
      detachTypeSync();
      detachConfirm();
      detachTreeOpen?.();
      detachChart?.();
    };
  }, [api]);

  // DOM runtime: pan, today, scroll — при remount chart (поиск)
  useEffect(() => {
    const root = chartRootRef.current;
    if (!root || !api || chartEpoch === 0) return;

    let detachPan: (() => void) | null = null;
    let detachToday: (() => void) | null = null;

    const timer = window.setTimeout(() => {
      detachPan = attachTimelinePan(api, root);
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
      detachToday?.();
    };
  }, [api, chartEpoch, searchQuery]);

  // Critical path — отдельный lifecycle; toggle через setEnabled
  useEffect(() => {
    const root = chartRootRef.current;
    if (!root || !api || chartEpoch === 0 || !GANTT_UI.criticalPath) return;

    const controller = attachCriticalPathHighlight(api, root, {
      initiallyEnabled: criticalPathEnabled,
      linksFallback: () => linksFallbackRef.current,
    });
    criticalRef.current = controller;
    // синхронизировать текущее значение тумблера сразу после attach
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

  if (mapped.tasks.length === 0) {
    return (
      <div className={styles.root}>
        {toolbar}
        <div className={styles.empty}>Ничего не найдено по запросу</div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Willow>
        <Locale words={GANTT_RU_LOCALE}>
          <ContextMenu
            api={api ?? undefined}
            options={contextMenuOptions}
            filter={(option, task) => filterGanttContextMenu(option, task)}
          >
            <div className={styles.shell}>
              {toolbar}

              <div ref={chartRootRef} className={styles.chart}>
                <Gantt
                  key={searchQuery.trim().toLowerCase() || 'all'}
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
              </div>

              {GANTT_UI.taskEditing && api ? (
                <Editor api={api} placement='sidebar' />
              ) : null}
            </div>
          </ContextMenu>
        </Locale>
      </Willow>
    </div>
  );
}
