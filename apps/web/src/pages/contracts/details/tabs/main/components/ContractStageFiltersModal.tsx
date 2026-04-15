import { Button, Form, Modal, Select } from 'antd';
import type { FormInstance } from 'antd/es/form';

import type { ReferenceData } from '@/api/hooks/useReferences';

type ContractStageFiltersModalProps = {
  open: boolean;
  form: FormInstance;
  users: ReferenceData['users'] | undefined;
  onClose: () => void;
  onApply: () => void | Promise<void>;
  onReset: () => void;
};
export function ContractStageFiltersModal({
  open,
  form,
  users,
  onClose,
  onApply,
  onReset,
}: ContractStageFiltersModalProps) {
  const userOptions = (users ?? []).map(user => ({
    value: user.id,
    label: user.name,
  }));
  return (
    <Modal
      title='Фильтры этапов'
      open={open}
      onCancel={onClose}
      forceRender
      footer={[
        <Button key='reset' onClick={onReset}>
          Сбросить
        </Button>,
        <Button key='cancel' onClick={onClose}>
          Отмена
        </Button>,
        <Button key='ok' type='primary' onClick={onApply}>
          Применить
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout='vertical'
        initialValues={{
          status: 'all',
          responsible: 'all',
          deadline: 'all',
          budget: 'all',
        }}
      >
        <Form.Item name='status' label='Статус этапа'>
          <Select
            options={[
              { value: 'all', label: 'Все статусы' },
              { value: 'planned', label: 'Запланирован' },
              { value: 'in_progress', label: 'В работе' },
              { value: 'completed', label: 'Завершен' },
              { value: 'overdue', label: 'Просрочен' },
            ]}
          />
        </Form.Item>

        <Form.Item name='responsible' label='Ответственный'>
          <Select
            showSearch
            optionFilterProp='label'
            options={[{ value: 'all', label: 'Все ответственные' }, ...userOptions]}
          />
        </Form.Item>

        <Form.Item name='deadline' label='Сроки'>
          <Select
            options={[
              { value: 'all', label: 'Все сроки' },
              { value: 'urgent', label: 'Срочно (≤ 7 дней)' },
              { value: 'overdue', label: 'Просрочено' },
            ]}
          />
        </Form.Item>

        <Form.Item name='budget' label='Бюджет'>
          <Select
            options={[
              { value: 'all', label: 'Любой бюджет' },
              { value: 'hasDeviation', label: 'Есть отклонение' },
              { value: 'overBudget', label: 'Перерасход' },
              { value: 'underBudget', label: 'Экономия' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
