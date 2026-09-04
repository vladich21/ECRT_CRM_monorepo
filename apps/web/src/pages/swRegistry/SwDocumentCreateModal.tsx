import { useEffect, useMemo, useState } from 'react';
import { Checkbox, Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';

import { useSwReferences } from '@/api/swRegistry/swRegistryApiHooks';
import type { CreateSwDocumentPayload, SwDocumentListRow } from '@/types/swRegistry';
import { assembleSheetDesignation, previewDocumentFields } from './swDesignationPreview';
import { buildDocumentCreateSaveWarnings } from './swDocumentCreateWarnings';
import styles from './SwRegistryModals.module.scss';

const LETTER_OPTIONS = ['О', 'О₁', 'О₂', 'А', 'Б', 'В'].map(value => ({ value, label: value }));

type FormValues = CreateSwDocumentPayload & {
  withApprovalSheet?: boolean;
};

interface Props {
  open: boolean;
  isRnd: boolean;
  programDesignation: string;
  existingDocuments: SwDocumentListRow[];
  confirmLoading?: boolean;
  submitError?: unknown;
  onCancel: () => void;
  onSubmit: (payload: CreateSwDocumentPayload) => void;
}

function FieldHint({ text }: { text?: string }) {
  if (!text) return null;
  return <div className={styles.fieldHint}>{text}</div>;
}

export function SwDocumentCreateModal({
  open,
  isRnd,
  programDesignation,
  existingDocuments,
  confirmLoading,
  submitError,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [nameTouched, setNameTouched] = useState(false);
  const [designationTouched, setDesignationTouched] = useState(false);
  const [sheetDesignationTouched, setSheetDesignationTouched] = useState(false);
  const kindsQuery = useSwReferences('documentKinds');

  const documentKindCode = Form.useWatch('documentKindCode', form);
  const designation = Form.useWatch('designation', form);
  const kindSequenceNo = Form.useWatch('kindSequenceNo', form);
  const withSheet = Form.useWatch('withApprovalSheet', form);

  const kindByCode = useMemo(
    () => new Map((kindsQuery.data ?? []).map(k => [k.code, k])),
    [kindsQuery.data],
  );

  const selectedKind = documentKindCode ? kindByCode.get(documentKindCode) : undefined;

  const suggested = useMemo(() => {
    if (!documentKindCode || !selectedKind?.gostCode) return null;
    return previewDocumentFields(
      programDesignation,
      selectedKind.gostCode,
      existingDocuments,
      documentKindCode,
    );
  }, [documentKindCode, selectedKind?.gostCode, programDesignation, existingDocuments]);

  const sheetDesignation = useMemo(() => {
    const base = designation?.trim() || suggested?.designation;
    return base ? assembleSheetDesignation(base) : '—';
  }, [designation, suggested?.designation]);

  const saveFailed = submitError != null;
  const fieldWarnings = useMemo(() => {
    if (!saveFailed) return null;
    return buildDocumentCreateSaveWarnings(submitError, {
      documentKindCode,
      kindSequenceNo,
      gostCode: selectedKind?.gostCode,
      programDesignation,
      existingDocuments,
    });
  }, [
    saveFailed,
    submitError,
    documentKindCode,
    kindSequenceNo,
    selectedKind?.gostCode,
    programDesignation,
    existingDocuments,
  ]);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setNameTouched(false);
    setDesignationTouched(false);
    setSheetDesignationTouched(false);
    form.setFieldsValue({ sheetsCount: 1, withApprovalSheet: isRnd });
  }, [open, isRnd, form]);

  useEffect(() => {
    if (!open || !documentKindCode || !suggested || designationTouched) return;
    const kind = kindByCode.get(documentKindCode);
    form.setFieldsValue({
      kindSequenceNo: suggested.kindSequenceNo,
      designation: suggested.designation,
      name: nameTouched ? form.getFieldValue('name') : kind?.name,
    });
  }, [open, documentKindCode, suggested, kindByCode, form, designationTouched, nameTouched]);

  useEffect(() => {
    if (!open || !withSheet || sheetDesignationTouched) return;
    const base = designation?.trim() || suggested?.designation;
    if (!base) return;
    form.setFieldValue(['approvalSheet', 'designation'], assembleSheetDesignation(base));
  }, [open, withSheet, designation, suggested?.designation, form, sheetDesignationTouched]);

  useEffect(() => {
    if (!open || !documentKindCode || !isRnd) return;
    const kind = kindByCode.get(documentKindCode);
    if (kind?.requiresApprovalSheet) {
      form.setFieldValue('withApprovalSheet', true);
    }
  }, [open, documentKindCode, isRnd, kindByCode, form]);

  const kindOptions = (kindsQuery.data ?? [])
    .filter(k => k.isActive !== false)
    .map(k => ({
      value: k.code,
      label: k.gostCode ? `${k.gostCode} · ${k.name}` : k.name,
    }));

  const handleFinish = (values: FormValues) => {
    const payload: CreateSwDocumentPayload = {
      documentKindCode: values.documentKindCode,
      kindSequenceNo: values.kindSequenceNo,
      designation: values.designation?.trim() || undefined,
      sheetsCount: values.sheetsCount,
      letter: values.letter ?? null,
      name: values.name?.trim() || undefined,
    };
    if (values.withApprovalSheet && isRnd) {
      payload.approvalSheet = {
        designation:
          values.approvalSheet?.designation?.trim() ||
          (sheetDesignation !== '—' ? sheetDesignation : undefined),
        sheetsCount: values.approvalSheet?.sheetsCount ?? 1,
      };
    }
    onSubmit(payload);
  };

  return (
    <Modal
      title='Добавить программный документ'
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      destroyOnHidden
      okText='Создать'
      width={760}
    >
      <Form form={form} layout='vertical' className={styles.formCompact} onFinish={handleFinish}>
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
              extra={saveFailed ? <FieldHint text={fieldWarnings?.kindSequenceNo} /> : undefined}
            >
              <InputNumber readOnly min={1} style={{ width: '100%' }} controls={false} />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              name='designation'
              label='Обозначение документа'
              extra={
                saveFailed ? (
                  <FieldHint text={fieldWarnings?.designation} />
                ) : (
                  <FieldHint text='Подставляется автоматически; для входящего комплекта можно изменить' />
                )
              }
            >
              <Input
                maxLength={200}
                placeholder='Выберите вид документа'
                onChange={() => setDesignationTouched(true)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name='name'
          label='Наименование'
          extra={saveFailed ? <FieldHint text={fieldWarnings?.name} /> : undefined}
        >
          <Input maxLength={500} placeholder='Из справочника, если пусто' onChange={() => setNameTouched(true)} />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item
              name='sheetsCount'
              label='Количество листов'
              rules={[{ required: true, message: 'Укажите количество листов' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='letter' label='Литера'>
              <Select allowClear options={LETTER_OPTIONS} placeholder='Не выбрана' />
            </Form.Item>
          </Col>
        </Row>

        {isRnd ? (
          <>
            <Form.Item name='withApprovalSheet' valuePropName='checked' className={styles.checkboxRow}>
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
                      <Input maxLength={200} onChange={() => setSheetDesignationTouched(true)} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name={['approvalSheet', 'sheetsCount']}
                      label='Листов ЛУ'
                      initialValue={1}
                      rules={[{ required: true, message: 'Укажите количество' }]}
                    >
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            ) : null}
          </>
        ) : null}
      </Form>
    </Modal>
  );
}
