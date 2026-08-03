const AUTO_AUXILIARY_TASK_NAME = 'Вспомогательная';

export function formatAutoAuxiliaryTaskName(projectCode?: string | null): string {
  const code = projectCode?.trim();
  if (!code) return AUTO_AUXILIARY_TASK_NAME;
  return `${code} — ${AUTO_AUXILIARY_TASK_NAME}`;
}

export function withAutoAuxiliaryProjectCode(
  name: string,
  projectCode: string | null | undefined,
  isAutoAuxiliary: boolean,
): string {
  if (!isAutoAuxiliary) return name;
  return formatAutoAuxiliaryTaskName(projectCode);
}
