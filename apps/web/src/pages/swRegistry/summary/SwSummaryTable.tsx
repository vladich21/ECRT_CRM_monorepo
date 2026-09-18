import { Link } from 'react-router-dom';

import type { SwSummaryResponse, SwSummaryRow } from '@/types/swRegistry';
import { buildSummaryDrillHref, type SummaryBy } from './swSummaryNavigation';
import { getSummaryStatusShortLabel } from './swSummaryStatusLabels';
import styles from './SwSummaryTable.module.scss';

type SwSummaryTableProps = {
  by: SummaryBy;
  data: SwSummaryResponse;
  rowLabel: string;
  returnPath: string;
  resolveRowName?: (row: SwSummaryRow) => string;
};

function renderCount(
  count: number,
  href: string | null,
  returnPath: string,
) {
  if (count <= 0) return <span className={styles.cellEmpty}>—</span>;
  if (!href) return count;
  return (
    <Link to={href} state={{ from: returnPath }} className={styles.cellLink} onClick={e => e.stopPropagation()}>
      {count}
    </Link>
  );
}

export function SwSummaryTable({ by, data, rowLabel, returnPath, resolveRowName }: SwSummaryTableProps) {
  const docCols = data.columns.document;
  const sheetCols = data.columns.sheet;

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableWrap}>
        <table className={styles.summaryTable}>
          <thead>
            <tr className={styles.groupHeader}>
              <th rowSpan={2} className={styles.rowLabelHeader}>
                {rowLabel}
              </th>
              <th colSpan={docCols.length}>Программные документы — по каждому статусу</th>
              <th colSpan={sheetCols.length}>Листы утверждения</th>
            </tr>
            <tr className={styles.statusHeader}>
              {docCols.map(col => (
                <th key={`doc-${col.code}`}>{getSummaryStatusShortLabel(col.code, 'document')}</th>
              ))}
              {sheetCols.map(col => (
                <th key={`sheet-${col.code}`}>{getSummaryStatusShortLabel(col.code, 'sheet')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map(row => {
              const name = resolveRowName?.(row) ?? row.name;
              const isArchived = row.recordState === 'archived';
              return (
                <tr key={row.id}>
                  <td
                    className={`${styles.rowLabelCell}${row.depth === 0 ? ` ${styles.rowLabelBold}` : ''}`}
                    style={row.depth ? { paddingLeft: 10 + row.depth * 20 } : undefined}
                  >
                    {by === 'item' ? (
                      <Link to={`/sw/structure?itemId=${row.id}`} state={{ from: returnPath }} className={styles.cellLink}>
                        {name}
                      </Link>
                    ) : (
                      name
                    )}
                    {isArchived ? <span className={styles.rowLabelArchived}>архивная</span> : null}
                  </td>
                  {docCols.map(col => {
                    const n = row.documentCounts[col.code] ?? 0;
                    const href = n > 0 ? buildSummaryDrillHref(by, row.id, col.code, 'document') : null;
                    return <td key={`${row.id}-doc-${col.code}`}>{renderCount(n, href, returnPath)}</td>;
                  })}
                  {sheetCols.map(col => {
                    const n = row.sheetCounts[col.code] ?? 0;
                    const href = n > 0 ? buildSummaryDrillHref(by, row.id, col.code, 'sheet') : null;
                    return <td key={`${row.id}-sheet-${col.code}`}>{renderCount(n, href, returnPath)}</td>;
                  })}
                </tr>
              );
            })}
            <tr className={styles.totalsRow}>
              <td className={styles.rowLabelCell}>Итого</td>
              {docCols.map(col => {
                const n = data.totals.documentCounts[col.code] ?? 0;
                return <td key={`total-doc-${col.code}`}>{n > 0 ? n : '—'}</td>;
              })}
              {sheetCols.map(col => {
                const n = data.totals.sheetCounts[col.code] ?? 0;
                return <td key={`total-sheet-${col.code}`}>{n > 0 ? n : '—'}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
