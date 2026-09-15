import { CloudDownloadOutlined, DownloadOutlined, FileWordOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { Link, useNavigate } from 'react-router-dom';

import type { SwDocumentListRow } from '@/types/swRegistry';
import { formatIpsDisplay } from './swDesignationPreview';
import { formatSwStatusLabel, swStatusBadgeClass } from './swStatusBadge';
import styles from './SwRegistryShared.module.scss';
import panelStyles from './SwStructurePage.module.scss';

/** Актуальный файл документа: пришедший из SVN, иначе последний загруженный. */
export type SwDocumentFile = {
  fileId: string;
  filename: string;
  svnPath?: string | null;
  svnRevision?: number | null;
};

type Props = {
  itemId: string;
  documents: SwDocumentListRow[];
  kindLabelByCode: Map<string, string>;
  gostCodeByKind: Map<string, string>;
  statusLabelByCode: Map<string, string>;
  requiresApprovalSheetByKind: Map<string, boolean>;
  canEdit: boolean;
  /** Куда вернуться со страницы документа. */
  returnPath: string;
  onChangeStatus: (doc: SwDocumentListRow, scope: 'document' | 'sheet') => void;
  onOpenIps: (doc: SwDocumentListRow) => void;
  onSetupSheet: (doc: SwDocumentListRow) => void;
  fileByDocument: Map<string, SwDocumentFile>;
  onPreview: (file: SwDocumentFile) => void;
  onDownload: (file: SwDocumentFile) => void | Promise<void>;
  svnEnabled: boolean;
  currentRevisions: Record<string, number>;
  onPickFromSvn: (doc: SwDocumentListRow) => void;
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

/** Комплект документации программы: реквизиты, действия со статусами и файлы документов (в т.ч. из SVN). */
export function SwDocumentsTable({
  itemId,
  documents,
  kindLabelByCode,
  gostCodeByKind,
  statusLabelByCode,
  requiresApprovalSheetByKind,
  canEdit,
  returnPath,
  onChangeStatus,
  onOpenIps,
  onSetupSheet,
  fileByDocument,
  onPreview,
  onDownload,
  svnEnabled,
  currentRevisions,
  onPickFromSvn,
}: Props) {
  const navigate = useNavigate();
  const docPath = (documentId: string) => `/sw/items/${itemId}/documents/${documentId}`;
  const docLinkState = { from: returnPath };

  return (
    <div className={panelStyles.docTableWrap}>
      <table className={`${styles.docTable} ${panelStyles.programDocTable}`}>
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
            const sheetStatusLabel = doc.sheetStatusCode ? statusLabelByCode.get(doc.sheetStatusCode) : undefined;
            const needsSheet = requiresApprovalSheetByKind.get(doc.documentKindCode) ?? false;
            const canChangeDoc = canEdit && !locked && !isArchived;
            const canChangeSheet = canChangeDoc && Boolean(doc.sheetStatusCode);
            const ipsDisplay = formatIpsDisplay(doc.ipsId, doc.ipsPlacedAt);
            const file = fileByDocument.get(doc.id);
            const newerRevision = file?.svnPath ? currentRevisions[file.svnPath] : undefined;

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
                  <div className={panelStyles.docCell}>
                    {file ? (
                      // С прикреплённым файлом обозначение открывает сам документ; страница — по строке и шеврону.
                      <button
                        type='button'
                        className={panelStyles.docOpen}
                        title='Открыть документ'
                        onClick={() => onPreview(file)}
                      >
                        <FileWordOutlined className={panelStyles.docIcon} />
                        {doc.designation}
                      </button>
                    ) : (
                      <Link to={docPath(doc.id)} state={docLinkState} className={styles.docTableDesignation}>
                        {doc.designation}
                      </Link>
                    )}
                    {svnEnabled && canChangeDoc ? (
                      <Tooltip title={file ? 'Обновить файл из SVN' : 'Прикрепить файл из SVN'}>
                        <Button
                          type='text'
                          size='small'
                          icon={<CloudDownloadOutlined />}
                          aria-label={file ? 'Обновить файл из SVN' : 'Прикрепить файл из SVN'}
                          onClick={() => onPickFromSvn(doc)}
                        />
                      </Tooltip>
                    ) : null}
                    {file ? (
                      <span className={panelStyles.docActions}>
                        <Tooltip title='Скачать'>
                          <Button
                            type='text'
                            size='small'
                            icon={<DownloadOutlined />}
                            aria-label='Скачать документ'
                            onClick={() => void onDownload(file)}
                          />
                        </Tooltip>
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.docTableDocName} title={doc.name}>
                    {doc.name}
                  </div>
                  {file?.svnPath ? (
                    <div className={panelStyles.docSvn} title={file.svnPath}>
                      <span className={panelStyles.docSvnRev}>SVN r{file.svnRevision}</span>
                      {newerRevision && newerRevision !== file.svnRevision ? (
                        <span className={panelStyles.docSvnStale}>в SVN новее: r{newerRevision}</span>
                      ) : null}
                    </div>
                  ) : null}
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
                            <button type='button' className={styles.docTableLinkBtn} onClick={() => onSetupSheet(doc)}>
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
                    onClick={e => e.stopPropagation()}
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
