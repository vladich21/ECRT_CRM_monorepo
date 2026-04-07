import type { QueryClient } from '@tanstack/react-query';

import type { PartnerListParams } from './partnerApi';

/**
 * Единая фабрика ключей React Query для домена «партнёры».
 * Меняйте строки и порядок сегментов только здесь — списки, деталка и инвалидации останутся согласованными.
 */
export const partnerQueryKeys = {
  /** Префикс всех запросов партнёров; подходит для invalidateQueries({ queryKey }) с prefix-match */
  all: ['partners'] as const,

  list: (filters: PartnerListParams | null, page: number | undefined, pageSize: number | undefined) =>
    [...partnerQueryKeys.all, 'list', filters, page, pageSize] as const,

  /**
   * Карточка по id (как в API до фабрики): ['partners', uuid].
   * Отдельного сегмента 'detail' нет — иначе сломался бы существующий кэш.
   */
  detail: (partnerId: string) => [...partnerQueryKeys.all, partnerId] as const,

  /** Счётчики вкладок на реестре */
  tabCount: (tabKey: string, searchTrimmed: string, appliedFilters: PartnerTabCountFilters) =>
    [...partnerQueryKeys.all, 'tab-count', tabKey, searchTrimmed, appliedFilters] as const,

  contacts: (partnerId?: string) => [...partnerQueryKeys.all, partnerId?.toString() as string | undefined, 'contacts'] as const,

  /** Справочник партнёров для селектов (реестр оценок и т.п.) */
  referenceList: () => [...partnerQueryKeys.all, 'reference'] as const,
} as const;

/** Структура как у PartnerFilters на странице списка (без импорта из pages → api). */
export type PartnerTabCountFilters = {
  typeIds: string[];
  statusIds: string[];
  competenceIds: string[];
};

export function invalidatePartnerQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: partnerQueryKeys.all });
}
