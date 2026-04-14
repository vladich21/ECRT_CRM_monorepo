import type { TablePaginationConfig } from 'antd/es/table';
import { useEffect } from 'react';

export function usePatentsListPaginationClamp(options: {
  total: number;
  page: number;
  pageSize: number;
  isError: boolean;
  handleTableChange: (pagination: TablePaginationConfig) => void;
}) {
  const { total, page, pageSize, isError, handleTableChange } = options;

  useEffect(() => {
    if (isError) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (page > maxPage) {
      handleTableChange({ current: maxPage, pageSize });
    }
  }, [total, pageSize, page, isError, handleTableChange]);
}
