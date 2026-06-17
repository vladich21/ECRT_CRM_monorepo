import { DeleteOutlined, DownloadOutlined, FileOutlined, UploadOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, List, Popconfirm, Space, Spin, Tooltip, Typography, Upload } from 'antd';

import { apiClient } from '@/api/clients';
import { fileApi } from '@/api/files/fileApi';
import { useDeleteFile, useFilesByEntity } from '@/api/files/fileApiHooks';
import { fileQueryKeys } from '@/api/files/fileQueryKeys';
import type { MyFile } from '@/types/files';

/** Документы согласования = файлы сущности в секции 'approval'.
 *  Загрузка/удаление в панели доступны ТОЛЬКО инициатору и ТОЛЬКО на доработке (editable=can_resubmit).
 *  Первичное прикрепление — в модалке при создании. */
const SECTION = 'approval';

function formatSize(size: string | null): string {
  const n = Number(size);
  if (!size || Number.isNaN(n)) return '';
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
}

interface ApprovalDocumentsProps {
  entityType: string;
  entityId: string;
  /** Можно ли менять документы в панели (инициатор на доработке). */
  editable: boolean;
}

export function ApprovalDocuments({ entityType, entityId, editable }: ApprovalDocumentsProps) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { data: files = [], isLoading } = useFilesByEntity(entityType, entityId);
  const del = useDeleteFile();

  const docs = (files as MyFile[]).filter((f) => f.document_section === SECTION);

  // Скачивание через авторизованный apiClient (blob) — корректное имя + обход недоступного абсолютного URL.
  const handleDownload = async (file: MyFile) => {
    try {
      const res = await apiClient.get(`/files/${file.id}`, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      message.error('Не удалось скачать файл');
    }
  };

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      {editable ? (
        <Upload
          multiple
          showUploadList={false}
          customRequest={async (options) => {
            const fd = new FormData();
            fd.append('file1', options.file as File);
            fd.append('entityType', entityType);
            fd.append('entityId', entityId);
            fd.append('documentSection', SECTION);
            try {
              await fileApi.uploadFiles(fd);
              await qc.invalidateQueries({ queryKey: fileQueryKeys.byEntity(entityType, entityId) });
              message.success('Файл загружен');
              options.onSuccess?.({});
            } catch (err) {
              message.error('Не удалось загрузить файл');
              options.onError?.(err as Error);
            }
          }}
        >
          <Button icon={<UploadOutlined />} block>
            Загрузить новую версию
          </Button>
        </Upload>
      ) : null}

      {docs.length === 0 ? (
        <Typography.Text type="secondary">Документы не приложены</Typography.Text>
      ) : (
        <List
          size="small"
          dataSource={docs}
          renderItem={(f) => (
            <List.Item
              actions={[
                <Tooltip key="dl" title="Скачать">
                  <Button size="small" type="text" icon={<DownloadOutlined />} onClick={() => handleDownload(f)} />
                </Tooltip>,
                ...(editable
                  ? [
                      <Popconfirm
                        key="del"
                        title="Удалить документ?"
                        okButtonProps={{ danger: true }}
                        onConfirm={async () => {
                          await del.mutateAsync({ entityType, entityId, fileId: f.id });
                          message.success('Документ удалён');
                        }}
                      >
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]
                  : []),
              ]}
            >
              <List.Item.Meta
                avatar={<FileOutlined style={{ fontSize: 18, color: '#8c8c8c' }} />}
                title={
                  <Typography.Link onClick={() => handleDownload(f)}>{f.name}</Typography.Link>
                }
                description={
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {formatSize(f.size)}
                    {f.uploaded_at ? ` · ${new Date(f.uploaded_at).toLocaleDateString('ru-RU')}` : ''}
                  </Typography.Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Space>
  );
}
