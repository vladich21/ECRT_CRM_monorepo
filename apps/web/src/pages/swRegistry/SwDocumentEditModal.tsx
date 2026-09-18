import { useEffect, useMemo, useRef, useState } from 'react';
import { Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';

import { useSwReferences } from '@/api/swRegistry/swRegistryApiHooks';
import type { SwDocumentFileRef, SwDocumentListRow, UpdateSwDocumentPayload } from '@/types/swRegistry';

import { assembleDocumentDesignation, assembleSheetDesignation } from './swDesignationPreview';
import { SwFileSourcePicker, type SwFileChoice } from './SwFileSourcePicker';
import styles from './SwRegistryModals.module.scss';

const LETTER_OPTIONS = ['О', 'О₁', 'О₂', 'А', 'Б', 'В'].map(value => ({ value, label: value }));

type FormValues = {
  documentKindCode?: string;
  kindSequenceNo?: number;
  designation?: string;
  name?: string;
  sheetsCount?: number;
  letter?: string | null;
  sheetDesignation?: string;
  sheetSheetsCount?: number;
};

/** Замена копии документа: выбирается здесь, применяется после сохранения реквизитов. */
export type DocumentFileReplacement = SwFileChoice;

interface Props {
  open: boolean;
  document: SwDocumentListRow | null;
  programDesignation: string;
  /** Текущая копия документа: её видно в окне и можно заменить. */
  file?: SwDocumentFileRef | null;
  svnEnabled?: boolean;
  /** Каталог программы в SVN: проводник открывается в нём. */
  svnFolderPath?: string | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: UpdateSwDocumentPayload, replacement?: DocumentFileReplacement) => void;
}

export function SwDocumentEditModal({
  open,
  document,
  programDesignation,
  file,
  svnEnabled,
  svnFolderPath,
  confirmLoading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [fileChoice, setFileChoice] = useState<SwFileChoice | null>(null);
  const kindsQuery = useSwReferences('documentKinds');
  /** Последнее собранное обозначение: поле следует за видом и номером, пока совпадает с ним. */
  const derivedDesignation = useRef<string | undefined>(undefined);

  const kindByCode = useMemo(() => new Map((kindsQuery.data ?? []).map(k => [k.code, k])), [kindsQuery.data]);

  const assemble = (kindCode?: string, sequenceNo?: number) => {
    const gost = kindCode ? kindByCode.get(kindCode)?.gostCode : undefined;
    return gost && sequenceNo ? assembleDocumentDesignation(programDesignation, gost, sequenceNo) : undefined;
  };

  useEffect(() => {
    if (!open || !document) return;
    form.setFieldsValue({
      documentKindCode: document.documentKindCode,
      kindSequenceNo: document.kindSequenceNo,
      designation: document.designation,
      name: document.name,
      sheetsCount: document.sheetsCount,
      letter: document.letter ?? undefined,
      sheetDesignation: document.sheetDesignation ?? undefined,
      sheetSheetsCount: document.sheetSheetsCount ?? undefined,
    });
    setFileChoice(null);
  }, [open, document, form]);

  // Справочник видов может прийти позже формы: без него не понять, собрано ли обозначение или задано руками.
  useEffect(() => {
    if (!open || !document) return;
    const gost = kindByCode.get(document.documentKindCode)?.gostCode;
    derivedDesignation.current = gost
      ? assembleDocumentDesignation(programDesignation, gost, document.kindSequenceNo)
      : undefined;
  }, [open, document, kindByCode, programDesignation]);

  const kindOptions = (kindsQuery.data ?? [])
    .filter(k => k.isActive !== false || k.code === document?.documentKindCode)
    .map(k => ({ value: k.code, label: k.gostCode ? `${k.gostCode} · ${k.name}` : k.name }));

  const handleFinish = (values: FormValues) => {
    onSubmit(
      {
        documentKindCode: values.documentKindCode,
        kindSequenceNo: values.kindSequenceNo,
        designation: values.designation?.trim() || undefined,
        name: values.name,
        sheetsCount: values.sheetsCount,
        letter: values.letter ?? null,
        // Лист утверждения правится здесь же; снимают его отдельным действием в меню строки.
        approvalSheet: document?.sheetStatusCode
          ? {
              designation: values.sheetDesignation?.trim() || undefined,
              sheetsCount: values.sheetSheetsCount ?? undefined,
            }
          : undefined,
      },
      fileChoice ?? undefined,
    );
  };

  return (
    <Modal
      title='Изменить документ'
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      destroyOnHidden
      okText='Сохранить'
      width={680}
    >
      <Form
        form={form}
        layout='vertical'
        className={styles.formCompact}
        onFinish={handleFinish}
        onValuesChange={changed => {
          if (!('documentKindCode' in changed) && !('kindSequenceNo' in changed)) return;
          const values = form.getFieldsValue();
          const next = assemble(values.documentKindCode, values.kindSequenceNo);
          // Документ живой: номер и вид меняются. Обозначение следует за ними, пока его не правили руками.
          if (next && (!values.designation || values.designation === derivedDesignation.current)) {
            form.setFieldValue('designation', next);
            // Обозначение листа тянется за документом, пока пользователь не задал своё.
            const sheetNow = values.sheetDesignation;
            if (sheetNow && sheetNow === assembleSheetDesignation(values.designation ?? '')) {
              form.setFieldValue('sheetDesignation', assembleSheetDesignation(next));
            }
          }
          derivedDesignation.current = next ?? derivedDesignation.current;
        }}
      >
        <Form.Item
          name='documentKindCode'
          label='Вид документа по ГОСТ 19.101'
          rules={[{ required: true, message: 'Выберите вид документа' }]}
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
              label='Обозначение'
              rules={[{ required: true, message: 'Укажите обозначение' }]}
              extra='Собирается из программы, вида и номера; можно изменить'
            >
              <Input maxLength={100} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name='name'
          label='Наименование'
          rules={[{ required: true, message: 'Укажите наименование' }]}
          extra={
            document?.sheetStatusCode
              ? 'Наименование листа утверждения выводится из наименования документа (ДОК-11)'
              : undefined
          }
        >
          <Input maxLength={500} />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item
              name='sheetsCount'
              label='Количество листов'
              rules={[{ required: true, message: 'Укажите количество листов' }]}
            >
              <InputNumber min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='letter' label='Литера'>
              <Select allowClear options={LETTER_OPTIONS} placeholder='Не выбрана' />
            </Form.Item>
          </Col>
        </Row>

        <SwFileSourcePicker
          title='Файл документа'
          current={file ?? null}
          svnEnabled={svnEnabled}
          svnFolderPath={svnFolderPath}
          value={fileChoice}
          onChange={setFileChoice}
        />

        {document?.sheetStatusCode ? (
          <>
            <div className={styles.formSectionTitle}>Лист утверждения</div>
            <Row gutter={16}>
              <Col xs={24} md={14}>
                <Form.Item
                  name='sheetDesignation'
                  label='Обозначение'
                  rules={[{ required: true, message: 'Укажите обозначение листа' }]}
                >
                  <Input maxLength={100} />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item
                  name='sheetSheetsCount'
                  label='Количество листов'
                  rules={[{ required: true, message: 'Укажите количество листов' }]}
                >
                  <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </>
        ) : null}
      </Form>
    </Modal>
  );
}
