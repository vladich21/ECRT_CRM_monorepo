import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Button } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { useUpdateUser, useUserById } from '../../../api/users/userApiHooks';
import { useNotification } from '../../../customhooks/useNotification';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { userUpdateFormMapper } from '../../../helpers/mappers/userUpdateFormMapper';
import { UserFormFields } from './UserFormFields';
import { Loader } from '../../../components/loader/Loader';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { NotFound } from '../../../components/notFound/NotFound';
import styles from './UserFormPage.module.scss';

export default function UserEditPage() {
  const params = useParams();
  const userId = params?.userId as string | undefined;
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);

  const { data: user, isLoading: isUserLoading, isError: isUserError } = useUserById(userId!);
  const { data: referenceBooks, isLoading, isError } = useReferenceData(['departments', 'positions', 'roles']);
  const { mutate, isPending: isUpdateLoading, isError: isUpdateError, isSuccess: isUpdateSuccess } = useUpdateUser();

  useEffect(() => {
    if (user) form.setFieldsValue(userUpdateFormMapper(user));
  }, [user, form]);

  useEffect(() => {
    if (isUpdateSuccess) {
      showNotification('success', 'Успех', 'Пользователь успешно изменён');
      setTimeout(() => navigate('/users'), 1000);
    } else if (isUpdateError) {
      showNotification('error', 'Ошибка', 'Не удалось изменить пользователя');
    }
  }, [isUpdateError, isUpdateSuccess, navigate, showNotification]);

  if (isLoading || isUserLoading) {
    return <Loader />;
  }

  if (isError || isUserError || !user || !referenceBooks) {
    return <NotFound errorMessage="Не найден пользователь или справочник" />;
  }

  const handleSave = async (values: Record<string, unknown>) => {
    const payload = getChangedFields(values, userUpdateFormMapper(user)) as Record<string, unknown>;
    const toUuidOrNull = (v: unknown) => (v != null && v !== '' ? String(v) : null);
    if ('department_id' in payload) payload.department_id = toUuidOrNull(payload.department_id);
    if ('position_id' in payload) payload.position_id = toUuidOrNull(payload.position_id);
    if ('role_ids' in payload && Array.isArray(payload.role_ids))
      payload.role_ids = payload.role_ids.map(String).filter((id) => id && id !== '');
    mutate({ id: userId!, data: payload });
  };

  return (
    <DetailPageHeader
      title={`Редактирование: ${user.last_name} ${user.first_name}`}
      titleSuffix={<span style={{ fontSize: 14, opacity: 0.85 }}>Внесите изменения в данные пользователя</span>}
      backLabel="Пользователи"
      onBack={() => navigate(-1)}
      actions={
        <>
          <Button onClick={() => navigate(-1)} disabled={isUpdateLoading}>
            Отмена
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={isUpdateLoading}
            disabled={!isFormChanged}
            onClick={() => form.submit()}
          >
            Сохранить изменения
          </Button>
        </>
      }
      tabs={[{ key: 'main', label: 'Редактирование' }]}
      activeTab="main"
      onTabChange={() => {}}
      contextHolder={contextHolder}
      stickyHeader
    >
      <div className={styles.formCard}>
        <Form
          form={form}
          layout="vertical"
          size="middle"
          onFieldsChange={() => setIsFormChanged(true)}
          onFinish={handleSave}
          disabled={isUpdateLoading}
          onKeyPress={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          scrollToFirstError
        >
          <UserFormFields form={form} referenceBooks={referenceBooks} />
        </Form>
      </div>
    </DetailPageHeader>
  );
}
