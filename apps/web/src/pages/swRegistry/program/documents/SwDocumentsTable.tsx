import {
  CloudDownloadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileWordOutlined,
  MoreOutlined,
  PaperClipOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Tooltip, type MenuProps } from 'antd';

import type { SwDocumentFileRef, SwDocumentListRow } from '@/types/swRegistry';
import { formatIpsDisplay } from '../../shared/swDesignationPreview';
import { formatSwStatusLabel, swStatusBadgeClass } from '../../shared/swStatusBadge';
import styles from './SwDocumentsTable.module.scss';

/** Копия документа или его листа: приходит вместе с комплектом. */
export type SwDocumentFile = SwDocumentFileRef;

type Props = {
  documents: SwDocumentListRow[];
  statusLabelByCode: Map<string, string>;
  requiresApprovalSheetByKind: Map<string, boolean>;
  /** Вид разработки допускает лист: есть статусы области sheet, не хардкод rnd. */
  sheetAllowed: boolean;
  canEdit: boolean;
  /** Документ, открытый в боковой панели: его строка подсвечена. */
  selectedDocumentId: string | null;
  onOpenDocument: (doc: SwDocumentListRow) => void;
  onEdit: (doc: SwDocumentListRow) => void;
  onDelete: (doc: SwDocumentListRow) => void;
  onRestore: (doc: SwDocumentListRow) => void;
  onChangeStatus: (doc: SwDocumentListRow, scope: 'document' | 'sheet') => void;
  onOpenIps: (doc: SwDocumentListRow) => void;
  onSetupSheet: (doc: SwDocumentListRow) => void;
  onRemoveSheet: (doc: SwDocumentListRow) => void;
  fileByDocument: Map<string, SwDocumentFile>;
  /** Файл листа утверждения: лист — такой же документ, со своей копией. */
  sheetFileByDocument: Map<string, SwDocumentFile>;
  onPickSheetFromSvn: (doc: SwDocumentListRow) => void;
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
 * Правка и удаление — при праве на комплект; документ, ушедший в архив с программой, возвращается
 * только вместе с ней.
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
    { key: 'delete', icon: <DeleteOutlined />, label: 'Удалить', danger: true },
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
  sheetAllowed,
  canEdit,
  selectedDocumentId,
  onOpenDocument,
  onEdit,
  onDelete,
  onRestore,
  onChangeStatus,
  onOpenIps,
  onSetupSheet,
  onRemoveSheet,
  fileByDocument,
  sheetFileByDocument,
  onPickSheetFromSvn,
  onPreview,
  onDownload,
  svnEnabled,
  currentRevisions,
  onPickFromSvn,
}: Props) {
  return (
    <div className={styles.docTableWrap}>
      <table className={`${styles.docTable} ${styles.programDocTable}`}>
        <thead>
          <tr>
            <th>Документ</th>
            <th>Статус документа</th>
            <th>Лист утверждения</th>
            <th>IPS</th>
            <th className={styles.docTableMenuCol} aria-label='Действия' />
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => {
            const locked = doc.statusCode === 'in_ips';
            const isArchived = doc.recordState === 'archived';
            const statusLabel = statusLabelByCode.get(doc.statusCode) ?? doc.statusCode;
            const sheetStatusLabel = doc.sheetStatusCode ? statusLabelByCode.get(doc.sheetStatusCode) : undefined;
            const needsSheet = (requiresApprovalSheetByKind.get(doc.documentKindCode) ?? false) && sheetAllowed;
            const canChangeDoc = canEdit && !locked && !isArchived;
            const canChangeSheet = canChangeDoc && Boolean(doc.sheetStatusCode);
            const ipsDisplay = formatIpsDisplay(doc.ipsId, doc.ipsPlacedAt);
            const file = fileByDocument.get(doc.id);
            const sheetFile = sheetFileByDocument.get(doc.id);
            const sheetNewerRevision = sheetFile?.svnPath ? currentRevisions[sheetFile.svnPath] : undefined;
            const newerRevision = file?.svnPath ? currentRevisions[file.svnPath] : undefined;
            const rowClass = [
              styles.docTableRow,
              isArchived ? styles.docTableRowArchived : '',
              doc.id === selectedDocumentId ? styles.docRowSelected : '',
            ]
              .filter(Boolean)
              .join(' ');

            const handleMenu: MenuProps['onClick'] = ({ key }) => {
              if (key === 'open') onOpenDocument(doc);
              else if (key === 'edit') onEdit(doc);
              else if (key === 'delete') onDelete(doc);
              else if (key === 'restore') onRestore(doc);
            };

            return (
              <tr key={doc.id} className={rowClass} onClick={() => onOpenDocument(doc)}>
                <td onClick={e => e.stopPropagation()}>
                  {/* Три уровня чтения: обозначение различает документы (12 01 и 12 02 —
                      оба «Текст программы»), наименование поясняет, служебное — в конце. */}
                  <div className={styles.docTableTitleRow}>
                    <button
                      type='button'
                      className={styles.docTableTitle}
                      title={file ? 'Открыть документ' : 'Открыть карточку документа'}
                      onClick={() => (file ? onPreview(file) : onOpenDocument(doc))}
                    >
                      {file ? <FileWordOutlined className={styles.docTableTitleIcon} /> : null}
                      <span className={styles.docTableTitleText}>{doc.designation}</span>
                    </button>
                    <span className={`${styles.docActions} ${styles.docTableRowActions}`}>
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
                        <Tooltip title='Скачать'>
                          <Button
                            type='text'
                            size='small'
                            icon={<DownloadOutlined />}
                            aria-label='Скачать документ'
                            onClick={() => void onDownload(file)}
                          />
                        </Tooltip>
                      ) : null}
                    </span>
                  </div>
                  <div className={styles.docTableSubline} title={doc.name}>
                    {doc.name}
                  </div>
                  <div className={styles.docTableMeta}>
                    <span>{doc.sheetsCount} л.</span>
                    {doc.letter ? <span>литера {doc.letter}</span> : null}
                    {file?.svnPath ? <span title={file.svnPath}>SVN r{file.svnRevision}</span> : null}
                    {file?.svnPath && newerRevision && newerRevision !== file.svnRevision ? (
                      <span className={styles.docSvnStale}>в SVN новее: r{newerRevision}</span>
                    ) : null}
                  </div>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <StatusBadge
                    statusCode={doc.statusCode}
                    label={statusLabel}
                    onClick={canChangeDoc ? () => onChangeStatus(doc, 'document') : undefined}
                  />
                </td>
                <td onClick={e => e.stopPropagation()}>
                  {doc.sheetStatusCode ? (
                      <div className={styles.docTableSheetCell}>
                        {/* Тот же порядок чтения, что у документа: состояние — обозначение — объём. */}
                        <div className={styles.docTableSheetHead}>
                          <StatusBadge
                            statusCode={doc.sheetStatusCode}
                            label={sheetStatusLabel ?? doc.sheetStatusCode}
                            onClick={canChangeSheet ? () => onChangeStatus(doc, 'sheet') : undefined}
                          />
                          {canChangeDoc ? (
                            <span className={`${styles.docActions} ${styles.docTableRowActions}`}>
                              <Tooltip title='Изменить лист утверждения'>
                                <Button
                                  type='text'
                                  size='small'
                                  icon={<EditOutlined />}
                                  aria-label='Изменить лист утверждения'
                                  onClick={() => onSetupSheet(doc)}
                                />
                              </Tooltip>
                              <Tooltip title='Удалить лист утверждения'>
                                <Button
                                  type='text'
                                  size='small'
                                  danger
                                  icon={<DeleteOutlined />}
                                  aria-label='Удалить лист утверждения'
                                  onClick={() => onRemoveSheet(doc)}
                                />
                              </Tooltip>
                            </span>
                          ) : null}
                        </div>
                        {doc.sheetDesignation ? (
                          <div className={styles.docTableSheetFileRow}>
                            {sheetFile ? (
                              <button
                                type='button'
                                className={styles.docTableSheetLink}
                                title='Открыть лист утверждения'
                                onClick={() => onPreview(sheetFile)}
                              >
                                <FileWordOutlined className={styles.docTableTitleIcon} />
                                {doc.sheetDesignation}
                              </button>
                            ) : (
                              <span className={styles.docTableDesignationLine} title={doc.sheetDesignation}>
                                {doc.sheetDesignation}
                              </span>
                            )}
                            <span className={`${styles.docActions} ${styles.docTableRowActions}`}>
                              {svnEnabled && canChangeDoc ? (
                                <Tooltip title={sheetFile ? 'Обновить файл листа из SVN' : 'Прикрепить файл листа из SVN'}>
                                  <Button
                                    type='text'
                                    size='small'
                                    icon={<CloudDownloadOutlined />}
                                    aria-label={sheetFile ? 'Обновить файл листа из SVN' : 'Прикрепить файл листа из SVN'}
                                    onClick={() => onPickSheetFromSvn(doc)}
                                  />
                                </Tooltip>
                              ) : null}
                              {sheetFile ? (
                                <Tooltip title='Скачать лист утверждения'>
                                  <Button
                                    type='text'
                                    size='small'
                                    icon={<DownloadOutlined />}
                                    aria-label='Скачать лист утверждения'
                                    onClick={() => void onDownload(sheetFile)}
                                  />
                                </Tooltip>
                              ) : null}
                            </span>
                          </div>
                        ) : null}
                        {doc.sheetSheetsCount || sheetFile?.svnPath ? (
                          <div className={styles.docTableMeta}>
                            {doc.sheetSheetsCount ? <span>{doc.sheetSheetsCount} л.</span> : null}
                            {sheetFile?.svnPath ? (
                              <span title={sheetFile.svnPath}>SVN r{sheetFile.svnRevision}</span>
                            ) : null}
                            {sheetFile?.svnPath && sheetNewerRevision && sheetNewerRevision !== sheetFile.svnRevision ? (
                              <span className={styles.docSvnStale}>в SVN новее: r{sheetNewerRevision}</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                  ) : needsSheet ? (
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
                  ) : (
                    <span className={styles.docTableMuted}>—</span>
                  )}
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
                <td className={styles.docTableMenuCol} onClick={e => e.stopPropagation()}>
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
