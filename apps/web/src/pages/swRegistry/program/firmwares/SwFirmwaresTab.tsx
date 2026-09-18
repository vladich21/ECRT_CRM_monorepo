import { useMemo, useRef, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Empty, Form, Input, Modal, Spin, Table } from 'antd';
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
import { triggerFileDownload } from '@/components/filePreview/FilePreviewModal';
import { useOpenAntdDeleteConfirm } from '@/customhooks/confirmDelete';
import { getApiErrorMessage } from '@/customhooks/confirmDelete/getApiErrorMessage';
import { useNotification } from '@/hooks/notifications/useNotification';
import type { SwFirmware, SwFirmwareVersion } from '@/types/swRegistry';

import { buildFirmwareColumns } from './swFirmwareColumns';
import styles from './SwFirmwaresTab.module.scss';
import { toTree, type FirmwareTreeRow } from './swFirmwareTree';
import { SwFirmwareUploadModal, type FirmwareVersionSubmit } from './SwFirmwareUploadModal';

interface Props {
  itemId: string;
  canEdit?: boolean;
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
  /** Что подтверждают прямо сейчас: getVariables читает это уже после открытия окна. */
  const pending = useRef<{ versionId?: string; firmwareId?: string }>({});

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
    pending.current = { versionId: version.id };
    const last = (firmware.versions ?? []).length === 1;
    openDeleteConfirm({
      mutation: deleteVersionMut,
      getVariables: () => ({ versionId: pending.current.versionId ?? version.id, itemId }),
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
    pending.current = { firmwareId: firmware.id };
    openDeleteConfirm({
      mutation: deleteMut,
      getVariables: () => ({ id: pending.current.firmwareId ?? firmware.id, itemId }),
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

  const columns = buildFirmwareColumns({
    canEdit,
    onUploadVersion: firmware => setUploadFor({ firmware }),
    onDownload: version => void download(version),
    onRename: firmware => {
      renameForm.setFieldsValue({ name: firmware.name, note: firmware.note ?? '' });
      setRenameFor(firmware);
    },
    onRemoveVersion: removeVersion,
    onRemoveFirmware: removeFirmware,
  });

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
          rowClassName={row => (row.kind === 'version' ? styles.pastRow : '')}
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
