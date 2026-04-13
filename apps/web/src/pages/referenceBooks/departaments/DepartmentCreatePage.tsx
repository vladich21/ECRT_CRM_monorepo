import { useRef } from 'react';
import { SaveOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useCreateDepartment } from '../../../api/departments/departmentsApiHooks';
import { BackButton } from '../../../components/backButton/BackButton';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { initialFormValues } from './data';
import styles from './DepartmentFormPage.module.scss';

export default function DepartmentCreatePage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const { mutate, isPending: isCreateLoading } = useCreateDepartment();
  const isSubmittingRef = useRef(false);

  const handleCreate = async (values: { name: string }) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    mutate(values, {
      onSuccess: () => {
        showNotification('success', 'Успех', 'Отдел успешно создан');
        setTimeout(() => navigate('/departments'), 1000);
      },
      onError: () => {
        showNotification('error', 'Ошибка', 'Не удалось создать отдел');
      },
      onSettled: () => {
        isSubmittingRef.current = false;
      },
    });
  };

  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader title='Создание нового отдела' subtitle='Название отдела; остальное подтягивается из HR при синхронизации' />

      <div className={styles.formCard}>
        <Form
          form={form}
          layout='vertical'
          initialValues={initialFormValues}
          onFinish={handleCreate}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          scrollToFirstError
        >
          <Form.Item
            label='Название отдела'
            name='name'
            rules={[{ required: true, message: 'Введите название отдела' }]}
          >
            <Input placeholder='Введите название отдела' prefix={<TeamOutlined />} />
          </Form.Item>

          <div className={styles.formActions}>
            <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
              Очистить форму
            </Button>
            <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading}>
              Создать отдел
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
