import { useRef, useState } from 'react';
import {
  CaretDownOutlined,
  CaretRightOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileZipOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Empty, Form, Input, Modal, Spin, Tooltip, type MenuProps } from 'antd';
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

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU');
}

/**
 * Прошивки программы. Прошивок бывает несколько (загрузчик, основное ПО, образ ПЛИС),
 * поэтому каждая идёт своим блоком: сверху текущая версия, под ней прежние сборки.
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

  /** null — окно закрыто, undefined в поле firmware — заводим новую прошивку. */
  const [uploadFor, setUploadFor] = useState<{ firmware: SwFirmware | null } | null>(null);
  const [renameFor, setRenameFor] = useState<SwFirmware | null>(null);
  const [renameForm] = Form.useForm<{ name: string; note?: string }>();
  const [submitError, setSubmitError] = useState<unknown>(undefined);
  /** Раскрытая история: по умолчанию все свёрнуты, видна только текущая сборка. */
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(() => new Set());
  const pendingId = useRef('');

  const firmwares = firmwaresQuery.data ?? [];

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
    openDeleteConfirm({
      mutation: deleteVersionMut,
      getVariables: () => ({ versionId: pendingId.current, itemId }),
      showNotification,
      title: `Удалить версию ${version.version} прошивки «${firmware.name}»?`,
      content: 'Файл сборки будет удалён из хранилища.',
      successMessage: 'Версия удалена',
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

  const toggleHistory = (firmwareId: string) => {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      if (next.has(firmwareId)) next.delete(firmwareId);
      else next.add(firmwareId);
      return next;
    });
  };

  const renderPastVersion = (firmware: SwFirmware, version: SwFirmwareVersion) => (
    <div key={version.id} className={styles.version}>
      <FileZipOutlined className={styles.icon} />
      <div className={styles.main}>
        <div className={styles.titleLine}>
          <span className={styles.versionNo}>{version.version}</span>
          <span className={styles.filename} title={version.filename}>
            {version.filename}
          </span>
        </div>
        <div className={styles.meta}>
          <span>{formatFileSize(version.sizeBytes ?? 0)}</span>
          <span>·</span>
          <span>сборка {formatDate(version.builtAt)}</span>
          <span>·</span>
          <span>
            загружена {formatDate(version.createdAt)}
            {version.createdByName ? `, ${version.createdByName}` : ''}
          </span>
          {version.sha256 ? (
            <Tooltip title={`SHA-256: ${version.sha256}`}>
              <span className={styles.hash}>{version.sha256.slice(0, 8)}</span>
            </Tooltip>
          ) : null}
        </div>
        {version.note ? <div className={styles.note}>{version.note}</div> : null}
      </div>
      <div className={styles.actions}>
        <Tooltip title='Скачать'>
          <Button type='text' size='small' icon={<DownloadOutlined />} onClick={() => void download(version)} />
        </Tooltip>
        {canEdit ? (
          <Tooltip title='Удалить версию'>
            <Button
              type='text'
              size='small'
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeVersion(firmware, version)}
            />
          </Tooltip>
        ) : null}
      </div>
    </div>
  );

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
        <div className={styles.list}>
          {firmwares.map(firmware => {
            const [current, ...history] = firmware.versions;
            const accordion = history.length > 0;
            const open = accordion && expandedHistory.has(firmware.id);
            return (
              <section key={firmware.id} className={styles.firmware}>
                <div className={accordion ? `${styles.card} ${styles.cardToggle}` : styles.card}>
                  {accordion ? (
                    <button
                      type='button'
                      className={styles.caretBtn}
                      aria-expanded={open}
                      aria-label={open ? 'Свернуть прежние версии' : 'Показать прежние версии'}
                      onClick={() => toggleHistory(firmware.id)}
                    >
                      {open ? <CaretDownOutlined /> : <CaretRightOutlined />}
                    </button>
                  ) : (
                    <FileZipOutlined className={styles.icon} />
                  )}
                  <div
                    className={styles.main}
                    onClick={accordion ? () => toggleHistory(firmware.id) : undefined}
                  >
                    <div className={styles.titleLine}>
                      <span className={styles.firmwareName}>{firmware.name}</span>
                      {current ? <span className={styles.versionNo}>{current.version}</span> : null}
                      {accordion && !open ? (
                        <span className={styles.more}>ещё {history.length}</span>
                      ) : null}
                    </div>
                    {firmware.note ? <div className={styles.note}>{firmware.note}</div> : null}
                    {current ? (
                      <>
                        <div className={styles.filename} title={current.filename}>
                          {current.filename}
                        </div>
                        <div className={styles.meta}>
                          <span>{formatFileSize(current.sizeBytes ?? 0)}</span>
                          <span>·</span>
                          <span>сборка {formatDate(current.builtAt)}</span>
                          <span>·</span>
                          <span>
                            загружена {formatDate(current.createdAt)}
                            {current.createdByName ? `, ${current.createdByName}` : ''}
                          </span>
                          {current.sha256 ? (
                            <Tooltip title={`SHA-256: ${current.sha256}`}>
                              <span className={styles.hash}>{current.sha256.slice(0, 8)}</span>
                            </Tooltip>
                          ) : null}
                        </div>
                        {current.note ? <div className={styles.note}>{current.note}</div> : null}
                      </>
                    ) : null}
                  </div>
                  <div className={styles.actions}>
                    {canEdit ? (
                      <Button
                        size='small'
                        icon={<CloudUploadOutlined />}
                        onClick={() => setUploadFor({ firmware })}
                      >
                        Загрузить версию
                      </Button>
                    ) : null}
                    {current ? (
                      <Tooltip title='Скачать'>
                        <Button type='text' icon={<DownloadOutlined />} onClick={() => void download(current)} />
                      </Tooltip>
                    ) : null}
                    {canEdit ? (
                      <Dropdown
                        trigger={['click']}
                        menu={{
                          items: [
                            { key: 'rename', icon: <EditOutlined />, label: 'Переименовать' },
                            ...(current
                              ? ([
                                  {
                                    key: 'deleteVersion',
                                    icon: <DeleteOutlined />,
                                    label: 'Удалить версию',
                                    danger: true,
                                  },
                                ] satisfies MenuProps['items'])
                              : []),
                            { key: 'delete', icon: <DeleteOutlined />, label: 'Удалить прошивку', danger: true },
                          ],
                          onClick: ({ key }) => {
                            if (key === 'rename') {
                              renameForm.setFieldsValue({ name: firmware.name, note: firmware.note ?? '' });
                              setRenameFor(firmware);
                            }
                            if (key === 'deleteVersion' && current) removeVersion(firmware, current);
                            if (key === 'delete') removeFirmware(firmware);
                          },
                        }}
                      >
                        <Button type='text'>⋯</Button>
                      </Dropdown>
                    ) : null}
                  </div>
                </div>
                {open ? (
                  <div className={styles.history}>{history.map((version) => renderPastVersion(firmware, version))}</div>
                ) : null}
              </section>
            );
          })}
        </div>
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
