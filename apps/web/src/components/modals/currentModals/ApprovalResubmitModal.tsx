import { useMemo, useState } from 'react';
import { FileOutlined, SwapOutlined, UndoOutlined, UploadOutlined } from '@ant-design/icons';
import { App, Button, Checkbox, Form, Input, List, Space, Spin, Tooltip, Typography, Upload } from 'antd';

import { useResubmitProcess } from '@/api/approvals/approvalApiHooks';
import { useFilesByEntity } from '@/api/files/fileApiHooks';
import { useModalStore, type ModalState } from '@/store/ModalStore';
import type { MyFile } from '@/types/files';

import { BaseModal } from '../BaseModal';

const SECTION = 'approval';

function extractError(e: unknown): string | undefined {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}

/**
 * Повторная отправка после доработки с версионированием документов (F-V3).
 * Текущие документы предзаполнены как набор версии N+1: каждый можно оставить,
 * убрать или заменить новым файлом; можно добавить новые. На submit → multipart
 * resubmit (keepFileIds + файлы), backend создаёт версию N+1, старую архивирует.
 */
export const ApprovalResubmitModal: React.FC<ModalState> = ({ open, title, modalData }) => {
  const { message } = App.useApp();
  const closeModal = useModalStore((s) => s.closeModal);

  const processId: string = modalData?.processId;
  const entityType: string = modalData?.entityType;
  const entityId: string = modalData?.entityId;

  const { data: allFiles = [], isLoading } = useFilesByEntity(entityType, entityId);
  const resubmit = useResubmitProcess();

  const currentDocs = useMemo(
    () => (allFiles as MyFile[]).filter((f) => f.document_section === SECTION && (f.is_current ?? true)),
    [allFiles],
  );

  const [comment, setComment] = useState('');
  // id текущего файла → оставить в новой версии (по умолчанию все).
  const [keep, setKeep] = useState<Record<string, boolean>>({});
  // id текущего файла → заменяющий файл (если выбран).
  const [replacements, setReplacements] = useState<Record<string, File>>({});
  // Добавленные новые файлы (не привязаны к существующим).
  const [additions, setAdditions] = useState<File[]>([]);

  const isKept = (id: string) => keep[id] ?? true;

  const handleClose = () => {
    setComment('');
    setKeep({});
    setReplacements({});
    setAdditions([]);
    closeModal();
  };

  const handleSubmit = async () => {
    // Переносим: отмеченные оставленными файлы, КРОМЕ заменяемых (их перезапишут загрузки).
    const keepFileIds = currentDocs.filter((f) => isKept(f.id) && !replacements[f.id]).map((f) => f.id);
    const files: File[] = [...Object.values(replacements), ...additions];

    try {
      await resubmit.mutateAsync({ processId, comment: comment.trim() || undefined, keepFileIds, files, entityType, entityId });
      message.success('Отправлено повторно');
      handleClose();
    } catch (e) {
      message.error(extractError(e) ?? 'Не удалось отправить повторно');
    }
  };

  return (
    <BaseModal open={open} title={title} onCancel={handleClose} footer={null} width={620}>
      {isLoading ? (
        <Spin />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Typography.Text type="secondary">
            Документы перейдут в новую версию. Снимите отметку, чтобы убрать документ, или замените его новым файлом.
          </Typography.Text>

          {currentDocs.length > 0 ? (
            <List
              size="small"
              header={<Typography.Text strong>Текущие документы</Typography.Text>}
              dataSource={currentDocs}
              renderItem={(f) => {
                const replaced = replacements[f.id];
                const kept = isKept(f.id);
                return (
                  <List.Item
                    actions={[
                      <Upload
                        key="replace"
                        showUploadList={false}
                        beforeUpload={(file) => {
                          setReplacements((p) => ({ ...p, [f.id]: file }));
                          setKeep((p) => ({ ...p, [f.id]: true }));
                          return false;
                        }}
                      >
                        <Tooltip title="Заменить файл">
                          <Button size="small" type="text" icon={<SwapOutlined />} />
                        </Tooltip>
                      </Upload>,
                      ...(replaced
                        ? [
                            <Tooltip key="undo" title="Отменить замену">
                              <Button
                                size="small"
                                type="text"
                                icon={<UndoOutlined />}
                                onClick={() =>
                                  setReplacements((p) => {
                                    const next = { ...p };
                                    delete next[f.id];
                                    return next;
                                  })
                                }
                              />
                            </Tooltip>,
                          ]
                        : []),
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Checkbox
                          checked={kept}
                          onChange={(e) => setKeep((p) => ({ ...p, [f.id]: e.target.checked }))}
                        />
                      }
                      title={
                        <Space size={6}>
                          <FileOutlined style={{ color: '#8c8c8c' }} />
                          <span style={{ textDecoration: kept ? undefined : 'line-through', opacity: kept ? 1 : 0.5 }}>
                            {f.name}
                          </span>
                        </Space>
                      }
                      description={
                        replaced ? (
                          <Typography.Text type="success" style={{ fontSize: 12, wordBreak: 'break-word' }}>
                            → заменить на «{replaced.name}»
                          </Typography.Text>
                        ) : null
                      }
                    />
                  </List.Item>
                );
              }}
            />
          ) : (
            <Typography.Text type="secondary">Текущих документов нет</Typography.Text>
          )}

          <Form.Item label="Добавить новые документы" style={{ marginBottom: 0 }}>
            <Upload
              multiple
              beforeUpload={(file) => {
                setAdditions((p) => [...p, file]);
                return false;
              }}
              fileList={additions.map((file, i) => ({ uid: String(i), name: file.name, status: 'done' as const }))}
              onRemove={(uf) => setAdditions((p) => p.filter((_, i) => String(i) !== uf.uid))}
            >
              <Button icon={<UploadOutlined />}>Выбрать файлы</Button>
            </Upload>
          </Form.Item>

          <Input.TextArea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Комментарий (необязательно)"
            rows={2}
          />

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleClose}>Отмена</Button>
            <Button type="primary" loading={resubmit.isPending} onClick={handleSubmit}>
              Отправить повторно
            </Button>
          </Space>
        </Space>
      )}
    </BaseModal>
  );
};
