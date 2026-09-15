import {
  CloudDownloadOutlined,
  DownloadOutlined,
  EditOutlined,
  FileWordOutlined,
  InboxOutlined,
  MoreOutlined,
  PaperClipOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Tooltip, type MenuProps } from 'antd';

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
  documents: SwDocumentListRow[];
  statusLabelByCode: Map<string, string>;
  requiresApprovalSheetByKind: Map<string, boolean>;
  canEdit: boolean;
  /** Документ, открытый в боковой панели: его строка подсвечена. */
  selectedDocumentId: string | null;
  onOpenDocument: (doc: SwDocumentListRow) => void;
  onEdit: (doc: SwDocumentListRow) => void;
  onArchive: (doc: SwDocumentListRow) => void;
  onRestore: (doc: SwDocumentListRow) => void;
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

export function formatKindLabel(
  code: string,
  kindLabelByCode: Map<string, string>,
  gostCodeByKind: Map<string, string>,
) {
  const gost = gostCodeByKind.get(code);
  const name = kindLabelByCode.get(code) ?? code;
  return gost ? `${gost} · ${name}` : name;
}

/**
 * Меню «⋯» строки. Файлы и комментарии открываются всем (и с клавиатуры — строка кликается только мышью).
 * Правка и архив — при праве на комплект; документ, ушедший в архив с программой или элементом, возвращается
 * только вместе с ними.
 */
function rowMenuItems(doc: SwDocumentListRow, canEdit: boolean): NonNullable<MenuProps['items']> {
  const items: NonNullable<MenuProps['items']> = [
    { key: 'open', icon: <PaperClipOutlined />, label: 'Файлы и комментарии' },
  ];
  if (!canEdit) return items;
  if (doc.recordState === 'archived') {
    if (!doc.archivedByCascade) {
      items.push({ type: 'divider' }, { key: 'restore', icon: <UndoOutlined />, label: 'Вернуть из архива' });
    }
    return items;
  }
  items.push(
    { type: 'divider' },
    { key: 'edit', icon: <EditOutlined />, label: 'Редактировать' },
    { key: 'archive', icon: <InboxOutlined />, label: 'В архив' },
  );
  return items;
}

/**
 * Комплект документации программы: реквизиты, действия со статусами и файлы документов (в т.ч. из SVN).
 * Отдельной колонки вида нет: код вида входит в обозначение, наименование — под ним.
 */
export function SwDocumentsTable({
  documents,
  statusLabelByCode,
  requiresApprovalSheetByKind,
  canEdit,
  selectedDocumentId,
  onOpenDocument,
  onEdit,
  onArchive,
  onRestore,
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
  return (
    <div className={panelStyles.docTableWrap}>
      <table className={`${styles.docTable} ${panelStyles.programDocTable}`}>
        <thead>
          <tr>
            <th>Обозначение</th>
            <th>Листов</th>
            <th>Литера</th>
            <th>Лист утверждения</th>
            <th>Статус</th>
            <th>IPS</th>
            <th className={panelStyles.docTableMenuCol} aria-label='Действия' />
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
            const rowClass = [
              styles.docTableRow,
              isArchived ? styles.docTableRowArchived : '',
              doc.id === selectedDocumentId ? panelStyles.docRowSelected : '',
            ]
              .filter(Boolean)
              .join(' ');

            const handleMenu: MenuProps['onClick'] = ({ key }) => {
              if (key === 'open') onOpenDocument(doc);
              else if (key === 'edit') onEdit(doc);
              else if (key === 'archive') onArchive(doc);
              else if (key === 'restore') onRestore(doc);
            };

            return (
              <tr key={doc.id} className={rowClass} onClick={() => onOpenDocument(doc)}>
                <td onClick={e => e.stopPropagation()}>
                  <div className={panelStyles.docCell}>
                    {file ? (
                      // С прикреплённым файлом обозначение открывает сам документ; панель — по строке и меню «⋯».
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
                      <button
                        type='button'
                        className={`${styles.docTableLinkBtn} ${styles.docTableDesignation}`}
                        onClick={() => onOpenDocument(doc)}
                      >
                        {doc.designation}
                      </button>
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
                <td className={panelStyles.docTableMenuCol} onClick={e => e.stopPropagation()}>
                  <Dropdown
                    trigger={['click']}
                    placement='bottomRight'
                    menu={{ items: rowMenuItems(doc, canEdit), onClick: handleMenu }}
                  >
                    <Button type='text' size='small' icon={<MoreOutlined />} aria-label='Действия с документом' />
                  </Dropdown>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
