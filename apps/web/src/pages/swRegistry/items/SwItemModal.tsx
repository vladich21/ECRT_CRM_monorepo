import { useEffect } from 'react';
import { Alert, Col, Form, Input, Modal, Row, Select } from 'antd';

import { useReferenceData } from '@/api/hooks/useReferences';
import { useSwReferences } from '@/api/swRegistry/referencesHooks';
import { useSwStructure } from '@/api/swRegistry/structureHooks';
import { EmployeeSelect } from '@/components/approvals/EmployeeSelect';
import type { CreateSwItemPayload, SwItemDetail, UpdateSwItemPayload } from '@/types/swRegistry';

import { flattenStructureOptions } from '../structure/swStructureTree';
import styles from './SwItemModal.module.scss';

type Props = {
  open: boolean;
  confirmLoading?: boolean;
  onCancel: () => void;
} & (
  | {
      mode: 'create';
      /** Элемент, на котором заводят программу: приходит из «+» в дереве. */
      defaultElementId?: string;
      onSubmit: (payload: CreateSwItemPayload) => void;
    }
  | {
      mode: 'edit';
      item: SwItemDetail | null;
      onSubmit: (payload: UpdateSwItemPayload) => void;
    }
);

/**
 * Программа: заведение и правка. Поля у них одни и те же, разница только в том,
 * чем заполняется форма и как называются кнопки, поэтому окно одно на оба случая —
 * раньше это были две копии, которые расходились в мелочах.
 */
export function SwItemModal(props: Props) {
  const { open, confirmLoading, onCancel, mode } = props;
  const [form] = Form.useForm<CreateSwItemPayload>();
  const structureQuery = useSwStructure('active');
  const kindsQuery = useSwReferences('developmentKinds');
  const { data: refData } = useReferenceData(['partners']);

  const item = mode === 'edit' ? props.item : null;
  const defaultElementId = mode === 'create' ? props.defaultElementId : undefined;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (item) {
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
      return;
    }
    if (defaultElementId) form.setFieldsValue({ elementId: defaultElementId });
  }, [open, item, defaultElementId, form]);

  const elementOptions = flattenStructureOptions(structureQuery.data ?? []);
  const kindOptions = (kindsQuery.data ?? [])
    .filter(k => k.isActive !== false)
    .map(k => ({ value: k.code, label: k.name }));
  const partnerOptions = (refData?.partners ?? []).map(p => ({ value: p.id, label: p.name }));
  const refsFailed = kindsQuery.isError;
  const structureFailed = structureQuery.isError;

  const submit = (values: CreateSwItemPayload) => {
    if (props.mode === 'edit') props.onSubmit(values as UpdateSwItemPayload);
    else props.onSubmit(values);
  };

  return (
    <Modal
      title={mode === 'edit' ? 'Изменить программу' : 'Добавить программу'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      destroyOnHidden
      okText={mode === 'edit' ? 'Сохранить' : 'Создать'}
      width={780}
    >
      <Form form={form} layout='vertical' className={styles.formCompact} onFinish={submit}>
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
            <Form.Item
              name='shortName'
              label='Краткое наименование'
              rules={[{ required: true, message: 'Укажите краткое наименование' }]}
            >
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item
              name='developmentKindCode'
              label='Вид разработки'
              rules={[{ required: true, message: 'Выберите вид' }]}
            >
              <Select options={kindOptions} loading={kindsQuery.isLoading} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name='fullName'
          label='Полное наименование'
          rules={[{ required: true, message: 'Укажите полное наименование' }]}
        >
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
            <Form.Item
              name='partnerId'
              label='Разработчик'
              rules={[{ required: true, message: 'Выберите контрагента' }]}
            >
              <Select options={partnerOptions} showSearch optionFilterProp='label' placeholder='Контрагент' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name='responsibleUserId'
              label='Ответственный'
              rules={[{ required: true, message: 'Выберите ответственного' }]}
            >
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
