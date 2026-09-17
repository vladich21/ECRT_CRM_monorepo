import { useMemo, useRef, useState } from 'react';
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Empty, Form, Input, Modal, Spin, Table, Tooltip, type MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';

import { swRegistryApi } from '@/api/swRegistry/swRegistryApi';
import {
  useCreateSwFirmware,
  useCreateSwFirmwareVersion,
  useDeleteSwFirmware,
  useDeleteSwFirmwareVersion,
  useSwFirmwares,
  useUpdateSwFirmware,
} from '@/api/swRegistry/swRegistryApiHooks';
import { useOpenAntdDeleteConfirm } from '@/customhooks/confirmDelete';
import { getApiErrorMessage } from '@/customhooks/confirmDelete/getApiErrorMessage';
import { useNotification } from '@/hooks/notifications/useNotification';
import type { SwFirmware, SwFirmwareVersion } from '@/types/swRegistry';
import { formatFileSize } from '@/utils/formatFileSize';
import { triggerFileDownload } from '@/components/filePreview/FilePreviewModal';
import { SwFirmwareUploadModal, type FirmwareVersionSubmit } from './SwFirmwareUploadModal';
import styles from './SwFirmwaresTab.module.scss';

interface Props {
  itemId: string;
  canEdit?: boolean;
}

type FirmwareTreeRow = {
  key: string;
  kind: 'firmware' | 'version';
  firmware: SwFirmware;
  version?: SwFirmwareVersion;
  children?: FirmwareTreeRow[];
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU');
}

function toTree(firmwares: SwFirmware[]): FirmwareTreeRow[] {
  return firmwares.map((firmware) => {
    const [current, ...history] = firmware.versions ?? [];
    const children = history.map((version) => ({
      key: version.id,
      kind: 'version' as const,
      firmware,
      version,
    }));
    return {
      key: firmware.id,
      kind: 'firmware' as const,
      firmware,
      version: current,
      ...(children.length ? { children } : {}),
    };
  });
}

/**
 * Прошивки программы. Прошивок бывает несколько (загрузчик, основное ПО, образ ПЛИС).
 * Таблица-дерево: строка прошивки — текущая сборка, дети — прежние версии.
 */
export function SwFirmwaresTab({ itemId, canEdit }: Props) {
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const firmwaresQuery = useSwFirmwares(itemId);
  const createMut = useCreateSwFirmware();
  const createVersionMut = useCreateSwFirmwareVersion();
  const updateMut = useUpdateSwFirmware();
  const deleteVersionMut = useDeleteSwFirmwareVersion();
  const deleteMut = useDeleteSwFirmware();

  /** null — окно закрыто, firmware: null — заводим новую прошивку. */
  const [uploadFor, setUploadFor] = useState<{ firmware: SwFirmware | null } | null>(null);
  const [renameFor, setRenameFor] = useState<SwFirmware | null>(null);
  const [renameForm] = Form.useForm<{ name: string; note?: string }>();
  const [submitError, setSubmitError] = useState<unknown>(undefined);
  const pendingId = useRef('');

  const firmwares = firmwaresQuery.data ?? [];
  const treeData = useMemo(() => toTree(firmwares), [firmwares]);

  const download = async (version: SwFirmwareVersion) => {
    try {
      const link = await swRegistryApi.getFirmwareVersionLink(version.id);
      triggerFileDownload(link.url, version.filename);
    } catch (err) {
      showNotification('error', 'Ошибка', getApiErrorMessage(err) ?? 'Не удалось получить ссылку на файл');
    }
  };

  const removeVersion = (firmware: SwFirmware, version: SwFirmwareVersion) => {
    pendingId.current = version.id;
    const last = (firmware.versions ?? []).length === 1;
    openDeleteConfirm({
      mutation: deleteVersionMut,
      getVariables: () => ({ versionId: pendingId.current, itemId }),
      showNotification,
      title: `Удалить версию ${version.version} прошивки «${firmware.name}»?`,
      content: last
        ? 'Это последняя сборка: вместе с файлом будет удалена и сама прошивка.'
        : 'Файл сборки будет удалён из хранилища.',
      successMessage: last ? 'Версия и прошивка удалены' : 'Версия удалена',
      errorMessage: 'Не удалось удалить версию',
      navigate,
    });
  };

  const removeFirmware = (firmware: SwFirmware) => {
    pendingId.current = firmware.id;
    openDeleteConfirm({
      mutation: deleteMut,
      getVariables: () => ({ id: pendingId.current, itemId }),
      showNotification,
      title: `Удалить прошивку «${firmware.name}»?`,
      content: `Вместе с ней уйдут все её версии (${firmware.versions.length}) и их файлы.`,
      successMessage: 'Прошивка удалена',
      errorMessage: 'Не удалось удалить прошивку',
      navigate,
    });
  };

  const submitUpload = (payload: FirmwareVersionSubmit) => {
    setSubmitError(undefined);
    const target = uploadFor?.firmware ?? null;
    const done = (text: string) => {
      setUploadFor(null);
      showNotification('success', 'Готово', text);
    };

    if (target) {
      createVersionMut.mutate(
        { itemId, payload: { firmwareId: target.id, ...payload } },
        {
          onSuccess: () => done(`Версия ${payload.version} прошивки «${target.name}» загружена`),
          onError: err => setSubmitError(err),
        },
      );
      return;
    }

    createMut.mutate(
      { itemId, name: payload.name ?? '', ...payload },
      {
        onSuccess: () => done(`Прошивка «${payload.name}» заведена, версия ${payload.version} загружена`),
        onError: err => setSubmitError(err),
      },
    );
  };

  const submitRename = async () => {
    if (!renameFor) return;
    const values = await renameForm.validateFields();
    updateMut.mutate(
      { id: renameFor.id, itemId, payload: { name: values.name.trim(), note: values.note?.trim() || null } },
      {
        onSuccess: () => {
          setRenameFor(null);
          showNotification('success', 'Готово', 'Прошивка переименована');
        },
        onError: err =>
          showNotification('error', 'Ошибка', getApiErrorMessage(err) ?? 'Не удалось переименовать прошивку'),
      },
    );
  };

  const columns: ColumnsType<FirmwareTreeRow> = [
    {
      title: 'Прошивка',
      key: 'name',
      ellipsis: true,
      render: (_, row) => (
        <div>
          <div className={row.kind === 'firmware' ? styles.firmwareName : styles.pastName}>
            {row.firmware.name}
          </div>
          {row.kind === 'firmware' && row.firmware.note ? (
            <div className={styles.note}>{row.firmware.note}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Версия',
      key: 'version',
      width: 140,
      render: (_, row) => {
        if (!row.version) return '—';
        if (row.kind === 'firmware') {
          return <span className={styles.currentVersion}>{row.version.version}</span>;
        }
        return <span className={styles.pastVersion}>{row.version.version}</span>;
      },
    },
    {
      title: 'Файл',
      key: 'file',
      ellipsis: true,
      render: (_, row) =>
        row.version ? (
          <span className={styles.filename} title={row.version.filename}>
            {row.version.filename}
          </span>
        ) : (
          '—'
        ),
    },
    {
      title: 'Размер',
      key: 'size',
      width: 110,
      render: (_, row) => (row.version ? formatFileSize(row.version.sizeBytes ?? 0) : '—'),
    },
    {
      title: 'Сборка',
      key: 'builtAt',
      width: 120,
      render: (_, row) => formatDate(row.version?.builtAt ?? null),
    },
    {
      title: 'Загружена',
      key: 'createdAt',
      width: 180,
      render: (_, row) => {
        if (!row.version) return '—';
        const who = row.version.createdByName ? `, ${row.version.createdByName}` : '';
        return `${formatDate(row.version.createdAt)}${who}`;
      },
    },
    {
      title: 'SHA-256',
      key: 'sha256',
      width: 100,
      render: (_, row) =>
        row.version?.sha256 ? (
          <Tooltip title={row.version.sha256}>
            <span className={styles.hash}>{row.version.sha256.slice(0, 8)}</span>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      title: '',
      key: 'actions',
      width: canEdit ? 168 : 48,
      render: (_, row) => {
        if (row.kind === 'firmware') {
          return (
            <div className={styles.actions}>
              {canEdit ? (
                <Button
                  size='small'
                  icon={<CloudUploadOutlined />}
                  onClick={() => setUploadFor({ firmware: row.firmware })}
                >
                  Версия
                </Button>
              ) : null}
              {row.version ? (
                <Tooltip title='Скачать'>
                  <Button type='text' icon={<DownloadOutlined />} onClick={() => void download(row.version!)} />
                </Tooltip>
              ) : null}
              {canEdit ? (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      { key: 'rename', icon: <EditOutlined />, label: 'Переименовать' },
                      ...(row.version
                        ? ([
                            {
                              key: 'deleteVersion',
                              icon: <DeleteOutlined />,
                              label: 'Удалить текущую версию',
                              danger: true,
                            },
                          ] satisfies MenuProps['items'])
                        : []),
                      { key: 'delete', icon: <DeleteOutlined />, label: 'Удалить прошивку', danger: true },
                    ],
                    onClick: ({ key }) => {
                      if (key === 'rename') {
                        renameForm.setFieldsValue({
                          name: row.firmware.name,
                          note: row.firmware.note ?? '',
                        });
                        setRenameFor(row.firmware);
                      }
                      if (key === 'deleteVersion' && row.version) removeVersion(row.firmware, row.version);
                      if (key === 'delete') removeFirmware(row.firmware);
                    },
                  }}
                >
                  <Button type='text'>⋯</Button>
                </Dropdown>
              ) : null}
            </div>
          );
        }
        if (!row.version) return null;
        return (
          <div className={styles.actions}>
            <Tooltip title='Скачать'>
              <Button type='text' size='small' icon={<DownloadOutlined />} onClick={() => void download(row.version!)} />
            </Tooltip>
            {canEdit ? (
              <Tooltip title='Удалить версию'>
                <Button
                  type='text'
                  size='small'
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeVersion(row.firmware, row.version!)}
                />
              </Tooltip>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className={styles.wrap}>
      {contextHolder}

      <div className={styles.head}>
        <span className={styles.hint}>
          У каждой прошивки своя линия версий: новая сборка добавляется версией, прежние остаются доступными.
        </span>
        {canEdit ? (
          <Button type='primary' icon={<PlusOutlined />} onClick={() => setUploadFor({ firmware: null })}>
            Новая прошивка
          </Button>
        ) : null}
      </div>

      {firmwaresQuery.isLoading ? (
        <div className={styles.center}>
          <Spin />
        </div>
      ) : firmwares.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Прошивки не загружены' />
      ) : (
        <Table<FirmwareTreeRow>
          className={styles.table}
          size='small'
          pagination={false}
          rowKey='key'
          columns={columns}
          dataSource={treeData}
          expandable={{ indentSize: 20 }}
          rowClassName={(row) => (row.kind === 'version' ? styles.pastRow : '')}
        />
      )}

      {uploadFor ? (
        <SwFirmwareUploadModal
          open
          itemId={itemId}
          firmware={uploadFor.firmware ? { id: uploadFor.firmware.id, name: uploadFor.firmware.name } : null}
          takenVersions={uploadFor.firmware?.versions.map(v => v.version) ?? []}
          existingBuilds={
            uploadFor.firmware?.versions.map(v => ({
              version: v.version,
              sizeBytes: v.sizeBytes,
              sha256: v.sha256,
            })) ?? []
          }
          takenNames={firmwares.map(f => f.name)}
          confirmLoading={createMut.isPending || createVersionMut.isPending}
          submitError={submitError}
          onCancel={() => {
            setSubmitError(undefined);
            setUploadFor(null);
          }}
          onSubmit={submitUpload}
        />
      ) : null}

      <Modal
        open={Boolean(renameFor)}
        title='Прошивка'
        okText='Сохранить'
        cancelText='Отмена'
        onOk={submitRename}
        onCancel={() => setRenameFor(null)}
        confirmLoading={updateMut.isPending}
        destroyOnHidden
      >
        <Form form={renameForm} layout='vertical' requiredMark={false}>
          <Form.Item name='name' label='Наименование' rules={[{ required: true, message: 'Укажите наименование' }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name='note' label='Примечание'>
            <Input.TextArea rows={2} maxLength={1000} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
