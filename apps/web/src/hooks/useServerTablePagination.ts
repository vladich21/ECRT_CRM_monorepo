import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { TablePaginationConfig } from 'antd/es/table';

/**
 * Серверная пагинация списков:
 * - `useServerTablePagination` - состояние page / pageSize
 * - `build*QueryResetKey` - ключ параметров запроса без page (фильтры, сорт, поиск)
 * - `useResetPageWhenListQueryChanges` - сброс на 1-ю страницу при смене ключа
 * - `useRestoreToken` - после программного restore (nav / localStorage) page не сбрасывается
 * - `useServerPaginationClamp` - page не выходит за пределы при уменьшении total
 */

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE_OPTIONS = ['20', '50', '100'];

export interface UseServerTablePaginationOptions {
  defaultPageSize?: number;
  pageSizeOptions?: string[];
}

export interface UseServerTablePaginationResult {
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  getPaginationConfig: (total: number) => TablePaginationConfig;
  handleTableChange: (pagination: TablePaginationConfig) => void;
  resetPage: () => void;
}

export function useServerTablePagination(
  options?: UseServerTablePaginationOptions,
): UseServerTablePaginationResult {
  const { defaultPageSize = DEFAULT_PAGE_SIZE, pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS } = options ?? {};
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const resetPage = useCallback(() => setPage(1), []);
  const handleTableChange = useCallback(
    (pagination: TablePaginationConfig) => {
      const nextPageSize =
        pagination.pageSize != null ? Number(pagination.pageSize) : undefined;
      if (nextPageSize != null && !Number.isNaN(nextPageSize) && nextPageSize !== pageSize) {
        setPageSize(nextPageSize);
        setPage(1);
        return;
      }
      if (pagination.current != null) setPage(pagination.current);
    },
    [pageSize],
  );
  const getPaginationConfig = useCallback(
    (total: number): TablePaginationConfig => ({
      total,
      current: page,
      pageSize,
      showSizeChanger: true,
      pageSizeOptions,
      showTotal: (t: number, range: [number, number]) => `${range[0]}-${range[1]} из ${t}`,
    }),
    [page, pageSize, pageSizeOptions],
  );
  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    getPaginationConfig,
    handleTableChange,
    resetPage,
  };
}

/** Счётчик «программный restore» — увеличивают после восстановления UI из nav/localStorage. */
export function useRestoreToken(): readonly [number, () => void] {
  return useReducer((value: number) => value + 1, 0);
}

/** Alias для читаемости: «поколение restore списка» — не сбрасывать page/scroll после programmatic restore. */
export const useListRestoreGeneration = useRestoreToken;

/**
 * Сброс page → 1 при смене queryResetKey (фильтры / сорт / поиск).
 * restoreToken увеличивают после программного restore - page сохраняется.
 */
export function useResetPageWhenListQueryChanges(
  queryResetKey: string,
  resetPage: () => void,
  restoreToken = 0,
) {
  const prevRestoreTokenRef = useRef(restoreToken);
  const prevQueryResetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (restoreToken !== prevRestoreTokenRef.current) {
      prevRestoreTokenRef.current = restoreToken;
      prevQueryResetKeyRef.current = queryResetKey;
      return;
    }

    if (prevQueryResetKeyRef.current === null) {
      prevQueryResetKeyRef.current = queryResetKey;
      return;
    }

    if (prevQueryResetKeyRef.current === queryResetKey) return;

    prevQueryResetKeyRef.current = queryResetKey;
    resetPage();
  }, [queryResetKey, resetPage, restoreToken]);
}

/** Если total уменьшился (фильтры), не оставлять page за пределами последней страницы. */
export function useServerPaginationClamp(options: {
  total: number;
  page: number;
  pageSize: number;
  disabled?: boolean;
  handleTableChange: (pagination: TablePaginationConfig) => void;
}) {
  const { total, page, pageSize, disabled = false, handleTableChange } = options;

  useEffect(() => {
    if (disabled || total <= 0) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (page > maxPage) {
      handleTableChange({ current: maxPage, pageSize });
    }
  }, [total, pageSize, page, disabled, handleTableChange]);
}
