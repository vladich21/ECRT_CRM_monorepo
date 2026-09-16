import { useEffect, useState } from 'react';
import { CloudUploadOutlined, FileWordOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, InputNumber, Modal, Radio, Upload } from 'antd';

import { SvnPickerModal } from '@/components/svnPicker/SvnPickerModal';
import type { SvnEntry } from '@/components/svnPicker/svnApi';
import type { SwDocumentFileRef, SwDocumentListRow } from '@/types/swRegistry';
import { assembleSheetDesignation } from './swDesignationPreview';
import styles from './SwRegistryModals.module.scss';

type FormValues = {
  designation?: string;
  sheetsCount?: number;
};

export type ApprovalSheetSubmit = {
  designation: string;
  sheetsCount: number;
  /** Файл из SVN, выбранный здесь же: прикрепляется после сохранения листа. */
  svnPath?: string;
  /** Либо файл с компьютера — грузится тем же порядком, после сохранения листа. */
  localFile?: File;
};

type FileSource = 'svn' | 'upload';

interface Props {
  open: boolean;
  document: SwDocumentListRow | null;
  /** Уже прикреплённая копия листа, если она есть. */
  sheetFile?: SwDocumentFileRef | null;
  svnEnabled?: boolean;
  /** Каталог программы в SVN: проводник открывается сразу в нём. */
  svnFolderPath?: string | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: ApprovalSheetSubmit) => void;
}

/**
 * Лист утверждения: обозначение, объём и сам файл. Лист — такой же документ,
 * поэтому копию выбирают здесь, а не отдельным действием после оформления.
 * Наименование листа не хранится и выводится из наименования документа (ДОК-11).
 */
export function SwApprovalSheetModal({
  open,
  document,
  sheetFile,
  svnEnabled,
  svnFolderPath,
  confirmLoading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [svnFile, setSvnFile] = useState<SvnEntry | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [source, setSource] = useState<FileSource>(svnEnabled ? 'svn' : 'upload');

  useEffect(() => {
    if (!open || !document) return;
    form.setFieldsValue({
      designation: document.sheetDesignation ?? assembleSheetDesignation(document.designation),
      sheetsCount: document.sheetSheetsCount ?? 1,
    });
    setSvnFile(null);
    setLocalFile(null);
    setSource(svnEnabled ? 'svn' : 'upload');
  }, [open, document, form, svnEnabled]);

  const submit = async () => {
    const values = await form.validateFields();
    onSubmit({
      designation: (values.designation ?? '').trim(),
      sheetsCount: values.sheetsCount ?? 1,
      ...(source === 'svn' && svnFile ? { svnPath: svnFile.path } : {}),
      ...(source === 'upload' && localFile ? { localFile } : {}),
    });
  };

  const isEditing = Boolean(document?.sheetStatusCode);

  return (
    <>
      <Modal
        open={open}
        title={isEditing ? 'Лист утверждения' : 'Оформить лист утверждения'}
        okText={isEditing ? 'Сохранить' : 'Оформить'}
        cancelText='Отмена'
        confirmLoading={confirmLoading}
        onCancel={onCancel}
        onOk={() => void submit()}
        destroyOnHidden
        width={560}
      >
        <Form form={form} layout='vertical' className={styles.form}>
          <Form.Item
            name='designation'
            label='Обозначение листа утверждения'
            rules={[{ required: true, message: 'Укажите обозначение' }]}
            extra={`Документ: ${document?.designation ?? ''}`}
          >
            <Input placeholder='РОФ.ГКМН.620013-01 12 01-ЛУ' maxLength={100} />
          </Form.Item>

          <Form.Item
            name='sheetsCount'
            label='Количество листов'
            rules={[{ required: true, message: 'Укажите количество листов' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>

          <div className={styles.formSectionTitle}>Файл листа утверждения</div>

          <div className={styles.fileBlock}>
          {svnEnabled ? (
            <Radio.Group
              className={styles.fileSourceSwitch}
              optionType='button'
              size='small'
              value={source}
              onChange={e => {
                setSource(e.target.value as FileSource);
                setSvnFile(null);
                setLocalFile(null);
              }}
              options={[
                { value: 'svn', label: 'Из SVN' },
                { value: 'upload', label: 'С компьютера' },
              ]}
            />
          ) : null}

          {source === 'svn' ? (
            svnFile ? (
              <Alert
                type='success'
                showIcon
                icon={<FileWordOutlined />}
                message={svnFile.name}
                description={svnFile.path}
                action={
                  <Button size='small' onClick={() => setSvnFile(null)}>
                    Убрать
                  </Button>
                }
              />
            ) : sheetFile ? (
              <Alert
                type='info'
                showIcon
                icon={<FileWordOutlined />}
                message={sheetFile.filename}
                description={sheetFile.svnRevision ? `SVN r${sheetFile.svnRevision}` : 'загружен вручную'}
                action={
                  <Button size='small' icon={<FolderOpenOutlined />} onClick={() => setPickerOpen(true)}>
                    Заменить
                  </Button>
                }
              />
            ) : (
              <Button icon={<FolderOpenOutlined />} onClick={() => setPickerOpen(true)}>
                Выбрать файл в SVN
              </Button>
            )
          ) : localFile ? (
            <Alert
              type='success'
              showIcon
              icon={<FileWordOutlined />}
              message={localFile.name}
              description={`${Math.round(localFile.size / 1024)} КБ`}
              action={
                <Button size='small' onClick={() => setLocalFile(null)}>
                  Убрать
                </Button>
              }
            />
          ) : (
            <Upload.Dragger
              multiple={false}
              showUploadList={false}
              beforeUpload={file => {
                setLocalFile(file);
                return Upload.LIST_IGNORE;
              }}
            >
              <p className='ant-upload-drag-icon'>
                <CloudUploadOutlined />
              </p>
              <p className='ant-upload-text'>Перетащите файл листа или нажмите для выбора</p>
            </Upload.Dragger>
          )}

          </div>
        </Form>
      </Modal>

      {pickerOpen ? (
        <SvnPickerModal
          open
          mode='select'
          startPath={svnFolderPath ?? ''}
          onClose={() => setPickerOpen(false)}
          onSelect={entry => {
            setSvnFile(entry);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
