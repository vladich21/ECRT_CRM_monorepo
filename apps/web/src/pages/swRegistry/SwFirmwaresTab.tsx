import { useRef, useState } from 'react';
import { CloudUploadOutlined, DeleteOutlined, DownloadOutlined, FileZipOutlined } from '@ant-design/icons';
import { Button, Empty, Spin, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';

import { swRegistryApi } from '@/api/swRegistry/swRegistryApi';
import { useCreateSwFirmware, useDeleteSwFirmware, useSwFirmwares } from '@/api/swRegistry/swRegistryApiHooks';
import { useOpenAntdDeleteConfirm } from '@/customhooks/confirmDelete';
import { getApiErrorMessage } from '@/customhooks/confirmDelete/getApiErrorMessage';
import { useNotification } from '@/hooks/notifications/useNotification';
import type { SwFirmware } from '@/types/swRegistry';
import { formatFileSize } from '@/utils/formatFileSize';
import { triggerFileDownload } from '@/components/filePreview/FilePreviewModal';
import { SwFirmwareUploadModal } from './SwFirmwareUploadModal';
import styles from './SwFirmwaresTab.module.scss';

interface Props {
  itemId: string;
  canEdit?: boolean;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU');
}

/** Прошивки программы: своя нумерация версий, по одному файлу на версию, старые версии не удаляются сами. */
export function SwFirmwaresTab({ itemId, canEdit }: Props) {
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const firmwaresQuery = useSwFirmwares(itemId);
  const createMut = useCreateSwFirmware();
  const deleteMut = useDeleteSwFirmware();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(undefined);
  const pendingDeleteId = useRef('');

  const firmwares = firmwaresQuery.data ?? [];

  const download = async (firmware: SwFirmware) => {
    try {
      const link = await swRegistryApi.getFirmwareLink(firmware.id);
      triggerFileDownload(link.url, firmware.filename);
    } catch (err) {
      showNotification('error', 'Ошибка', getApiErrorMessage(err) ?? 'Не удалось получить ссылку на файл');
    }
  };

  const remove = (firmware: SwFirmware) => {
    pendingDeleteId.current = firmware.id;
    openDeleteConfirm({
      mutation: deleteMut,
      getVariables: () => ({ id: pendingDeleteId.current, itemId }),
      showNotification,
      title: `Удалить прошивку ${firmware.version}?`,
      successMessage: 'Прошивка удалена',
      errorMessage: 'Не удалось удалить прошивку',
      navigate,
    });
  };

  const submit = (payload: {
    version: string;
    builtAt: string | null;
    note: string | null;
    fileId: string;
    filename: string;
  }) => {
    setSubmitError(undefined);
    createMut.mutate(
      { itemId, ...payload },
      {
        onSuccess: () => {
          setModalOpen(false);
          showNotification('success', 'Готово', `Прошивка ${payload.version} загружена`);
        },
        onError: err => setSubmitError(err),
      },
    );
  };

  return (
    <div className={styles.wrap}>
      {contextHolder}

      <div className={styles.head}>
        <span className={styles.hint}>
          Каждая версия хранится отдельным файлом — прежние сборки остаются доступными.
        </span>
        {canEdit ? (
          <Button type='primary' icon={<CloudUploadOutlined />} onClick={() => setModalOpen(true)}>
            Загрузить прошивку
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
          {firmwares.map(firmware => (
            <div key={firmware.id} className={styles.row}>
              <FileZipOutlined className={styles.icon} />
              <div className={styles.main}>
                <div className={styles.titleLine}>
                  <span className={styles.version}>{firmware.version}</span>
                  <span className={styles.filename} title={firmware.filename}>
                    {firmware.filename}
                  </span>
                </div>
                <div className={styles.meta}>
                  <span>{formatFileSize(firmware.sizeBytes ?? 0)}</span>
                  <span>·</span>
                  <span>сборка {formatDate(firmware.builtAt)}</span>
                  <span>·</span>
                  <span>
                    загружена {formatDate(firmware.createdAt)}
                    {firmware.createdByName ? `, ${firmware.createdByName}` : ''}
                  </span>
                  {firmware.sha256 ? (
                    <Tooltip title={`SHA-256: ${firmware.sha256}`}>
                      <span className={styles.hash}>{firmware.sha256.slice(0, 8)}</span>
                    </Tooltip>
                  ) : null}
                </div>
                {firmware.note ? <div className={styles.note}>{firmware.note}</div> : null}
              </div>
              <div className={styles.actions}>
                <Tooltip title='Скачать'>
                  <Button type='text' icon={<DownloadOutlined />} onClick={() => void download(firmware)} />
                </Tooltip>
                {canEdit ? (
                  <Tooltip title='Удалить версию'>
                    <Button type='text' danger icon={<DeleteOutlined />} onClick={() => remove(firmware)} />
                  </Tooltip>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen ? (
        <SwFirmwareUploadModal
          open
          itemId={itemId}
          takenVersions={firmwares.map(f => f.version)}
          confirmLoading={createMut.isPending}
          submitError={submitError}
          onCancel={() => {
            setSubmitError(undefined);
            setModalOpen(false);
          }}
          onSubmit={submit}
        />
      ) : null}
    </div>
  );
}
