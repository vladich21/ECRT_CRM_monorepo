import { Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';

import type { ComparisonQuote } from '@/api/procurement/requests/procurementRequest.types';

import { comparisonCellKind, type ComparisonTableRow } from './purchaseRequestComparisonTable';
import styles from './PurchaseRequestComparison.module.scss';

function renderPartnerHeader(quote: ComparisonQuote, outlier: boolean) {
  return (
    <div className={styles.partnerHead}>
      <Link to={`/partners/${quote.partner_id}`}>{quote.partner_name || 'Поставщик'}</Link>
      {outlier ? <Tag color='warning'>Выброс</Tag> : null}
    </div>
  );
}

export function purchaseRequestComparisonColumns(options: {
  quotes: ComparisonQuote[];
  best: { price: string | null; delivery: string | null; warranty: string | null };
  outlierIds: Set<string>;
}): ColumnsType<ComparisonTableRow> {
  return [
    {
      title: 'Критерий',
      dataIndex: 'criterion',
      width: 180,
      fixed: 'left',
    },
    ...options.quotes.map(quote => ({
      title: renderPartnerHeader(quote, options.outlierIds.has(quote.quote_id)),
      key: quote.quote_id,
      width: 180,
      ellipsis: true,
      render: (_value: unknown, row: ComparisonTableRow) => row.values[quote.quote_id] ?? '—',
      onCell: (row: ComparisonTableRow) => {
        const kind = comparisonCellKind({
          criterion: row.key,
          quoteId: quote.quote_id,
          best: options.best,
          outlierIds: options.outlierIds,
        });
        if (kind === 'best') return { className: styles.best };
        if (kind === 'outlier') return { className: styles.outlier };
        return {};
      },
    })),
  ];
}
