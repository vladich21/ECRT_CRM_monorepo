import { useState, useEffect } from "react";
import { Card, Avatar, Descriptions, Tag, Button, Form, Input, Select, Space, Row, Col } from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  LogoutOutlined,
  TeamOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import useAuthStore, { useAuthStore as useAuthStoreFull } from "../../store/AuthStore";
import { UseLogout } from "../../customhooks/useLogout";
import { useUpdateUser } from "../../api/users/userApiHooks";
import { useReferenceData } from "../../api/hooks/useReferences";
import { useNotification } from "../../customhooks/useNotification";
import { userUpdateFormMapper } from "../../helpers/mappers/userUpdateFormMapper";
import { getChangedFields } from "../../helpers/getChangedFields";
import { Loader } from "../../components/loader/Loader";

const { Option } = Select;

const ProfilePage = () => {
  const { user } = useAuthStore((state) => state);
  const { logout } = UseLogout();
  const { showNotification, contextHolder } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();

  const { data: referenceBooks, isLoading: isReferencesLoading } = useReferenceData(['departments', 'positions']);
  const { mutate: updateUser, isPending: isUpdating, isSuccess: isUpdateSuccess, isError: isUpdateError } = useUpdateUser();

  useEffect(() => {
    if (user) {
      // Конвертируем данные для формы: ID должны быть строками для Select
      const formData = {
        ...userUpdateFormMapper(user),
        department_id: user.department?.id || null,
        position_id: user.position?.id || null,
      };
      form.setFieldsValue(formData);
    }
  }, [user, form]);

  useEffect(() => {
    if (isUpdateSuccess) {
      showNotification('success', 'Успех', 'Профиль успешно обновлён');
      setIsEditing(false);
      // Обновляем данные пользователя в store
      if (user && referenceBooks) {
        const formValues = form.getFieldsValue();
        const updatedUser = { ...user };
        if (formValues.email !== undefined) updatedUser.email = formValues.email;
        if (formValues.phone !== undefined) updatedUser.phone = formValues.phone;
        if (formValues.department_id && referenceBooks.departments) {
          const dept = referenceBooks.departments.find(d => d.id === String(formValues.department_id));
          if (dept) updatedUser.department = dept;
        }
        if (formValues.position_id && referenceBooks.positions) {
          const pos = referenceBooks.positions.find(p => p.id === String(formValues.position_id));
          if (pos) updatedUser.position = pos;
        }
        const token = useAuthStoreFull.getState().token || '';
        useAuthStoreFull.getState().login(updatedUser, token);
      }
    }
  }, [isUpdateSuccess]);

  useEffect(() => {
    if (isUpdateError) {
      showNotification('error', 'Ошибка', 'Не удалось обновить профиль');
    }
  }, [isUpdateError, showNotification]);

  if (!user) {
    logout();
    return null;
  }

  if (isReferencesLoading) {
    return <Loader />;
  }

  const handleSave = async (values: any) => {
    if (!user) return;
    // Конвертируем строковые ID в числа для отправки на бекенд
    const formValues = {
      ...values,
      department_id: values.department_id ? Number(values.department_id) : null,
      position_id: values.position_id ? Number(values.position_id) : null,
    };
    const payload = getChangedFields(formValues, userUpdateFormMapper(user));
    if (Object.keys(payload).length === 0) {
      showNotification('info', 'Информация', 'Нет изменений для сохранения');
      setIsEditing(false);
      return;
    }
    updateUser({ id: user.id, data: payload });
  };

  const handleCancel = () => {
    form.setFieldsValue(userUpdateFormMapper(user));
    setIsEditing(false);
  };

  return (
    <div style={{ padding: "24px" }}>
      {contextHolder}
      <Card
        title="Профиль пользователя"
        extra={
          <Space>
            {!isEditing ? (
              <>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setIsEditing(true)}
                >
                  Редактировать
                </Button>
                <Button
                  type="primary"
                  danger
                  icon={<LogoutOutlined />}
                  onClick={logout}
                >
                  Выйти
                </Button>
              </>
            ) : (
              <>
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  Отмена
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => form.submit()}
                  loading={isUpdating}
                >
                  Сохранить
                </Button>
              </>
            )}
          </Space>
        }
      >
        <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
          <Avatar
            size={128}
            src="https://example.com/avatar.jpg"
            icon={<UserOutlined />}
            style={{ backgroundColor: "#fde3cf", color: "#f56a00" }}
          />

          <div>
            <h2 style={{ marginBottom: "8px" }}>
              {user?.last_name} {user?.first_name} {user?.middle_name}
            </h2>

            {user?.roles?.map((role) => (
              <Tag
                key={role.id}
                color={role.role_name === "admin" ? "red" : "blue"}
              >
                {role.role_name}
              </Tag>
            ))}

            <Tag color={user?.is_active ? "green" : "red"}>
              {user?.is_active ? "Активен" : "Неактивен"}
            </Tag>
          </div>
        </div>

        {!isEditing ? (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Должность" span={2}>
              {user?.position?.name || "Нет данных"}
            </Descriptions.Item>
            <Descriptions.Item label="Отдел" span={2}>
              {user?.department?.name || "Нет данных"}
            </Descriptions.Item>
            <Descriptions.Item label="Email" span={2}>
              {user?.email ? <a href={`mailto:${user.email}`}><MailOutlined /> {user.email}</a> : "Нет данных"}
            </Descriptions.Item>
            <Descriptions.Item label="Телефон" span={2}>
              {user?.phone ? <a href={`tel:${user.phone.replace(/\D/g, "")}`}><PhoneOutlined /> {user.phone}</a> : "Нет данных"}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Должность" name="position_id">
                  <Select
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      String(option?.children ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    placeholder="Выберите должность"
                    allowClear
                    suffixIcon={<IdcardOutlined />}
                  >
                    {referenceBooks?.positions?.map(position => (
                      <Option key={position.id} value={position.id}>
                        {position.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Отдел" name="department_id">
                  <Select
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      String(option?.children ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    placeholder="Выберите отдел"
                    allowClear
                    suffixIcon={<TeamOutlined />}
                  >
                    {referenceBooks?.departments?.map(dept => (
                      <Option key={dept.id} value={dept.id}>
                        {dept.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[{ type: 'email', message: 'Введите корректный email' }]}
                >
                  <Input prefix={<MailOutlined />} placeholder="email@example.com" type="email" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Телефон"
                  name="phone"
                  rules={[
                    {
                      pattern: /^(\+7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
                      message: 'Введите корректный номер телефона (например: +7 (999) 999-99-99)',
                    },
                    { max: 25, message: 'Телефон не должен превышать 25 символов' },
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="+7 (999) 123-45-67" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default ProfilePage;
