import { useState, useEffect } from "react";
import { App, Avatar, Button, Form, Input, Select } from "antd";
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
  CameraOutlined,
} from "@ant-design/icons";
import useAuthStore, { useAuthStore as useAuthStoreFull } from "../../store/AuthStore";
import { UseLogout } from "../../customhooks/useLogout";
import { useUpdateUser } from "../../api/users/userApiHooks";
import { useReferenceData } from "../../api/hooks/useReferences";
import { useNotification } from "../../customhooks/useNotification";
import { userUpdateFormMapper } from "../../helpers/mappers/userUpdateFormMapper";
import { getChangedFields } from "../../helpers/getChangedFields";
import { Loader } from "../../components/loader/Loader";
import styles from "./Profile.module.scss";

const { Option } = Select;

const ProfilePage = () => {
  const { modal } = App.useApp();
  const { user } = useAuthStore((state) => state);
  const { logout } = UseLogout();
  const { showNotification, contextHolder } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();

  const { data: referenceBooks, isLoading: isReferencesLoading } = useReferenceData(['departments', 'positions']);
  const { mutate: updateUser, isPending: isUpdating, isSuccess: isUpdateSuccess, isError: isUpdateError } = useUpdateUser();

  useEffect(() => {
    if (user) {
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
        useAuthStoreFull.getState().login(updatedUser);
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

  if (isReferencesLoading) return <Loader />;

  const handleSave = async (values: any) => {
    if (!user) return;
    const payload = getChangedFields(values, userUpdateFormMapper(user));
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

  const fullName = `${user?.last_name || ''} ${user?.first_name || ''} ${user?.middle_name || ''}`.trim();

  return (
    <div className={styles.pageRoot}>
      {contextHolder}

      {/* Dark gradient header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.avatarWrap}>
            <Avatar
              size={96}
              icon={<UserOutlined />}
              className={styles.avatar}
              style={{ backgroundColor: "#fde3cf", color: "#f56a00" }}
            />
            <button
              type="button"
              className={styles.photoUploadBtn}
              onClick={() => showNotification('info', 'Фото', 'Загрузка фото (в разработке)')}
              aria-label="Изменить фото"
            >
              <CameraOutlined />
            </button>
          </div>
          <div className={styles.headerInfo}>
            <h1 className={styles.userName}>{fullName}</h1>
            <div>
              {user?.roles?.map((role) => (
                <span
                  key={role.id}
                  className={role.role_name === "admin" ? styles.roleTagAdmin : styles.roleTagDefault}
                >
                  {role.role_name}
                </span>
              ))}
              <span
                className={styles.statusBadge}
                style={{
                  background: user?.is_active ? 'rgba(82, 196, 26, 0.2)' : 'rgba(255, 77, 79, 0.2)',
                  border: `1px solid ${user?.is_active ? 'rgba(82, 196, 26, 0.5)' : 'rgba(255, 77, 79, 0.5)'}`,
                  color: user?.is_active ? '#52c41a' : '#ff4d4f',
                }}
              >
                {user?.is_active ? 'Активен' : 'Неактивен'}
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            {!isEditing ? (
              <>
                <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
                  Редактировать
                </Button>
                <Button
                  type="primary"
                  danger
                  icon={<LogoutOutlined />}
                  onClick={() =>
                    modal.confirm({
                      title: 'Выход из системы',
                      content: 'Вы точно хотите выйти?',
                      okText: 'Выйти',
                      cancelText: 'Отмена',
                      okButtonProps: { danger: true },
                      onOk: logout,
                    })
                  }
                >
                  Выйти
                </Button>
              </>
            ) : (
              <>
                <Button icon={<CloseOutlined />} onClick={handleCancel} disabled={isUpdating}>
                  Отмена
                </Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()} loading={isUpdating}>
                  Сохранить
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.contentWrap}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {!isEditing ? (
            <div className={styles.layout}>
              <div className={styles.leftColumn}>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>Организация</h3>
                  <div className={styles.infoRows}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Должность</span>
                      <span className={user?.position?.name ? styles.infoValue : styles.infoValueMuted}>
                        {user?.position?.name || 'Не указано'}
                      </span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Отдел</span>
                      <span className={user?.department?.name ? styles.infoValue : styles.infoValueMuted}>
                        {user?.department?.name || 'Не указано'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>Контактная информация</h3>
                  <div className={styles.infoRows}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Email</span>
                      {user?.email ? (
                        <a href={`mailto:${user.email}`} className={styles.infoLink}>
                          <MailOutlined /> {user.email}
                        </a>
                      ) : (
                        <span className={styles.infoValueMuted}>Не указано</span>
                      )}
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Телефон</span>
                      {user?.phone ? (
                        <a href={`tel:${user.phone.replace(/\D/g, "")}`} className={styles.infoLink}>
                          <PhoneOutlined /> {user.phone}
                        </a>
                      ) : (
                        <span className={styles.infoValueMuted}>Не указано</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.sidebar} />
            </div>
          ) : (
            <div className={`${styles.card} ${styles.editCard}`}>
              <h3 className={styles.cardTitle}>Редактирование профиля</h3>
              <div className={styles.editGrid}>
                <Form.Item label="Должность" name="position_id">
                  <Select
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    placeholder="Выберите должность"
                    allowClear
                    suffixIcon={<IdcardOutlined />}
                  >
                    {referenceBooks?.positions?.map(position => (
                      <Option key={position.id} value={position.id}>{position.name}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item label="Отдел" name="department_id">
                  <Select
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    placeholder="Выберите отдел"
                    allowClear
                    suffixIcon={<TeamOutlined />}
                  >
                    {referenceBooks?.departments?.map(dept => (
                      <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Введите корректный email' }]}>
                  <Input prefix={<MailOutlined />} placeholder="email@example.com" type="email" />
                </Form.Item>

                <Form.Item
                  label="Телефон"
                  name="phone"
                  rules={[
                    { pattern: /^(\+7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/, message: 'Введите корректный номер' },
                    { max: 25, message: 'Максимум 25 символов' },
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="+7 (999) 123-45-67" />
                </Form.Item>
              </div>
            </div>
          )}
        </Form>
      </div>
    </div>
  );
};

export default ProfilePage;
