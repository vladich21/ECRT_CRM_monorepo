import { useEffect } from 'react';
import { Col, Form, Input, Modal, Row, Select } from 'antd';

import { useReferenceData } from '@/api/hooks/useReferences';
import { EmployeeSelect } from '@/components/approvals/EmployeeSelect';
import { useSwReferences, useSwStructure } from '@/api/swRegistry/swRegistryApiHooks';
import type { SwItemDetail, UpdateSwItemPayload } from '@/types/swRegistry';
import { flattenStructureOptions } from './swStructureTree';
import styles from './SwRegistryModals.module.scss';

interface Props {
  open: boolean;
  item: SwItemDetail | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: UpdateSwItemPayload) => void;
}

export function SwItemEditModal({ open, item, confirmLoading, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<UpdateSwItemPayload>();
  const structureQuery = useSwStructure('active');
  const kindsQuery = useSwReferences('developmentKinds');
  const { data: refData } = useReferenceData(['partners']);

  useEffect(() => {
    if (!open || !item) return;
    form.setFieldsValue({
      designation: item.designation,
      elementId: item.element.id,
      shortName: item.shortName,
      fullName: item.fullName,
      partnerId: item.partner.id,
      responsibleUserId: item.responsible.id,
      developmentKindCode: item.developmentKindCode,
      specUrl: item.specUrl ?? undefined,
    });
  }, [open, item, form]);

  const elementOptions = flattenStructureOptions(structureQuery.data ?? []);
  const kindOptions = (kindsQuery.data ?? [])
    .filter(k => k.isActive !== false)
    .map(k => ({ value: k.code, label: k.name }));
  const partnerOptions = (refData?.partners ?? []).map(p => ({ value: p.id, label: p.name }));

  return (
    <Modal
      title='Изменить программу'
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      destroyOnHidden
      okText='Сохранить'
      width={780}
    >
      <Form form={form} layout='vertical' className={styles.formCompact} onFinish={onSubmit}>
        <Form.Item name='designation' label='Обозначение' rules={[{ required: true, message: 'Укажите обозначение' }]}>
          <Input maxLength={100} />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} md={14}>
            <Form.Item name='shortName' label='Краткое наименование' rules={[{ required: true, message: 'Укажите краткое наименование' }]}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item name='developmentKindCode' label='Вид разработки' rules={[{ required: true, message: 'Выберите вид' }]}>
              <Select options={kindOptions} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name='fullName' label='Полное наименование' rules={[{ required: true, message: 'Укажите полное наименование' }]}>
          <Input maxLength={500} />
        </Form.Item>

        <Form.Item name='elementId' label='Элемент структуры' rules={[{ required: true, message: 'Выберите элемент' }]}>
          <Select options={elementOptions} showSearch optionFilterProp='label' />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name='partnerId' label='Разработчик' rules={[{ required: true, message: 'Выберите контрагента' }]}>
              <Select options={partnerOptions} showSearch optionFilterProp='label' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='responsibleUserId' label='Ответственный' rules={[{ required: true, message: 'Выберите ответственного' }]}>
              <EmployeeSelect />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name='specUrl' label='Ссылка на ТЗ'>
          <Input maxLength={500} placeholder='https://…' />
        </Form.Item>
      </Form>
    </Modal>
  );
}
