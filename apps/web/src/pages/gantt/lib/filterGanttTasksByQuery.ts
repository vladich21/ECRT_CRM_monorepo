import type { ILink, ITask } from '@svar-ui/react-gantt';

/**
 * Фильтр дерева Gantt по строке поиска.
 * Оставляет узлы, у которых совпало название, плюс всех предков (чтобы путь не ломался)
 * и всех потомков совпавшего узла.
 */
export function filterGanttTasksByQuery(tasks: ITask[], query: string): ITask[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return tasks;

  const byId = new Map<string, ITask>();
  const childrenByParent = new Map<string, ITask[]>();

  for (const task of tasks) {
    if (task.id == null) continue;
    const id = String(task.id);
    byId.set(id, task);
    const parentKey = String(task.parent ?? 0);
    const list = childrenByParent.get(parentKey) ?? [];
    list.push(task);
    childrenByParent.set(parentKey, list);
  }

  const matched = new Set<string>();

  for (const task of tasks) {
    if (task.id == null) continue;
    const text = String(task.text ?? task.entityName ?? '').toLowerCase();
    const code = String(
      (task as ITask & { projectCode?: string }).projectCode ?? '',
    ).toLowerCase();
    if (text.includes(normalized) || (code && code.includes(normalized))) {
      matched.add(String(task.id));
    }
  }

  if (matched.size === 0) return [];

  const keep = new Set<string>(matched);

  for (const id of matched) {
    let current = byId.get(id);
    while (current?.parent != null && current.parent !== 0 && current.parent !== '0') {
      const parentId = String(current.parent);
      keep.add(parentId);
      current = byId.get(parentId);
    }
  }

  function addDescendants(id: string): void {
    for (const child of childrenByParent.get(id) ?? []) {
      if (child.id == null) continue;
      const childId = String(child.id);
      if (keep.has(childId)) continue;
      keep.add(childId);
      addDescendants(childId);
    }
  }

  for (const id of [...matched]) {
    addDescendants(id);
  }

  return tasks.filter(task => task.id != null && keep.has(String(task.id)));
}

export function filterGanttLinksByTasks(links: ILink[], tasks: ITask[]): ILink[] {
  const ids = new Set(tasks.map(task => String(task.id)));
  return links.filter(link => ids.has(String(link.source)) && ids.has(String(link.target)));
}
