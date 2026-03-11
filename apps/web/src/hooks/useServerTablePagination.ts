import type { TablePaginationConfig } from 'antd/es/table';
import { useCallback, useState } from 'react';

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE_OPTIONS = ['20', '50', '100'];

export interface UseServerTablePaginationOptions {
  defaultPageSize?: number;
  pageSizeOptions?: string[];
}

export interface UseServerTablePaginationResult {
  page: number;
  pageSize: number;
  getPaginationConfig: (total: number) => TablePaginationConfig;
  handleTableChange: (pagination: TablePaginationConfig) => void;
  resetPage: () => void;
}

export function useServerTablePagination(
  options?: UseServerTablePaginationOptions,
): UseServerTablePaginationResult {
  const {
    defaultPageSize = DEFAULT_PAGE_SIZE,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  } = options ?? {};

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const resetPage = useCallback(() => setPage(1), []);

  const handleTableChange = useCallback(
    (pagination: TablePaginationConfig) => {
      if (pagination.current != null) setPage(pagination.current);
      if (pagination.pageSize != null && pagination.pageSize !== pageSize) {
        setPageSize(pagination.pageSize);
        setPage(1);
      }
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
    getPaginationConfig,
    handleTableChange,
    resetPage,
  };
}
