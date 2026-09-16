import { useEffect, useRef, useState } from 'react';
import { CloudUploadOutlined, FileZipOutlined } from '@ant-design/icons';
import { Alert, Button, DatePicker, Form, Input, Modal, Progress, Upload } from 'antd';
import type { Dayjs } from 'dayjs';

import { swRegistryApi } from '@/api/swRegistry/swRegistryApi';
import { startSwFirmwareUpload, type SwDraftUpload } from '@/api/swRegistry/uploadSwFile';
import { getApiErrorMessage } from '@/customhooks/confirmDelete/getApiErrorMessage';
import { formatFileSize } from '@/utils/formatFileSize';
import styles from './SwRegistryModals.module.scss';

type FormValues = { version?: string; builtAt?: Dayjs | null; note?: string };

/** Предел хранилища (TUS_MAX_SIZE): больше него загрузка сорвётся уже на первом запросе. */
const MAX_FIRMWARE_BYTES = 10 * 1024 ** 3;

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; filename: string; size: number; percent: number; fileId?: string }
  | { status: 'done'; filename: string; size: number; fileId: string; versionId: string }
  | { status: 'error'; filename: string; message: string; fileId?: string };

interface Props {
  open: boolean;
  itemId: string;
  takenVersions: string[];
  confirmLoading?: boolean;
  submitError?: unknown;
  onCancel: () => void;
  onSubmit: (payload: { version: string; builtAt: string | null; note: string | null; fileId: string; filename: string }) => void;
}

function uploadedFileId(state: UploadState): string | undefined {
  return state.status === 'idle' ? undefined : state.fileId;
}

/** Прошивки весят гигабайты: файл заливается сразу при выборе, реквизиты заполняются пока идёт передача. */
export function SwFirmwareUploadModal({
  open,
  itemId,
  takenVersions,
  confirmLoading,
  submitError,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const uploadHandle = useRef<SwDraftUpload | null>(null);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setUpload({ status: 'idle' });
      uploadHandle.current = null;
    }
  }, [open, form]);

  /** Отказ от залитого файла: без записи он останется в хранилище навсегда. */
  const discard = (state: UploadState) => {
    const fileId = uploadedFileId(state);
    if (fileId) void swRegistryApi.discardFirmwareUpload(fileId).catch(() => undefined);
  };

  const startUpload = (file: File) => {
    uploadHandle.current?.abort();
    discard(upload);
    setUpload({ status: 'uploading', filename: file.name, size: file.size, percent: 0 });

    // Ответы прежней (заменённой или отменённой) загрузки приходят позже — применяем только текущую.
    const isCurrent = () => uploadHandle.current === handle && !handle.isAborted();
    const handle = startSwFirmwareUpload(file, {
      itemId,
      onTicket: ticket => {
        if (!isCurrent()) return;
        setUpload(current => (current.status === 'uploading' ? { ...current, fileId: ticket.fileId } : current));
      },
      onProgress: percent => {
        if (!isCurrent()) return;
        setUpload(current => (current.status === 'uploading' ? { ...current, percent } : current));
      },
    });
    uploadHandle.current = handle;
    handle.promise
      .then(ticket => {
        if (!isCurrent()) return;
        setUpload({ status: 'done', filename: file.name, size: file.size, ...ticket });
      })
      .catch(() => {
        if (!isCurrent()) return;
        setUpload(current => ({
          status: 'error',
          filename: file.name,
          message: 'Не удалось загрузить файл — выберите его ещё раз',
          fileId: uploadedFileId(current),
        }));
      });
  };

  const cancel = () => {
    uploadHandle.current?.abort();
    uploadHandle.current = null;
    discard(upload);
    setUpload({ status: 'idle' });
    onCancel();
  };

  const submit = async () => {
    const values = await form.validateFields();
    if (upload.status !== 'done') return;
    onSubmit({
      version: (values.version ?? '').trim(),
      builtAt: values.builtAt ? values.builtAt.format('YYYY-MM-DD') : null,
      note: values.note?.trim() || null,
      fileId: upload.fileId,
      filename: upload.filename,
    });
  };

  const uploading = upload.status === 'uploading';

  return (
    <Modal
      open={open}
      title='Загрузка прошивки'
      okText='Сохранить'
      cancelText='Отмена'
      onOk={submit}
      onCancel={cancel}
      confirmLoading={confirmLoading}
      okButtonProps={{ disabled: upload.status !== 'done' }}
      maskClosable={false}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout='vertical' requiredMark={false}>
        <Form.Item
          name='version'
          label='Версия прошивки'
          rules={[
            { required: true, message: 'Укажите версию' },
            {
              validator: (_rule, value: string | undefined) =>
                value && takenVersions.includes(value.trim())
                  ? Promise.reject(new Error('Такая версия у программы уже загружена'))
                  : Promise.resolve(),
            },
          ]}
        >
          <Input placeholder='1.4.2' maxLength={50} autoFocus />
        </Form.Item>

        <Form.Item name='builtAt' label='Дата сборки'>
          <DatePicker format='DD.MM.YYYY' style={{ width: '100%' }} placeholder='Выберите дату' />
        </Form.Item>

        <Form.Item name='note' label='Примечание'>
          <Input.TextArea rows={2} maxLength={1000} placeholder='Что изменилось в этой сборке' />
        </Form.Item>

        <Form.Item label='Файл прошивки' required>
          {upload.status === 'idle' || upload.status === 'error' ? (
            <>
              <Upload.Dragger
                multiple={false}
                showUploadList={false}
                beforeUpload={file => {
                  const picked = file as unknown as File;
                  if (picked.size > MAX_FIRMWARE_BYTES) {
                    setUpload({
                      status: 'error',
                      filename: picked.name,
                      message: `Файл больше 10 ГиБ (${formatFileSize(picked.size)}) — хранилище такой не принимает`,
                    });
                    return false;
                  }
                  startUpload(picked);
                  return false;
                }}
              >
                <p className='ant-upload-drag-icon'>
                  <CloudUploadOutlined />
                </p>
                <p className='ant-upload-text'>Перетащите файл прошивки или выберите на диске</p>
                <p className='ant-upload-hint'>Передача идёт кусками и продолжается, пока окно открыто</p>
              </Upload.Dragger>
              {upload.status === 'error' ? (
                <Alert type='error' showIcon message={upload.message} style={{ marginTop: 8 }} />
              ) : null}
            </>
          ) : (
            <div className={styles.uploadedFile}>
              <FileZipOutlined />
              <div className={styles.uploadedFileBody}>
                <div className={styles.uploadedFileName}>{upload.filename}</div>
                <div className={styles.uploadedFileMeta}>
                  {formatFileSize(upload.size)}
                  {uploading ? ' · передача' : ' · загружен'}
                </div>
                {uploading ? <Progress percent={upload.percent} size='small' /> : null}
              </div>
              <Button
                type='text'
                size='small'
                onClick={() => {
                  uploadHandle.current?.abort();
                  uploadHandle.current = null;
                  discard(upload);
                  setUpload({ status: 'idle' });
                }}
              >
                {uploading ? 'Прервать' : 'Заменить'}
              </Button>
            </div>
          )}
        </Form.Item>

        {submitError ? (
          <Alert
            type='error'
            showIcon
            message={getApiErrorMessage(submitError) ?? 'Не удалось сохранить прошивку'}
          />
        ) : null}
      </Form>
    </Modal>
  );
}
