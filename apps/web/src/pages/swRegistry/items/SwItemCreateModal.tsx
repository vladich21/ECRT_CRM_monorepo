import { useEffect } from 'react';
import { Alert, Col, Form, Input, Modal, Row, Select } from 'antd';

import { useReferenceData } from '@/api/hooks/useReferences';
import { EmployeeSelect } from '@/components/approvals/EmployeeSelect';
import { useSwReferences, useSwStructure } from '@/api/swRegistry/swRegistryApiHooks';
import type { CreateSwItemPayload } from '@/types/swRegistry';
import { flattenStructureOptions } from '../structure/swStructureTree';
import styles from './SwItemCreateModal.module.scss';

interface Props {
  open: boolean;
  defaultElementId?: string;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateSwItemPayload) => void;
}

export function SwItemCreateModal({ open, defaultElementId, confirmLoading, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<CreateSwItemPayload>();
  const structureQuery = useSwStructure('active');
  const kindsQuery = useSwReferences('developmentKinds');
  const { data: refData } = useReferenceData(['partners']);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (defaultElementId) {
      form.setFieldsValue({ elementId: defaultElementId });
    }
  }, [open, defaultElementId, form]);

  const elementOptions = flattenStructureOptions(structureQuery.data ?? []);
  const kindOptions = (kindsQuery.data ?? [])
    .filter(k => k.isActive !== false)
    .map(k => ({ value: k.code, label: k.name }));
  const partnerOptions = (refData?.partners ?? []).map(p => ({ value: p.id, label: p.name }));
  const refsFailed = kindsQuery.isError;
  const structureFailed = structureQuery.isError;

  return (
    <Modal
      title='Добавить программу'
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      destroyOnHidden
      okText='Создать'
      width={780}
    >
      <Form form={form} layout='vertical' className={styles.formCompact} onFinish={onSubmit}>
        {refsFailed ? (
          <Alert
            type='error'
            showIcon
            className={styles.alert}
            message='Не удалось загрузить справочники'
            description='Проверьте права sw.references и выполнение sw-registry.sql в БД.'
          />
        ) : null}
        {structureFailed ? (
          <Alert
            type='error'
            showIcon
            className={styles.alert}
            message='Не удалось загрузить структуру'
            description='Нужны права sw.structure и хотя бы один элемент в дереве.'
          />
        ) : null}
        {!structureFailed && elementOptions.length === 0 ? (
          <Alert
            type='info'
            showIcon
            className={styles.alert}
            message='Элементов структуры пока нет'
            description='Сначала создайте элемент в разделе «Структура систем».'
          />
        ) : null}

        <Form.Item name='designation' label='Обозначение' rules={[{ required: true, message: 'Укажите обозначение' }]}>
          <Input maxLength={100} placeholder='РОФ.ГКМН.620013-01' />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} md={14}>
            <Form.Item name='shortName' label='Краткое наименование' rules={[{ required: true, message: 'Укажите краткое наименование' }]}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item name='developmentKindCode' label='Вид разработки' rules={[{ required: true, message: 'Выберите вид' }]}>
              <Select options={kindOptions} loading={kindsQuery.isLoading} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name='fullName' label='Полное наименование' rules={[{ required: true, message: 'Укажите полное наименование' }]}>
          <Input maxLength={500} />
        </Form.Item>

        <Form.Item name='elementId' label='Элемент структуры' rules={[{ required: true, message: 'Выберите элемент' }]}>
          <Select
            options={elementOptions}
            showSearch
            optionFilterProp='label'
            loading={structureQuery.isLoading}
            placeholder='Система / подсистема'
          />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name='partnerId' label='Разработчик' rules={[{ required: true, message: 'Выберите контрагента' }]}>
              <Select options={partnerOptions} showSearch optionFilterProp='label' placeholder='Контрагент' />
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
