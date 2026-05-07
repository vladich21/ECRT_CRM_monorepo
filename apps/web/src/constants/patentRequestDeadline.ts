function startOfLocalCalendarDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Есть заполненный срок и календарная дата строго раньше сегодняшней (локально). */
export function isPatentRequestDeadlineOverdue(deadline: Date | null | undefined): boolean {
  if (deadline == null || Number.isNaN(deadline.getTime())) return false;
  const now = new Date();
  return startOfLocalCalendarDay(deadline) < startOfLocalCalendarDay(now);
}
