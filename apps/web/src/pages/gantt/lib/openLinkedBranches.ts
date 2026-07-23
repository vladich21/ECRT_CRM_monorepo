import type { ILink, ITask } from '@svar-ui/react-gantt';

/**
 * Раскрывает предков source/target связей, чтобы линии зависимостей были видны
 * при старте (остальное дерево остаётся свёрнутым).
 */
export function openLinkedBranches(tasks: ITask[], links: ILink[]): ITask[] {
  if (!links.length) return tasks;

  const byId = new Map(tasks.map(task => [String(task.id), task]));
  const toOpen = new Set<string>();

  for (const link of links) {
    for (const endpoint of [link.source, link.target]) {
      let current = byId.get(String(endpoint));
      while (current?.parent != null && current.parent !== 0 && current.parent !== '0') {
        const parentId = String(current.parent);
        toOpen.add(parentId);
        current = byId.get(parentId);
      }
    }
  }

  if (toOpen.size === 0) return tasks;

  return tasks.map(task =>
    task.id != null && toOpen.has(String(task.id)) ? { ...task, open: true } : task,
  );
}
