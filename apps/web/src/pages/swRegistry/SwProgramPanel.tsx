import { useState } from 'react';
import { CloudDownloadOutlined, DownloadOutlined, ExportOutlined, FileWordOutlined } from '@ant-design/icons';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Spin, Tag, Tooltip } from 'antd';
import { Link } from 'react-router-dom';

import { swRegistryApi } from '@/api/swRegistry/swRegistryApi';
import { swRegistryQueryKeys } from '@/api/swRegistry/swRegistryQueryKeys';
import { useSwItem } from '@/api/swRegistry/swRegistryApiHooks';
import { DocumentViewerModal } from '@/components/documentViewer/DocumentViewerModal';
import { SvnPickerModal } from '@/components/svnPicker/SvnPickerModal';
import { svnApi } from '@/components/svnPicker/svnApi';
import { triggerFileDownload } from '@/components/filePreview/FilePreviewModal';
import type { SwDocumentListRow, SwItemListRow } from '@/types/swRegistry';
import itemStyles from './SwItemDetailsPage.module.scss';
import styles from './SwStructurePage.module.scss';
import { formatSwStatusLabel, swStatusBadgeClass } from './swStatusBadge';

type Props = {
  item: SwItemListRow;
  kindByCode: Map<string, string>;
  documentKindByCode: Map<string, string>;
  gostCodeByKind: Map<string, string>;
  statusByCode: Map<string, string>;
  returnPath: string;
};

/** Дата размещения в IPS: в реестре это день без времени. */
function formatIpsDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('ru-RU');
}

function formatKind(code: string, kindByCode: Map<string, string>, gostByCode: Map<string, string>): string {
  const name = kindByCode.get(code) ?? code;
  const gost = gostByCode.get(code);
  return gost ? `${gost} · ${name}` : name;
}

type DocFile = {
  fileId: string;
  filename: string;
  svnPath?: string | null;
  svnRevision?: number | null;
};

function DocumentsTable({
  itemId,
  documents,
  documentKindByCode,
  gostCodeByKind,
  statusByCode,
  returnPath,
  fileByDocument,
  onPreview,
  onDownload,
  svnEnabled,
  currentRevisions,
  onPickFromSvn,
}: {
  itemId: string;
  documents: SwDocumentListRow[];
  documentKindByCode: Map<string, string>;
  gostCodeByKind: Map<string, string>;
  statusByCode: Map<string, string>;
  returnPath: string;
  fileByDocument: Map<string, DocFile>;
  onPreview: (file: DocFile) => void;
  onDownload: (file: DocFile) => Promise<void>;
  svnEnabled: boolean;
  currentRevisions: Record<string, number>;
  onPickFromSvn: (doc: SwDocumentListRow) => void;
}) {
  if (documents.length === 0) {
    return <div className={styles.branchEmpty}>Комплект документации пуст</div>;
  }

  return (
    <div className={styles.docTableWrap}>
      <table className={styles.docTable}>
        <thead>
          <tr>
            <th>Обозначение</th>
            <th>Вид по ГОСТ 19.101</th>
            <th className={styles.docNum}>Листов</th>
            <th className={styles.docNum}>Литера</th>
            <th>Статус</th>
            <th>Лист утверждения</th>
            <th>Размещение в IPS</th>
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => {
            const file = fileByDocument.get(doc.id);
            return (
            <tr key={doc.id}>
              <td>
                <div className={styles.docCell}>
                  {file ? (
                    <button
                      type='button'
                      className={styles.docOpen}
                      title='Открыть документ'
                      onClick={() => onPreview(file)}
                    >
                      <FileWordOutlined className={styles.docIcon} />
                      {doc.designation}
                    </button>
                  ) : (
                    <Link
                      className={styles.docLink}
                      to={`/sw/items/${itemId}/documents/${doc.id}`}
                      state={{ from: returnPath }}
                    >
                      {doc.designation}
                    </Link>
                  )}
                  {svnEnabled ? (
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
                    <span className={styles.docActions}>
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
                <div className={styles.docName} title={doc.name}>
                  {doc.name}
                </div>
                {file?.svnPath ? (
                  <div className={styles.docSvn} title={file.svnPath}>
                    <span className={styles.docSvnRev}>SVN r{file.svnRevision}</span>
                    {currentRevisions[file.svnPath] && currentRevisions[file.svnPath] !== file.svnRevision ? (
                      <span className={styles.docSvnStale}>
                        в SVN новее: r{currentRevisions[file.svnPath]}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </td>
              <td>{formatKind(doc.documentKindCode, documentKindByCode, gostCodeByKind)}</td>
              <td className={styles.docNum}>{doc.sheetsCount}</td>
              <td className={styles.docNum}>{doc.letter || <span className={styles.docDash}>—</span>}</td>
              <td>
                <span className={swStatusBadgeClass(doc.statusCode, itemStyles)}>
                  {formatSwStatusLabel(statusByCode.get(doc.statusCode), doc.statusCode)}
                </span>
              </td>
              <td>
                {doc.sheetStatusCode ? (
                  <>
                    <span className={swStatusBadgeClass(doc.sheetStatusCode, itemStyles)}>
                      {formatSwStatusLabel(statusByCode.get(doc.sheetStatusCode), doc.sheetStatusCode)}
                    </span>
                    {doc.sheetDesignation ? (
                      <div className={styles.docSubtle} title={doc.sheetDesignation}>
                        {doc.sheetDesignation}
                        {doc.sheetSheetsCount ? ` · ${doc.sheetSheetsCount} л.` : ''}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <span className={styles.docDash}>не оформлен</span>
                )}
              </td>
              <td>
                {doc.ipsId ? (
                  <>
                    <div className={styles.docIps}>{doc.ipsId}</div>
                    {doc.ipsPlacedAt ? (
                      <div className={styles.docSubtle}>{formatIpsDate(doc.ipsPlacedAt)}</div>
                    ) : null}
                  </>
                ) : (
                  <span className={styles.docDash}>—</span>
                )}
              </td>

            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SwProgramPanel({
  item,
  kindByCode,
  documentKindByCode,
  gostCodeByKind,
  statusByCode,
  returnPath,
}: Props) {
  const detailQuery = useSwItem(item.id);
  const detail = detailQuery.data;
  const documents = detail?.documents ?? [];
  const sheetsTotal = documents.reduce((sum, doc) => sum + (doc.sheetsCount ?? 0), 0);
  const [preview, setPreview] = useState<DocFile | null>(null);
  const [svnTarget, setSvnTarget] = useState<{ id: string; designation: string } | null>(null);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  const svnStatus = useQuery({
    queryKey: ['svn', 'status'],
    queryFn: () => svnApi.status(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const svnEnabled = svnStatus.data?.enabled ?? false;

  const queryClient = useQueryClient();


  const downloadFile = async (file: DocFile) => {
    const link = await swRegistryApi.getSwFileLink(file.fileId);
    triggerFileDownload(link.url, file.filename);
  };

  // Файлы комплекта: по одному запросу на документ, в обратном индексе связь
  // хранится за объектом, списком по программе хранилище её не отдаёт.
  const fileQueries = useQueries({
    queries: documents.map(doc => ({
      queryKey: swRegistryQueryKeys.files('sw_document', doc.id),
      queryFn: () => swRegistryApi.listFiles('sw_document', doc.id),
      staleTime: 60_000,
    })),
  });
  const fileByDocument = new Map<string, DocFile>();
  documents.forEach((doc, index) => {
    // Показываем актуальную копию: сперва пришедшую из SVN, иначе последнюю
    // загруженную. Первая по порядку — самая старая, и это вводило в заблуждение.
    const attached = fileQueries[index]?.data ?? [];
    const actual = [...attached].reverse().find(f => f.svnPath) ?? attached.at(-1);
    if (actual) {
      fileByDocument.set(doc.id, {
        fileId: actual.fileId,
        filename: actual.filename,
        svnPath: actual.svnPath ?? null,
        svnRevision: actual.svnRevision ?? null,
      });
    }
  });

  // Ревизии в SVN спрашиваем одним запросом на весь комплект: свежесть копии
  // видно сразу, без клика по каждому документу.
  const svnPaths = [...fileByDocument.values()].map(f => f.svnPath).filter((p): p is string => Boolean(p));
  const revisionsQuery = useQuery({
    queryKey: ['svn', 'revisions', svnPaths.slice().sort().join('|')],
    queryFn: () => svnApi.revisions(svnPaths),
    enabled: svnEnabled && svnPaths.length > 0,
    staleTime: 60_000,
    retry: false,
  });
  const currentRevisions = revisionsQuery.data ?? {};

  // Каталог программы в SVN: что в нём лежит и что из этого уже в реестре.
  const folderQuery = useQuery({
    queryKey: ['svn', 'folder', item.id],
    queryFn: () => svnApi.folder(item.id),
    enabled: svnEnabled && Boolean(item.svnPath),
    staleTime: 60_000,
    retry: false,
  });
  const folderPath = folderQuery.data?.svnPath ?? item.svnPath ?? null;
  const notInRegistry = (folderQuery.data?.files ?? []).filter(f => !f.attachedTo);

  const fullNameDiffers = item.fullName.trim() !== item.shortName.trim();

  return (
    <div className={styles.programStack}>
      <div className={styles.programHeadCard}>
        <div className={styles.programHeadRow}>
          <div className={styles.programHeadTitle}>
            <span className={styles.programPanelCode}>{item.designation}</span>
            <h2 className={styles.programHeadName} title={fullNameDiffers ? item.fullName : undefined}>
              {item.shortName}
            </h2>
            <Tag bordered={false} className={styles.programKind}>
              {kindByCode.get(item.developmentKindCode) ?? item.developmentKindCode}
            </Tag>
            {item.recordState === 'archived' ? (
              <Tag bordered={false} className={styles.programKind}>
                архивная
              </Tag>
            ) : null}
          </div>
          <Link to={`/sw/items/${item.id}`} state={{ from: returnPath }}>
            <Button size='small' icon={<ExportOutlined />}>
              Открыть карточку
            </Button>
          </Link>
        </div>

        <dl className={styles.programMeta}>
          <div className={styles.metaCell}>
            <dt>Элемент</dt>
            <dd title={`${item.element.code} — ${item.element.name}`}>{item.element.name}</dd>
          </div>
          <div className={styles.metaCell}>
            <dt>Ответственный</dt>
            <dd>{item.responsible.name}</dd>
          </div>
          <div className={styles.metaCellWide}>
            <dt>Разработчик</dt>
            <dd title={item.partner.name}>{item.partner.name}</dd>
          </div>
          {fullNameDiffers ? (
            <div className={styles.metaCellWide}>
              <dt>Полное наименование</dt>
              <dd title={item.fullName}>{item.fullName}</dd>
            </div>
          ) : null}
          {svnEnabled ? (
            <div className={styles.metaCellWide}>
              <dt>Каталог в SVN</dt>
              <dd title={folderPath ?? undefined}>
                {folderPath ? (
                  <span className={styles.svnFolder}>{folderPath}</span>
                ) : (
                  <span className={styles.docDash}>не привязан</span>
                )}
                <Button type='link' size='small' onClick={() => setFolderPickerOpen(true)}>
                  {folderPath ? 'изменить' : 'привязать'}
                </Button>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className={`${styles.card} ${styles.programDocsCard}`}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Комплект документации</span>
          <span className={styles.cardTitleCount}>{documents.length}</span>
          {sheetsTotal > 0 ? <span className={styles.branchDocs}>{sheetsTotal} л.</span> : null}
        </div>

        {detailQuery.isLoading ? (
          <div className={styles.branchLoading}>
            <Spin />
          </div>
        ) : (
          <DocumentsTable
            itemId={item.id}
            documents={documents}
            documentKindByCode={documentKindByCode}
            gostCodeByKind={gostCodeByKind}
            statusByCode={statusByCode}
            returnPath={returnPath}
            fileByDocument={fileByDocument}
            onPreview={setPreview}
            onDownload={downloadFile}
            svnEnabled={svnEnabled}
            currentRevisions={currentRevisions}
            onPickFromSvn={doc => setSvnTarget({ id: doc.id, designation: doc.designation })}
          />
        )}
      </div>

      {folderPath && notInRegistry.length > 0 ? (
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <span className={styles.cardTitle}>В SVN есть, в реестре нет</span>
            <span className={styles.cardTitleCount}>{notInRegistry.length}</span>
          </div>
          <div className={styles.orphanList}>
            {notInRegistry.map(file => (
              <div key={file.path} className={styles.orphanRow}>
                <FileWordOutlined className={styles.docIcon} />
                <span className={styles.orphanName} title={file.path}>
                  {file.name}
                </span>
                {file.revision ? <span className={styles.docSvnRev}>r{file.revision}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {folderPickerOpen ? (
        <SvnPickerModal
          open
          mode='folder'
          itemId={item.id}
          startPath={folderPath ?? ''}
          onClose={() => setFolderPickerOpen(false)}
          onDone={() => {
            void queryClient.invalidateQueries({ queryKey: ['sw'] });
            void queryClient.invalidateQueries({ queryKey: ['svn', 'folder', item.id] });
          }}
        />
      ) : null}

      {svnTarget ? (
        <SvnPickerModal
          open
          objectType='sw_document'
          objectId={svnTarget.id}
          startPath={folderPath ?? ''}
          onClose={() => setSvnTarget(null)}
          onDone={() => {
            void queryClient.invalidateQueries({ queryKey: ['sw'] });
            void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.files('sw_document', svnTarget.id) });
            void queryClient.invalidateQueries({ queryKey: ['svn', 'folder', item.id] });
          }}
        />
      ) : null}

      <DocumentViewerModal
        open={preview != null}
        fileId={preview?.fileId ?? null}
        fileName={preview?.filename}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
