import { useEffect, useState } from 'react';
import {
  ApartmentOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Col, Divider, Form, Input, Row, Select, Switch } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useDepartmentById, useUpdateDepartment } from '../../../api/departments/departmentsApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { BackButton } from '../../../components/backButton/BackButton';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { departmentUpdateFormMapper } from '../../../helpers/mappers/departmentUpdateFormMapper';
import styles from './DepartmentFormPage.module.scss';

const { Option } = Select;

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

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['departments', 'users']);

  const {
    mutate,
    isPending: isUpdateLoading,
    isError: isUpdateError,
    isSuccess: isUpdateSuccess,
  } = useUpdateDepartment();

  useEffect(() => {
    if (department) form.setFieldsValue(departmentUpdateFormMapper(department));
  }, [department, form]);

  useEffect(() => {
    if (isUpdateSuccess) {
      showNotification('success', 'Успех', 'Отдел успешно изменён');
      setTimeout(() => navigate(-1), 1000);
    } else if (isUpdateError) {
      showNotification('error', 'Ошибка', 'Не удалось изменить отдел');
    }
  }, [isUpdateError, isUpdateSuccess]);

  if (isReferencesLoading || isDepartmentLoading) {
    return <Loader />;
  }

  if (isReferencesError || isDepartmentError || !department || !referenceBooks) {
    return <NotFound errorMessage='Отдел' />;
  }

  const handleBack = () => {
    navigate(-1);
  };

  const handleSave = async (values: any) => {
    const payload = getChangedFields(values, departmentUpdateFormMapper(department));
    mutate({ id: departmentId!, data: payload });
  };

  const availableParentDepartments = referenceBooks.departments?.filter(dept => dept.id !== department.id) || [];

  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader title={`Редактирование отдела: ${department.name}`} subtitle='Измените данные отдела' />

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
              <Form.Item label='Короткое название' name='short_name' rules={[{ message: 'Введите короткое название' }]}>
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
                    String(option?.label ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  suffixIcon={<UserOutlined />}
                >
                  {referenceBooks.users?.map(user => (
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
                  {availableParentDepartments.map(dept => (
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
              <Form.Item label='Статус отдела' name='is_active' valuePropName='checked'>
                <Switch checkedChildren='Активен' unCheckedChildren='Не активен' />
              </Form.Item>
            </Col>
          </Row>

          {/* Кнопки действий */}
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
