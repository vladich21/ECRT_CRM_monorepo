import { Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import type { FormInstance } from 'antd/es/form';

import type { ReferenceData } from '@/api/hooks/useReferences';
import { STAGE_BUDGET_INPUT_NUMBER_PROPS } from '../constants/budgetInputNumberProps';
import styles from '../ContractMainInfoTab.module.scss';

type ContractStageFormModalProps = {
  open: boolean;
  isEditing: boolean;
  form: FormInstance;
  users: ReferenceData['users'] | undefined;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
  isLoading?: boolean;
};
export function ContractStageFormModal({
  open,
  isEditing,
  form,
  users,
  onCancel,
  onSubmit,
  isLoading = false,
}: ContractStageFormModalProps) {
  const userOptions = (users ?? []).map(user => ({
    value: user.id,
    label: user.name,
  }));
  return (
    <Modal
      title={isEditing ? 'Редактировать этап' : 'Добавить этап'}
      open={open}
      onCancel={onCancel}
      forceRender
      onOk={onSubmit}
      okText={isEditing ? 'Сохранить' : 'Добавить'}
      confirmLoading={isLoading}
      cancelText='Отмена'
      width={840}
      wrapClassName={styles.stageFormModal}
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='name' label='Название этапа' rules={[{ required: true, message: 'Введите название этапа' }]}>
          <Input placeholder='Например: Подписание договора' />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name='planned_start_date' label='План: дата начала'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='planned_end_date' label='План: дата окончания'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name='actual_start_date' label='Факт: дата начала'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='actual_end_date' label='Факт: дата окончания'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' allowClear />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item name='planned_budget' label='Плановый бюджет, ₽'>
              <InputNumber<number> style={{ width: '100%' }} {...STAGE_BUDGET_INPUT_NUMBER_PROPS} placeholder='0' />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='forecasted_budget' label='Прогнозный бюджет, ₽'>
              <InputNumber<number> style={{ width: '100%' }} {...STAGE_BUDGET_INPUT_NUMBER_PROPS} placeholder='0' />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='actual_budget' label='Фактический бюджет, ₽'>
              <InputNumber<number> style={{ width: '100%' }} {...STAGE_BUDGET_INPUT_NUMBER_PROPS} placeholder='0' />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name='responsible_id' label='Ответственный'>
          <Select allowClear showSearch optionFilterProp='label' placeholder='Не выбран' options={userOptions} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
