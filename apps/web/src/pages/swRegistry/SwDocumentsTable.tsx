import { RightOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import type { SwDocumentListRow } from '@/types/swRegistry';
import { readSwRegistryReturnState } from './swRegistryNavigation';
import { formatIpsDisplay } from './swDesignationPreview';
import { formatSwStatusLabel, swStatusBadgeClass } from './swStatusBadge';
import styles from './SwItemDetailsPage.module.scss';

type Props = {
  itemId: string;
  documents: SwDocumentListRow[];
  kindLabelByCode: Map<string, string>;
  gostCodeByKind: Map<string, string>;
  statusLabelByCode: Map<string, string>;
  requiresApprovalSheetByKind: Map<string, boolean>;
  canEdit: boolean;
  onChangeStatus: (doc: SwDocumentListRow, scope: 'document' | 'sheet') => void;
  onOpenIps: (doc: SwDocumentListRow) => void;
  onSetupSheet: (doc: SwDocumentListRow) => void;
};

function StatusBadge({
  statusCode,
  label,
  onClick,
}: {
  statusCode: string;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <span className={swStatusBadgeClass(statusCode, styles)}>{formatSwStatusLabel(label, statusCode)}</span>
  );
  if (!onClick) return content;
  return (
    <button type='button' className={styles.statusBadgeBtn} onClick={onClick}>
      {content}
    </button>
  );
}

function formatKindLabel(code: string, kindLabelByCode: Map<string, string>, gostCodeByKind: Map<string, string>) {
  const gost = gostCodeByKind.get(code);
  const name = kindLabelByCode.get(code) ?? code;
  return gost ? `${gost} · ${name}` : name;
}

export function SwDocumentsTable({
  itemId,
  documents,
  kindLabelByCode,
  gostCodeByKind,
  statusLabelByCode,
  requiresApprovalSheetByKind,
  canEdit,
  onChangeStatus,
  onOpenIps,
  onSetupSheet,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const registryFrom = readSwRegistryReturnState(location.state).from;
  const docPath = (documentId: string) => `/sw/items/${itemId}/documents/${documentId}`;
  const docLinkState = { from: registryFrom };

  return (
    <div className={styles.docTableWrap}>
      <table className={styles.docTable}>
        <thead>
          <tr>
            <th>Вид документа</th>
            <th>Обозначение</th>
            <th>Листов</th>
            <th>Литера</th>
            <th>Лист утверждения</th>
            <th>Статус</th>
            <th>IPS</th>
            <th className={styles.docTableChevronCol} aria-hidden />
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => {
            const locked = doc.statusCode === 'in_ips';
            const isArchived = doc.recordState === 'archived';
            const statusLabel = statusLabelByCode.get(doc.statusCode) ?? doc.statusCode;
            const sheetStatusLabel = doc.sheetStatusCode
              ? statusLabelByCode.get(doc.sheetStatusCode)
              : undefined;
            const needsSheet = requiresApprovalSheetByKind.get(doc.documentKindCode) ?? false;
            const canChangeDoc = canEdit && !locked && !isArchived;
            const canChangeSheet = canChangeDoc && Boolean(doc.sheetStatusCode);
            const ipsDisplay = formatIpsDisplay(doc.ipsId, doc.ipsPlacedAt);

            return (
              <tr
                key={doc.id}
                className={isArchived ? styles.docTableRowArchived : styles.docTableRow}
                onClick={() => navigate(docPath(doc.id), { state: docLinkState })}
              >
                <td className={styles.docTableKind}>
                  {formatKindLabel(doc.documentKindCode, kindLabelByCode, gostCodeByKind)}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <Link to={docPath(doc.id)} state={docLinkState} className={styles.docTableDesignation}>
                    {doc.designation}
                  </Link>
                </td>
                <td className={styles.docTableNum}>{doc.sheetsCount}</td>
                <td className={styles.docTableNum}>{doc.letter ?? '—'}</td>
                <td onClick={e => e.stopPropagation()}>
                  {needsSheet ? (
                    doc.sheetStatusCode ? (
                      <StatusBadge
                        statusCode={doc.sheetStatusCode}
                        label={sheetStatusLabel ?? doc.sheetStatusCode}
                        onClick={canChangeSheet ? () => onChangeStatus(doc, 'sheet') : undefined}
                      />
                    ) : (
                      <span className={styles.docTableMuted}>
                        не оформлен
                        {canChangeDoc ? (
                          <>
                            {' · '}
                            <button
                              type='button'
                              className={styles.docTableLinkBtn}
                              onClick={() => onSetupSheet(doc)}
                            >
                              оформить
                            </button>
                          </>
                        ) : null}
                      </span>
                    )
                  ) : (
                    <span className={styles.docTableMuted}>—</span>
                  )}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <StatusBadge
                    statusCode={doc.statusCode}
                    label={statusLabel}
                    onClick={canChangeDoc ? () => onChangeStatus(doc, 'document') : undefined}
                  />
                </td>
                <td onClick={e => e.stopPropagation()}>
                  {ipsDisplay ? (
                    <span className={styles.docTableIps}>{ipsDisplay}</span>
                  ) : canChangeDoc ? (
                    <button type='button' className={styles.docTableLinkBtn} onClick={() => onOpenIps(doc)}>
                      разместить →
                    </button>
                  ) : (
                    <span className={styles.docTableMuted}>—</span>
                  )}
                </td>
                <td className={styles.docTableChevronCol}>
                  <Link
                    to={docPath(doc.id)}
                    state={docLinkState}
                    className={styles.docTableChevronLink}
                    aria-label='Открыть документ'
                  >
                    <RightOutlined className={styles.docTableChevron} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
