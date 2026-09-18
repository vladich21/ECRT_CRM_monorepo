import { useEffect, useRef, useState } from 'react';
import { CloudUploadOutlined, FileZipOutlined } from '@ant-design/icons';
import { Alert, Button, DatePicker, Form, Input, Modal, Progress, Upload } from 'antd';
import type { Dayjs } from 'dayjs';

import { swRegistryApi } from '@/api/swRegistry/swRegistryApi';
import { startSwFirmwareUpload, type SwDraftUpload } from '@/api/swRegistry/uploadSwFile';
import { getApiErrorMessage } from '@/customhooks/confirmDelete/getApiErrorMessage';
import { formatFileSize } from '@/utils/formatFileSize';

import {
  findSameFirmwareBuild,
  HASH_BEFORE_UPLOAD_BYTES,
  sha256Hex,
  type FirmwareBuildFingerprint,
} from './swFirmwareDuplicate';
import styles from './SwFirmwareUploadModal.module.scss';

type FormValues = { name?: string; version?: string; builtAt?: Dayjs | null; note?: string };

/** Предел хранилища: совпадает с files-service TUS_MAX_SIZE (10 ГиБ, 10737418240). */
const MAX_FIRMWARE_BYTES = 10 * 1024 ** 3;

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; filename: string; size: number; percent: number; fileId?: string }
  | { status: 'done'; filename: string; size: number; fileId: string; versionId: string }
  | { status: 'error'; filename: string; message: string; fileId?: string };

export type FirmwareVersionSubmit = {
  /** Наименование задаётся только у новой прошивки, у существующей его не спрашиваем. */
  name?: string;
  version: string;
  builtAt: string | null;
  versionNote: string | null;
  fileId: string;
  filename: string;
};

interface Props {
  open: boolean;
  itemId: string;
  /** Прошивка, в которую грузим новую версию. Без неё окно заводит новую прошивку. */
  firmware?: { id: string; name: string } | null;
  /** Занятые номера версий: у новой прошивки пусто, у существующей — её линия. */
  takenVersions: string[];
  /** Уже загруженные сборки этой прошивки: по хешу отсекаем тот же файл до заливки. */
  existingBuilds?: FirmwareBuildFingerprint[];
  /** Наименования других прошивок программы: подсказываем занятое до отправки. */
  takenNames?: string[];
  confirmLoading?: boolean;
  submitError?: unknown;
  onCancel: () => void;
  onSubmit: (payload: FirmwareVersionSubmit) => void;
}

function uploadedFileId(state: UploadState): string | undefined {
  return state.status === 'idle' ? undefined : state.fileId;
}

/** Прошивки весят гигабайты: файл заливается сразу при выборе, реквизиты заполняются пока идёт передача. */
export function SwFirmwareUploadModal({
  open,
  itemId,
  firmware,
  takenVersions,
  existingBuilds = [],
  takenNames = [],
  confirmLoading,
  submitError,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  /** Совпал только размер: разные файлы так бывают, поэтому это предупреждение, а не отказ. */
  const [sameSizeVersion, setSameSizeVersion] = useState<string | null>(null);
  const uploadHandle = useRef<SwDraftUpload | null>(null);
  const pickGen = useRef(0);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setUpload({ status: 'idle' });
      setSameSizeVersion(null);
      uploadHandle.current = null;
      pickGen.current += 1;
    }
  }, [open, form]);

  /** Отказ от залитого файла: без записи он останется в хранилище навсегда. */
  const discard = (state: UploadState) => {
    const fileId = uploadedFileId(state);
    if (fileId) void swRegistryApi.discardFirmwareUpload(fileId).catch(() => undefined);
  };

  /** Наименование новой прошивки предлагаем по имени файла: чаще всего оно и есть. */
  const suggestName = (filename: string) => {
    if (firmware) return;
    const current = (form.getFieldValue('name') as string | undefined)?.trim();
    if (current) return;
    const base = filename.replace(/\.[^.]+$/, '').trim();
    if (base) form.setFieldsValue({ name: base });
  };

  const startUpload = (file: File) => {
    uploadHandle.current?.abort();
    discard(upload);
    pickGen.current += 1;
    const gen = pickGen.current;
    setSameSizeVersion(null);
    suggestName(file.name);

    const beginTransfer = () => {
      if (gen !== pickGen.current) return;
      setUpload({ status: 'uploading', filename: file.name, size: file.size, percent: 0 });

      // Ответы прежней (заменённой или отменённой) загрузки приходят позже — применяем только текущую.
      const isCurrent = () => gen === pickGen.current && uploadHandle.current === handle && !handle.isAborted();
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

    if (file.size > HASH_BEFORE_UPLOAD_BYTES) {
      const same = findSameFirmwareBuild(existingBuilds, { size: file.size });
      setSameSizeVersion(same?.by === 'size' ? same.version : null);
      beginTransfer();
      return;
    }

    setUpload({ status: 'uploading', filename: file.name, size: file.size, percent: 0 });
    void sha256Hex(file)
      .then(sha256 => {
        if (gen !== pickGen.current) return;
        const same = findSameFirmwareBuild(existingBuilds, { size: file.size, sha256 });
        if (same?.by === 'hash') {
          setUpload({
            status: 'error',
            filename: file.name,
            message: `Этот файл уже загружен как версия ${same.version} — выберите другой`,
          });
          return;
        }
        beginTransfer();
      })
      .catch(() => {
        if (gen !== pickGen.current) return;
        const same = findSameFirmwareBuild(existingBuilds, { size: file.size });
        setSameSizeVersion(same?.by === 'size' ? same.version : null);
        beginTransfer();
      });
  };

  const cancel = () => {
    pickGen.current += 1;
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
      ...(firmware ? {} : { name: (values.name ?? '').trim() }),
      version: (values.version ?? '').trim(),
      builtAt: values.builtAt ? values.builtAt.format('YYYY-MM-DD') : null,
      versionNote: values.note?.trim() || null,
      fileId: upload.fileId,
      filename: upload.filename,
    });
  };

  const uploading = upload.status === 'uploading';

  return (
    <Modal
      open={open}
      title={firmware ? `Новая версия: ${firmware.name}` : 'Новая прошивка'}
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
        {firmware ? null : (
          <Form.Item
            name='name'
            label='Наименование прошивки'
            extra='Например: основное ПО, загрузчик, образ ПЛИС — у каждой своя линия версий'
            rules={[
              { required: true, message: 'Укажите наименование' },
              {
                validator: (_rule, value: string | undefined) =>
                  value && takenNames.includes(value.trim())
                    ? Promise.reject(new Error('Такая прошивка у программы уже есть'))
                    : Promise.resolve(),
              },
            ]}
          >
            <Input placeholder='Основное ПО' maxLength={255} autoFocus />
          </Form.Item>
        )}

        <Form.Item
          name='version'
          label='Версия прошивки'
          rules={[
            { required: true, message: 'Укажите версию' },
            {
              validator: (_rule, value: string | undefined) =>
                value && takenVersions.includes(value.trim())
                  ? Promise.reject(new Error('Такая версия у этой прошивки уже загружена'))
                  : Promise.resolve(),
            },
          ]}
        >
          <Input placeholder='1.4.2' maxLength={50} autoFocus={Boolean(firmware)} />
        </Form.Item>

        <Form.Item name='builtAt' label='Дата сборки'>
          <DatePicker format='DD.MM.YYYY' style={{ width: '100%' }} placeholder='Выберите дату' />
        </Form.Item>

        <Form.Item name='note' label='Примечание к сборке'>
          <Input.TextArea rows={2} maxLength={1000} placeholder='Что изменилось в этой сборке' />
        </Form.Item>

        {sameSizeVersion ? (
          <Alert
            type='warning'
            showIcon
            style={{ marginBottom: 8 }}
            message={`Размер совпадает с версией ${sameSizeVersion}`}
            description='Если это тот же файл, реестр его не примет: одну сборку дважды в одну прошивку не заводим.'
          />
        ) : null}

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
                  pickGen.current += 1;
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
          <Alert type='error' showIcon message={getApiErrorMessage(submitError) ?? 'Не удалось сохранить прошивку'} />
        ) : null}
      </Form>
    </Modal>
  );
}
