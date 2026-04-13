import { useEffect, useState } from 'react';
import { SaveOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useDepartmentById, useUpdateDepartment } from '../../../api/departments/departmentsApiHooks';
import { BackButton } from '../../../components/backButton/BackButton';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { departmentUpdateFormMapper } from '../../../helpers/mappers/departmentUpdateFormMapper';
import styles from './DepartmentFormPage.module.scss';

export default function DepartmentEditPage() {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const {
    data: department,
    isLoading: isDepartmentLoading,
    isError: isDepartmentError,
  } = useDepartmentById(departmentId!);

  const { mutate, isPending: isUpdateLoading } = useUpdateDepartment();

  useEffect(() => {
    if (department) form.setFieldsValue(departmentUpdateFormMapper(department));
  }, [department, form]);

  if (isDepartmentLoading) {
    return <Loader />;
  }

  if (isDepartmentError || !department) {
    return <NotFound errorMessage='Отдел' />;
  }

  const handleBack = () => {
    navigate(-1);
  };

  const handleSave = async (values: { name: string }) => {
    const payload = getChangedFields(values, departmentUpdateFormMapper(department));
    mutate(
      { id: departmentId!, data: payload },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Отдел успешно изменён');
          setTimeout(() => navigate(-1), 1000);
        },
        onError: () => {
          showNotification('error', 'Ошибка', 'Не удалось изменить отдел');
        },
      },
    );
  };

  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader title={`Редактирование отдела: ${department.name}`} subtitle='Измените название' />

      <div className={styles.formCard}>
        <Form
          form={form}
          layout='vertical'
          onFieldsChange={() => setIsFormChanged(true)}
          onFinish={handleSave}
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
            <Button onClick={handleBack}>Отмена</Button>
            <Button
              type='primary'
              htmlType='submit'
              icon={<SaveOutlined />}
              disabled={!isFormChanged}
              loading={isUpdateLoading}
            >
              Сохранить изменения
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
