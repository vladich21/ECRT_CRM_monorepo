import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Button, Row, Col, Divider, ColorPicker, Tag, Modal } from 'antd';
import { HighlightOutlined, SaveOutlined, TagOutlined } from '@ant-design/icons';
import { useNotification } from '../../../customhooks/useNotification';
import { Loader } from '../../../components/loader/Loader';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { NotFound } from '../../../components/notFound/NotFound';
import { usePartnerCompetenceById, useUpdatePartnerCompetence } from '../../../api/partners/partnerCompetenceApiHooks';
import { partnerCompetenceUpdateFormMapper } from '../../../helpers/mappers/competenceUpdateFormMapper';
import { getHexColor } from '../../../helpers/getHexColor';
import { useWatch } from 'antd/es/form/Form';
import styles from './CompetencyFormPage.module.scss';

export default function PartnerCompetenceEditPage() {
  const { competenceId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const {
    data: competence,
    isLoading: isCompetenceLoading,
    isError: isCompetenceError,
  } = usePartnerCompetenceById(competenceId!);

  const {
    mutate,
    isPending: isUpdateLoading,
    isError: isUpdateError,
    isSuccess: isUpdateSuccess,
  } = useUpdatePartnerCompetence();

  const colorBg = useWatch('color_bg', form);
  const colorText = useWatch('color_text', form);
  const colorBorder = useWatch('color_border', form);

  useEffect(() => {
    if (competence) {
      form.setFieldsValue(partnerCompetenceUpdateFormMapper(competence));
    }
  }, [competence, form]);

  useEffect(() => {
    if (isUpdateSuccess) {
      showNotification('success', 'Успех', 'Компетенция партнера успешно изменена');
      setTimeout(() => navigate(-1), 1000);
    } else if (isUpdateError) {
      showNotification('error', 'Ошибка', 'Не удалось изменить компетенцию партнера');
    }
  }, [isUpdateError, isUpdateSuccess]);

  if (isCompetenceLoading) {
    return <Loader />;
  }

  if (isCompetenceError || !competence) {
    return <NotFound errorMessage='Компетенция партнера не найдена' />;
  }

  const handleBack = () => {
    navigate(-1);
  };

  const handleSave = async (values: any) => {
    const payload = getChangedFields(values, partnerCompetenceUpdateFormMapper(competence));

    if (payload.color_bg && typeof payload.color_bg === 'object') {
      payload.color_bg = payload.color_bg.toHexString();
    }
    if (payload.color_text && typeof payload.color_text === 'object') {
      payload.color_text = payload.color_text.toHexString();
    }
    if (payload.color_border && typeof payload.color_border === 'object') {
      payload.color_border = payload.color_border.toHexString();
    }

    const { is_active, description, ...data } = payload;

    mutate({ id: competenceId!, data });
  };

  const renderTagPreview = () => {
    const bgColor = getHexColor(colorBg || competence?.color_bg);
    const textColor = getHexColor(colorText || competence?.color_text);
    const borderColor = getHexColor(colorBorder || competence?.color_border);

    return (
      <Tag
        className={styles.tagPreview}
        style={{
          backgroundColor: bgColor,
          color: textColor,
          border: `1px solid ${borderColor}`,
        }}
      >
        {'Пример текста'}
      </Tag>
    );
  };

  return (
    <>
      {contextHolder}
      <Modal
        open
        title={`Редактирование компетенции`}
        centered
        width={720}
        onCancel={handleBack}
        footer={null}
        destroyOnClose
      >
        <Form
            form={form}
            onFieldsChange={() => setIsFormChanged(true)}
            layout="vertical"
            onFinish={handleSave}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            scrollToFirstError
          >
            <Divider orientation="left">
              <TagOutlined /> Основная информация
            </Divider>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  label="Название компетенции"
                  name="name"
                  rules={[{ required: true, message: 'Введите название компетенции' }]}
                >
                  <Input placeholder="Введите название компетенции" prefix={<TagOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">
              <HighlightOutlined /> Цветовая схема
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="Цвет фона" name="color_bg">
                  <ColorPicker
                    format="hex"
                    showText
                    presets={[
                      {
                        label: 'Рекомендуемые цвета',
                        colors: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#fa541c', '#13c2c2', '#eb2f96'],
                      },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Цвет текста" name="color_text">
                  <ColorPicker
                    format="hex"
                    showText
                    presets={[
                      {
                        label: 'Рекомендуемые цвета',
                        colors: ['#ffffff', '#000000', '#fafafa', '#262626', '#1890ff', '#52c41a'],
                      },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Цвет границы" name="color_border">
                  <ColorPicker
                    format="hex"
                    showText
                    presets={[
                      {
                        label: 'Рекомендуемые цвета',
                        colors: ['#1890ff', '#d9d9d9', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
                      },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">
              <HighlightOutlined /> Предпросмотр
            </Divider>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item label="Пример отображения">{renderTagPreview()}</Form.Item>
              </Col>
            </Row>

            <div className={styles.formActions}>
              <Button onClick={handleBack}>Отмена</Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                disabled={!isFormChanged}
                loading={isUpdateLoading}
              >
                Сохранить
              </Button>
            </div>
          </Form>
      </Modal>
    </>
  );
}
