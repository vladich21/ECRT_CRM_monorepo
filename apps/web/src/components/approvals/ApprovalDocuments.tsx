import { DownloadOutlined, FileOutlined } from '@ant-design/icons';
import { App, Button, List, Space, Spin, Tooltip, Typography } from 'antd';

import { apiClient } from '@/api/clients';
import { useFilesByEntity } from '@/api/files/fileApiHooks';
import type { MyFile } from '@/types/files';

/** Документы согласования = файлы сущности в секции 'approval', сгруппированные по версии.
 *  Панель только для чтения: загрузка/замена/удаление - в модалке повторной отправки.
 *  Текущая версия (is_current) - сверху как «текущая», прошлые - архив (только скачивание). */
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
}

export function ApprovalDocuments({ entityType, entityId }: ApprovalDocumentsProps) {
  const { message } = App.useApp();
  const { data: files = [], isLoading } = useFilesByEntity(entityType, entityId);

  const docs = (files as MyFile[]).filter((f) => f.document_section === SECTION);

  // Группировка по версии: { version → файлы }, по убыванию версии.
  const byVersion = new Map<number, MyFile[]>();
  for (const f of docs) {
    const v = f.version ?? 1;
    if (!byVersion.has(v)) byVersion.set(v, []);
    byVersion.get(v)!.push(f);
  }
  const versions = Array.from(byVersion.keys()).sort((a, b) => b - a);
  const hasMultiple = versions.length > 1;

  // Скачивание через авторизованный apiClient (blob) - корректное имя + same-origin.
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
  if (docs.length === 0) return <Typography.Text type="secondary">Документы не приложены</Typography.Text>;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {versions.map((v) => {
        const isCurrent = byVersion.get(v)!.some((f) => f.is_current ?? true);
        return (
          <div key={v}>
            {hasMultiple ? (
              <Typography.Text type={isCurrent ? undefined : 'secondary'} strong={isCurrent} style={{ fontSize: 12 }}>
                Версия {v}
                {isCurrent ? ' · текущая' : ' · архив'}
              </Typography.Text>
            ) : null}
            <List
              size="small"
              dataSource={byVersion.get(v)!}
              renderItem={(f) => (
                <List.Item
                  actions={[
                    <Tooltip key="dl" title="Скачать">
                      <Button size="small" type="text" icon={<DownloadOutlined />} onClick={() => handleDownload(f)} />
                    </Tooltip>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileOutlined style={{ fontSize: 18, color: '#8c8c8c' }} />}
                    title={<Typography.Link onClick={() => handleDownload(f)}>{f.name}</Typography.Link>}
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
          </div>
        );
      })}
    </Space>
  );
}
