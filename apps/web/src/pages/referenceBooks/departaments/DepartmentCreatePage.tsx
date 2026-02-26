import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Select, Switch, Space, Row, Col, Divider } from 'antd';
import {
  SaveOutlined,
  TeamOutlined,
  UserOutlined,
  ApartmentOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { useNotification } from '../../../customhooks/useNotification';
import { BackButton } from '../../../components/backButton/BackButton';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import { useCreateDepartment } from '../../../api/departments/departmentsApiHooks';
import { initialFormValues } from './data';

const { Option } = Select;

export default function DepartmentCreatePage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const notificationShownRef = useRef(false);

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['departments', 'users']);

  const {
    mutate,
    isPending: isCreateLoading,
    isError: isCreateError,
    isSuccess: isCreateSuccess,
  } = useCreateDepartment();

  useEffect(() => {
    if (isCreateSuccess && !notificationShownRef.current) {
      notificationShownRef.current = true;
      showNotification('success', 'Успех', 'Отдел успешно создан');
      setTimeout(() => navigate('/departments'), 1000);
    } else if (isCreateError && !notificationShownRef.current) {
      notificationShownRef.current = true;
      showNotification('error', 'Ошибка', 'Не удалось создать отдел');
    }
  }, [isCreateError, isCreateSuccess, navigate, showNotification]);

  const handleCreate = async (values: any) => {
    notificationShownRef.current = false;
    const payload = {
      ...values,
      manager_id: values.manager_id || null,
      parent_id: values.parent_id || null,
    };

    mutate(payload);
  };

  if (isReferencesLoading) {
    return <Loader />;
  }

  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }

  return (
    <div>
      {contextHolder}
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <BackButton />

        <Card
          title={
            <span>
              <PlusOutlined style={{ marginRight: 8 }} />
              Создание нового отдела
            </span>
          }
        >
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
            {/* Основная информация */}
            <Divider orientation='left'>
              <TeamOutlined /> Основная информация
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Название отдела'
                  name='name'
                  rules={[{ required: true, message: 'Введите название отдела' }]}
                >
                  <Input placeholder='Введите название отдела' prefix={<TeamOutlined />} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label='Короткое название'
                  name='short_name'
                  rules={[{ message: 'Введите короткое название' }]}
                >
                  <Input placeholder='Введите короткое название' prefix={<IdcardOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            {/* Организационная структура */}
            <Divider orientation='left'>
              <ApartmentOutlined /> Организационная структура
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Руководитель' name='manager_id'>
                  <Select
                    placeholder='Выберите руководителя'
                    allowClear
                    showSearch
                    optionFilterProp='label'
                    optionLabelProp='label'
                    filterOption={(input, option) =>
                      String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    suffixIcon={<UserOutlined />}
                  >
                    {referenceBooks?.users?.map(user => (
                      <Option key={user.id} value={user.id} label={user.name}>
                        {user.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='Родительский отдел' name='parent_id'>
                  <Select placeholder='Выберите родительский отдел' allowClear suffixIcon={<ApartmentOutlined />}>
                    {referenceBooks?.departments?.map(dept => (
                      <Option key={dept.id} value={dept.id}>
                        {dept.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Статус */}
            <Divider orientation='left'>
              <SafetyCertificateOutlined /> Статус
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Статус отдела' name='is_active' valuePropName='checked' initialValue={true}>
                  <Switch checkedChildren='Активен' unCheckedChildren='Не активен' defaultChecked />
                </Form.Item>
              </Col>
            </Row>

            {/* Кнопки действий */}
            <Form.Item>
              <Space>
                <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading} size='large'>
                  Создать отдел
                </Button>

                <Button onClick={() => form.resetFields()} size='large' disabled={isCreateLoading}>
                  Очистить форму
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  );
}
