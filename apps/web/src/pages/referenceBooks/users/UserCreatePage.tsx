import { SaveOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { useCreateUser } from '../../../api/users/userApiHooks';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { initialFormValues } from './data';
import { UserFormFields } from './UserFormFields';
import styles from './UserFormPage.module.scss';

export default function UserCreatePage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['departments', 'positions', 'roles']);
  const { mutate, isPending: isCreateLoading } = useCreateUser();
  const handleCreate = async (values: Record<string, unknown>) => {
    const toUuidOrNull = (v: unknown) => (v != null && v !== '' ? String(v) : null);
    const roleIds = (values.role_ids ?? values.roles ?? []) as (string | number)[];
    const payload = {
      ...values,
      department_id: toUuidOrNull(values.department_id),
      position_id: toUuidOrNull(values.position_id),
      role_ids: Array.isArray(roleIds) ? roleIds.map(String).filter(id => id && id !== '') : [],
      roles: undefined,
    };
    delete (payload as Record<string, unknown>).roles;
    mutate(payload as any, {
      onSuccess: () => {
        showNotification('success', 'Успех', 'Пользователь успешно создан');
        setTimeout(() => navigate('/users'), 1000);
      },
      onError: () => {
        showNotification('error', 'Ошибка', 'Не удалось создать пользователя');
      },
    });
  };
  if (isReferencesLoading) {
    return <Loader />;
  }
  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }
  return (
    <DetailPageHeader
      title='Создание нового пользователя'
      titleSuffix={<span style={{ fontSize: 14, opacity: 0.85 }}>Заполните данные для создания пользователя</span>}
      backLabel='Пользователи'
      onBack={() => navigate(-1)}
      actions={
        <>
          <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
            Очистить форму
          </Button>
          <Button type='primary' icon={<SaveOutlined />} loading={isCreateLoading} onClick={() => form.submit()}>
            Создать пользователя
          </Button>
        </>
      }
      tabs={[{ key: 'main', label: 'Создание' }]}
      activeTab='main'
      onTabChange={() => {}}
      contextHolder={contextHolder}
      stickyHeader
    >
      <div className={styles.formCard}>
        <Form
          form={form}
          layout='vertical'
          size='middle'
          initialValues={initialFormValues}
          onFinish={handleCreate}
          disabled={isCreateLoading}
          onKeyPress={e => {
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
