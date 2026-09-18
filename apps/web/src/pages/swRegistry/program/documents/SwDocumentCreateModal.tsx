import { useEffect, useMemo, useRef, useState } from 'react';
import { CloudUploadOutlined, FileOutlined, FolderOpenOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Radio,
  Row,
  Select,
  Upload,
} from 'antd';

import { swRegistryApi } from '@/api/swRegistry/swRegistryApi';
import { useSwReferences } from '@/api/swRegistry/swRegistryApiHooks';
import { startSwDocumentDraftUpload, type SwDraftUpload } from '@/api/swRegistry/uploadSwFile';
import type { SvnEntry } from '@/components/svnPicker/svnApi';
import { SvnPickerModal } from '@/components/svnPicker/SvnPickerModal';
import type { CreateSwDocumentPayload, SwDocumentListRow } from '@/types/swRegistry';
import { formatFileSize } from '@/utils/formatFileSize';

import { assembleDocumentDesignation, assembleSheetDesignation } from '../../shared/swDesignationPreview';
import styles from './SwDocumentCreateModal.module.scss';
import {
  buildDocumentCreateSaveWarnings,
  isDocumentIdTakenError,
  storedSvnFileFromError,
  type SwStoredSvnFile,
} from './swDocumentCreateWarnings';
import { parseSwDocumentFilename } from './swDocumentFilename';
import { useDocumentDraftFile } from './useDocumentDraftFile';

const LETTER_OPTIONS = ['О', 'О₁', 'О₂', 'А', 'Б', 'В'].map(value => ({ value, label: value }));

type FormValues = {
  documentKindCode?: string;
  kindSequenceNo?: number;
  designation?: string;
  name?: string;
  sheetsCount?: number;
  letter?: string | null;
  withApprovalSheet?: boolean;
  approvalSheet?: { designation?: string; sheetsCount?: number };
};

type FileSource = 'svn' | 'upload';

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; filename: string; size: number; percent: number; fileId?: string }
  | { status: 'done'; filename: string; size: number; fileId: string; versionId: string }
  | { status: 'error'; filename: string; message: string; fileId?: string };

interface Props {
  open: boolean;
  itemId: string;
  sheetAllowed: boolean;
  programDesignation: string;
  svnEnabled: boolean;
  /** Каталог программы в SVN — с него открывается выбор файла. */
  svnFolderPath: string | null;
  existingDocuments: SwDocumentListRow[];
  confirmLoading?: boolean;
  submitError?: unknown;
  onCancel: () => void;
  onSubmit: (payload: CreateSwDocumentPayload) => void;
}

/** crypto.randomUUID есть только в защищённом контексте, а стенд и прод открываются по http. */
function newDocumentId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function uploadedFileId(state: UploadState): string | undefined {
  return state.status === 'idle' ? undefined : state.fileId;
}

function FieldHint({ text }: { text?: string }) {
  if (!text) return null;
  return <div className={styles.fieldHint}>{text}</div>;
}

export function SwDocumentCreateModal({
  open,
  itemId,
  sheetAllowed,
  programDesignation,
  svnEnabled,
  svnFolderPath,
  existingDocuments,
  confirmLoading,
  submitError,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const kindsQuery = useSwReferences('documentKinds');
  const draft = useDocumentDraftFile({
    open,
    itemId,
    svnEnabled,
    submitError,
    onFilename: name => applyFilename(name),
  });

  /** Поля, которые человек правил сам: разбор имени файла их не трогает. */
  const manualFields = useRef(new Set<keyof FormValues>());
  /** Последние собранные значения: поле следует за видом и номером, пока совпадает с ними. */
  const derived = useRef<{ designation?: string; name?: string; sheetDesignation?: string }>({});

  const designation = Form.useWatch('designation', form);
  const withSheet = Form.useWatch('withApprovalSheet', form);

  const kindByCode = useMemo(() => new Map((kindsQuery.data ?? []).map(k => [k.code, k])), [kindsQuery.data]);
  const kindByGost = useMemo(
    () =>
      new Map(
        (kindsQuery.data ?? []).filter(k => k.gostCode && k.isActive !== false).map(k => [k.gostCode as string, k]),
      ),
    [kindsQuery.data],
  );

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ sheetsCount: 1, withApprovalSheet: sheetAllowed });
    manualFields.current = new Set();
    derived.current = {};
  }, [open, sheetAllowed, svnEnabled, form]);

  /**
   * Обозначение, наименование и обозначение ЛУ собираются из вида и номера. Поле следует за ними,
   * пока пустое или совпадает с прежним собранным значением; поправили руками — больше не трогаем.
   */
  const syncDerivedFields = () => {
    const values = form.getFieldsValue();
    const kind = values.documentKindCode ? kindByCode.get(values.documentKindCode) : undefined;
    const nextDesignation =
      kind?.gostCode && values.kindSequenceNo
        ? assembleDocumentDesignation(programDesignation, kind.gostCode, values.kindSequenceNo)
        : undefined;
    const patch: FormValues = {};

    if (nextDesignation && (!values.designation || values.designation === derived.current.designation)) {
      patch.designation = nextDesignation;
    }
    if (kind && (!values.name || values.name === derived.current.name)) {
      patch.name = kind.name;
    }
    const designationForSheet = patch.designation ?? values.designation;
    const nextSheet = designationForSheet ? assembleSheetDesignation(designationForSheet) : undefined;
    const currentSheet = values.approvalSheet?.designation;
    if (nextSheet && (!currentSheet || currentSheet === derived.current.sheetDesignation)) {
      patch.approvalSheet = { ...values.approvalSheet, designation: nextSheet };
    }
    if (sheetAllowed && kind?.requiresApprovalSheet) {
      patch.withApprovalSheet = true;
    }

    derived.current = {
      designation: nextDesignation ?? derived.current.designation,
      name: kind?.name ?? derived.current.name,
      sheetDesignation: nextSheet ?? derived.current.sheetDesignation,
    };
    if (Object.keys(patch).length > 0) form.setFieldsValue(patch);
  };

  /** Реквизиты из имени файла — только в поля, которые человек ещё не правил. */
  const applyFilename = (filename: string) => {
    const parsed = parseSwDocumentFilename(filename, programDesignation);
    if (!parsed) return;
    const patch: FormValues = {};
    const kind = kindByGost.get(parsed.gostCode);
    if (kind && !manualFields.current.has('documentKindCode')) patch.documentKindCode = kind.code;
    if (!manualFields.current.has('kindSequenceNo')) patch.kindSequenceNo = parsed.kindSequenceNo;
    if (!manualFields.current.has('name')) patch.name = parsed.name;
    form.setFieldsValue(patch);
    syncDerivedFields();
  };

  const saveWarnings = useMemo(
    () => (submitError != null ? buildDocumentCreateSaveWarnings(submitError) : {}),
    [submitError],
  );

  const localDuplicate = designation
    ? existingDocuments.find(d => d.designation === designation.trim() && d.recordState !== 'deleted')
    : undefined;

  const kindOptions = (kindsQuery.data ?? [])
    .filter(k => k.isActive !== false)
    .map(k => ({ value: k.code, label: k.gostCode ? `${k.gostCode} · ${k.name}` : k.name }));

  /** Отмена: залитый и перенесённый файлы не должны осиротеть в хранилище. */
  const handleCancel = () => {
    draft.discardAll();
    onCancel();
  };

  const handleFinish = (values: FormValues) => {
    if (!draft.fileReady || !values.documentKindCode || !values.kindSequenceNo || !values.sheetsCount) return;
    const file = draft.filePayload();

    const payload: CreateSwDocumentPayload = {
      id: draft.documentId,
      file,
      documentKindCode: values.documentKindCode,
      kindSequenceNo: values.kindSequenceNo,
      designation: values.designation?.trim() || undefined,
      sheetsCount: values.sheetsCount,
      letter: values.letter ?? null,
      name: values.name?.trim() || undefined,
    };
    if (values.withApprovalSheet && sheetAllowed) {
      payload.approvalSheet = {
        designation: values.approvalSheet?.designation?.trim() || undefined,
        sheetsCount: values.approvalSheet?.sheetsCount ?? 1,
      };
    }
    onSubmit(payload);
  };

  return (
    <Modal
      title='Добавить программный документ'
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      okButtonProps={{ disabled: !draft.fileReady }}
      maskClosable={false}
      destroyOnHidden
      okText='Создать'
      width={760}
    >
      {saveWarnings.form ? <Alert type='error' showIcon className={styles.alert} message={saveWarnings.form} /> : null}

      <Form
        form={form}
        layout='vertical'
        className={styles.formCompact}
        onFinish={handleFinish}
        onValuesChange={changed => {
          for (const key of Object.keys(changed) as (keyof FormValues)[]) manualFields.current.add(key);
          if ('documentKindCode' in changed || 'kindSequenceNo' in changed || 'designation' in changed) {
            syncDerivedFields();
          }
        }}
      >
        <Form.Item label='Файл документа' required extra={<FieldHint text={saveWarnings.file} />}>
          {svnEnabled ? (
            <Radio.Group
              className={styles.fileSourceSwitch}
              optionType='button'
              size='small'
              value={draft.source}
              onChange={e => draft.changeSource(e.target.value as FileSource)}
              options={[
                { label: 'Из SVN', value: 'svn' },
                { label: 'С компьютера', value: 'upload' },
              ]}
            />
          ) : null}

          {draft.source === 'svn' ? (
            <div className={styles.fileRow}>
              {draft.svnFile ? (
                <>
                  <FileOutlined />
                  <span className={styles.fileName} title={draft.svnFile.path}>
                    {draft.svnFile.name}
                  </span>
                  {draft.svnFile.revision != null ? (
                    <span className={styles.fileMeta}>r{draft.svnFile.revision}</span>
                  ) : null}
                  {draft.svnFile.size != null ? (
                    <span className={styles.fileMeta}>{formatFileSize(draft.svnFile.size)}</span>
                  ) : null}
                </>
              ) : (
                <span className={styles.fileEmpty}>Файл не выбран</span>
              )}
              <Button size='small' icon={<FolderOpenOutlined />} onClick={() => draft.setSvnPickerOpen(true)}>
                {draft.svnFile ? 'Выбрать другой' : 'Выбрать в SVN'}
              </Button>
            </div>
          ) : (
            <>
              <div className={styles.fileRow}>
                {draft.upload.status === 'idle' ? (
                  <span className={styles.fileEmpty}>Файл не выбран</span>
                ) : (
                  <>
                    <FileOutlined />
                    <span className={styles.fileName} title={draft.upload.filename}>
                      {draft.upload.filename}
                    </span>
                    {'size' in draft.upload ? (
                      <span className={styles.fileMeta}>{formatFileSize(draft.upload.size)}</span>
                    ) : null}
                  </>
                )}
                <Upload
                  showUploadList={false}
                  multiple={false}
                  beforeUpload={file => {
                    draft.startUpload(file);
                    return false;
                  }}
                >
                  <Button size='small' icon={<CloudUploadOutlined />} loading={draft.upload.status === 'uploading'}>
                    {draft.upload.status === 'idle' ? 'Выбрать файл' : 'Выбрать другой'}
                  </Button>
                </Upload>
              </div>
              {draft.upload.status === 'uploading' ? <Progress percent={draft.upload.percent} size='small' /> : null}
              {draft.upload.status === 'error' ? (
                <Alert type='error' showIcon className={styles.alert} message={draft.upload.message} />
              ) : null}
            </>
          )}
        </Form.Item>

        <Form.Item
          name='documentKindCode'
          label='Вид документа по ГОСТ 19.101'
          rules={[{ required: true, message: 'Выберите вид документа' }]}
          extra={<FieldHint text={saveWarnings.documentKindCode} />}
        >
          <Select options={kindOptions} loading={kindsQuery.isLoading} showSearch optionFilterProp='label' />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item
              name='kindSequenceNo'
              label='Порядковый номер вида'
              rules={[{ required: true, message: 'Укажите номер' }]}
            >
              <InputNumber min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              name='designation'
              label='Обозначение документа'
              extra={
                saveWarnings.designation ? (
                  <FieldHint text={saveWarnings.designation} />
                ) : localDuplicate ? (
                  <FieldHint text='Такое обозначение уже есть у документа этой программы' />
                ) : (
                  <FieldHint text='Собирается из программы, вида и номера; можно изменить' />
                )
              }
            >
              <Input maxLength={100} placeholder='Выберите вид и номер' />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name='name' label='Наименование'>
          <Input maxLength={500} placeholder='Из имени файла или справочника видов' />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item
              name='sheetsCount'
              label='Количество листов'
              rules={[{ required: true, message: 'Укажите количество листов' }]}
            >
              <InputNumber min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='letter' label='Литера'>
              <Select allowClear options={LETTER_OPTIONS} placeholder='Не выбрана' />
            </Form.Item>
          </Col>
        </Row>

        {sheetAllowed ? (
          <>
            <Form.Item
              name='withApprovalSheet'
              valuePropName='checked'
              className={styles.checkboxRow}
              extra={<FieldHint text={saveWarnings.withApprovalSheet} />}
            >
              <Checkbox>
                Оформить лист утверждения{' '}
                <span className={styles.checkboxHint}>только при ОКР, не более одного на документ</span>
              </Checkbox>
            </Form.Item>
            {withSheet ? (
              <div className={styles.approvalBlock}>
                <Row gutter={12}>
                  <Col xs={24} md={16}>
                    <Form.Item
                      name={['approvalSheet', 'designation']}
                      label='Обозначение ЛУ'
                      rules={[{ required: true, message: 'Укажите обозначение листа утверждения' }]}
                      extra={<FieldHint text='По умолчанию — обозначение документа + «-ЛУ»' />}
                    >
                      <Input maxLength={200} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name={['approvalSheet', 'sheetsCount']}
                      label='Листов ЛУ'
                      initialValue={1}
                      rules={[{ required: true, message: 'Укажите количество' }]}
                    >
                      <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            ) : null}
          </>
        ) : null}
      </Form>

      {draft.svnPickerOpen ? (
        <SvnPickerModal
          open
          mode='select'
          startPath={svnFolderPath ?? ''}
          onClose={() => draft.setSvnPickerOpen(false)}
          onSelect={draft.pickSvnFile}
        />
      ) : null}
    </Modal>
  );
}
