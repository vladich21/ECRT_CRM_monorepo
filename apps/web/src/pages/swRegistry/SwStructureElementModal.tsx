import { useEffect } from 'react';
import { Alert, Col, Form, Input, Modal, Row, Select } from 'antd';

import { EmployeeSelect } from '@/components/approvals/EmployeeSelect';
import type { SwRefItem, SwStructureNode } from '@/types/swRegistry';
import { collectSubtreeIds, flattenStructureOptions } from './swStructureTree';
import styles from './SwRegistryModals.module.scss';

type Mode = 'create' | 'edit' | 'child' | 'responsible';

interface Props {
  open: boolean;
  mode: Mode;
  node?: SwStructureNode | null;
  tree: SwStructureNode[];
  elementTypes: SwRefItem[];
  roles: SwRefItem[];
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, string>) => void;
}

export function SwStructureElementModal({
  open,
  mode,
  node,
  tree,
  elementTypes,
  roles,
  confirmLoading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && node) {
      form.setFieldsValue({
        parentId: node.parentId ?? undefined,
        elementTypeCode: node.elementTypeCode,
        code: node.code,
        name: node.name,
        description: node.description ?? undefined,
      });
      return;
    }
    form.resetFields();
    if (mode === 'child' && node) {
      form.setFieldsValue({ parentId: node.id });
    }
  }, [open, mode, node, form]);

  const excludeIds = mode === 'edit' && node ? collectSubtreeIds(node) : undefined;
  const parentOptions = flattenStructureOptions(tree, excludeIds);
  const typeOptions = elementTypes.filter(t => t.isActive !== false).map(t => ({ value: t.code, label: t.name }));
  const roleOptions = roles.filter(t => t.isActive !== false).map(t => ({ value: t.code, label: t.name }));
  const refsEmpty = typeOptions.length === 0 && mode !== 'responsible';
  const treeEmpty = parentOptions.length === 0 && mode !== 'responsible';

  const title =
    mode === 'edit' ? 'Изменить элемент' : mode === 'responsible' ? 'Закрепить ответственного' : 'Создать элемент';

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      destroyOnHidden
      okText='Сохранить'
      width={mode === 'responsible' ? 560 : 680}
    >
      <Form form={form} layout='vertical' className={styles.formCompact} onFinish={onSubmit}>
        {refsEmpty ? (
          <Alert
            type='warning'
            showIcon
            className={styles.alert}
            message='Справочник типов пуст'
            description='Выполните sw-registry.sql (блок INSERT) в БД.'
          />
        ) : null}
        {mode === 'responsible' ? (
          <Row gutter={12}>
            <Col xs={24} md={14}>
              <Form.Item name='userId' label='Сотрудник' rules={[{ required: true, message: 'Выберите сотрудника' }]}>
                <EmployeeSelect />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item name='roleCode' label='Роль' rules={[{ required: true, message: 'Выберите роль' }]}>
                <Select options={roleOptions} placeholder='Роль ответственности' />
              </Form.Item>
            </Col>
          </Row>
        ) : (
          <>
            {treeEmpty ? (
              <Alert
                type='info'
                showIcon
                className={styles.alert}
                message='Дерево структуры пока пустое'
                description='Первый элемент можно создать без вышестоящего.'
              />
            ) : null}
            <Form.Item name='parentId' label='Вышестоящий элемент'>
              <Select allowClear options={parentOptions} placeholder='Корень' showSearch optionFilterProp='label' />
            </Form.Item>

            <Row gutter={12}>
              <Col xs={24} md={10}>
                <Form.Item name='elementTypeCode' label='Тип' rules={[{ required: true, message: 'Укажите тип' }]}>
                  <Select options={typeOptions} />
                </Form.Item>
              </Col>
              <Col xs={24} md={14}>
                <Form.Item name='code' label='Код' rules={[{ required: true, message: 'Укажите код' }]}>
                  <Input maxLength={50} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name='name' label='Наименование' rules={[{ required: true, message: 'Укажите наименование' }]}>
              <Input maxLength={255} />
            </Form.Item>

            <Form.Item name='description' label='Описание'>
              <Input.TextArea rows={2} maxLength={2000} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
