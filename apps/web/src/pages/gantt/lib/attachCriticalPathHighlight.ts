import type { IApi, ILink, TID } from '@svar-ui/react-gantt';

import { computeCriticalPath } from './criticalPath';
import { linksFromApi } from './ganttApi';

type TaskTree = {
  byId: (id: TID) => { id: TID; $critical?: boolean } | undefined;
  update: (id: TID, patch: { $critical: boolean }) => void;
  forEach: (fn: (task: { id: TID; $critical?: boolean }) => void) => void;
};

type LinkArray = {
  byId?: (id: TID) => { id: TID; $critical?: boolean } | undefined;
  update?: (id: TID, patch: { $critical: boolean }) => void;
  serialize?: () => Array<{ id?: TID; $critical?: boolean }>;
};

/**
 * MIT: PRO CPM не считает `$critical`, но UI уже умеет класс `wx-critical`,
 * если в store `criticalPath` truthy и у задачи/связи `$critical === true`.
 */
export function applyCriticalPathFlags(
  api: IApi,
  enabled: boolean,
  linksFallback: ILink[] = [],
): void {
  const tasks = api.serialize();
  const links = linksFromApi(api, linksFallback);
  const { taskIds, linkIds } = enabled
    ? computeCriticalPath(tasks, links)
    : { taskIds: new Set<string>(), linkIds: new Set<string>() };

  const state = api.getState() as {
    tasks: TaskTree;
    links: LinkArray | ILink[];
    _links?: Array<{ id?: TID; $critical?: boolean }>;
  };

  const tree = state.tasks;
  tree.forEach(task => {
    if (task.id == null) return;
    const want = enabled && taskIds.has(String(task.id));
    if (!!task.$critical !== want) {
      tree.update(task.id, { $critical: want });
    }
  });

  const linksStore = state.links;
  if (linksStore && typeof linksStore === 'object' && 'update' in linksStore && linksStore.update) {
    const serialized =
      typeof linksStore.serialize === 'function'
        ? linksStore.serialize()
        : Array.isArray(linksStore)
          ? linksStore
          : links;
    for (const link of serialized) {
      if (link.id == null) continue;
      const want = enabled && linkIds.has(String(link.id));
      const current =
        typeof linksStore.byId === 'function' ? linksStore.byId(link.id) : link;
      if (current && !!current.$critical !== want) {
        linksStore.update(link.id, { $critical: want });
      }
    }
  }

  // Включаем нативную отрисовку wx-critical; трогаем _links, чтобы пересобрать слой связей.
  const nextLinks = Array.isArray(state._links)
    ? state._links.map(link => ({
        ...link,
        $critical: enabled && link.id != null && linkIds.has(String(link.id)),
      }))
    : state._links;

  api.getStores().data.setState({
    criticalPath: enabled ? { type: 'flexible' } : null,
    ...(nextLinks ? { _links: nextLinks } : {}),
  } as never);
}

export type CriticalPathController = {
  refresh: () => void;
  setEnabled: (enabled: boolean) => void;
  detach: () => void;
};

export function attachCriticalPathHighlight(
  api: IApi,
  _root: HTMLElement | null,
  options: {
    initiallyEnabled?: boolean;
    linksFallback?: () => ILink[];
  } = {},
): CriticalPathController {
  const tag = { tag: 'gantt-critical-path' };
  api.detach(tag.tag);

  let enabled = options.initiallyEnabled ?? false;
  let timer: number | null = null;

  const run = () => {
    try {
      applyCriticalPathFlags(api, enabled, options.linksFallback?.() ?? []);
    } catch {
      /* ignore transient store state */
    }
  };

  const refresh = () => {
    if (timer != null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      run();
    }, 30);
  };

  const setEnabled = (next: boolean) => {
    enabled = next;
    run();
  };

  for (const event of [
    'update-task',
    'add-task',
    'delete-task',
    'add-link',
    'update-link',
    'delete-link',
    'move-task',
  ] as const) {
    api.on(event, refresh, tag);
  }

  run();

  return {
    refresh,
    setEnabled,
    detach: () => {
      if (timer != null) window.clearTimeout(timer);
      api.detach(tag.tag);
      try {
        applyCriticalPathFlags(api, false, options.linksFallback?.() ?? []);
      } catch {
        /* ignore */
      }
    },
  };
}
