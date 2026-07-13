/** Минимальные данные шага для расчёта включённых шагов при запуске. */
export interface StepInclusionInput {
  stepOrder: number;
  isRequired: boolean | null;
}

/**
 * Определяет, какие шаги войдут в процесс.
 * Обязательные (isRequired !== false) всегда включены.
 * Опциональные — по выбору инициатора; по умолчанию все включены.
 */
export function resolveIncludedStepOrders(
  steps: StepInclusionInput[],
  requested?: number[] | null,
): number[] {
  const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const allOrders = sorted.map((s) => s.stepOrder);
  const hasOptional = sorted.some((s) => s.isRequired === false);

  if (!hasOptional) {
    return allOrders;
  }

  const included = new Set<number>();

  if (requested == null) {
    allOrders.forEach((order) => included.add(order));
  } else {
    for (const order of requested) {
      if (allOrders.includes(order)) included.add(order);
    }
    for (const step of sorted) {
      if (step.isRequired !== false) included.add(step.stepOrder);
    }
  }

  return allOrders.filter((order) => included.has(order));
}

/** Возвращает текст ошибки или null, если выбор корректен. */
export function validateIncludedStepOrders(
  steps: StepInclusionInput[],
  requested?: number[] | null,
): string | null {
  const allOrders = new Set(steps.map((s) => s.stepOrder));
  const hasOptional = steps.some((s) => s.isRequired === false);

  if (!hasOptional) return null;

  if (requested?.length) {
    for (const order of requested) {
      if (!allOrders.has(order)) {
        return `Неизвестный шаг маршрута: ${order}`;
      }
    }
  }

  const included = resolveIncludedStepOrders(steps, requested);
  if (!included.length) {
    return 'Должен быть включён хотя бы один шаг согласования';
  }

  return null;
}

export function isStepOrderIncluded(stepOrder: number, includedStepOrders: number[]): boolean {
  return includedStepOrders.includes(stepOrder);
}
