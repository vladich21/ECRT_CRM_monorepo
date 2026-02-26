import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Row, Col, Divider, ColorPicker, Tag } from 'antd';
import styles from './CompetencyEditPage.module.scss';
import { HighlightOutlined, SaveOutlined, TagOutlined } from '@ant-design/icons';
import { useNotification } from '../../../customhooks/useNotification';
import { Loader } from '../../../components/loader/Loader';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { NotFound } from '../../../components/notFound/NotFound';
import { usePartnerCompetenceById, useUpdatePartnerCompetence } from '../../../api/partners/partnerCompetenceApiHooks';
import { partnerCompetenceUpdateFormMapper } from '../../../helpers/mappers/competenceUpdateFormMapper';
import { initialColors } from './data';
import { getHexColor } from '../../../helpers/getHexColor';
import { BackButton } from '../../../components/backButton/BackButton';
import { useWatch } from 'antd/es/form/Form';

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

  // Отслеживаем изменения цветов в форме в реальном времени
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

    // Преобразуем цвета в строки, если они пришли как объекты ColorPicker
    if (payload.color_bg && typeof payload.color_bg === 'object') {
      payload.color_bg = payload.color_bg.toHexString();
    }
    if (payload.color_text && typeof payload.color_text === 'object') {
      payload.color_text = payload.color_text.toHexString();
    }
    if (payload.color_border && typeof payload.color_border === 'object') {
      payload.color_border = payload.color_border.toHexString();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { is_active, description, ...data } = payload;

    mutate({ id: competenceId!, data });
  };

  // Функция для предпросмотра тега
  const renderTagPreview = () => {
    // Используем значения из формы или значения из competence, если форма еще не заполнена
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
    <div>
      {contextHolder}
      <Space direction='vertical' size='middle' className={styles.container}>
        <BackButton />
        <Card
          title={
            <span>
              <TagOutlined className={styles.iconMargin} />
              Редактирование компетенции партнера: {competence.name}
            </span>
          }
        >
          <Form
            form={form}
            onFieldsChange={() => setIsFormChanged(true)}
            layout='vertical'
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
              <TagOutlined /> Основная информация
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Название компетенции'
                  name='name'
                  rules={[{ required: true, message: 'Введите название компетенции' }]}
                >
                  <Input placeholder='Введите название компетенции' prefix={<TagOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            {/* Цветовая схема */}
            <Divider orientation='left'>
              <HighlightOutlined /> Цветовая схема
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label='Цвет фона' name='color_bg'>
                  <ColorPicker
                    format='hex'
                    showText
                    presets={[
                      {
                        label: 'Рекомендуемые цвета',
                        colors: [
                          '#1890ff',
                          '#52c41a',
                          '#faad14',
                          '#f5222d',
                          '#722ed1',
                          '#fa541c',
                          '#13c2c2',
                          '#eb2f96',
                        ],
                      },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label='Цвет текста' name='color_text'>
                  <ColorPicker
                    format='hex'
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
                <Form.Item label='Цвет границы' name='color_border'>
                  <ColorPicker
                    format='hex'
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

            {/* Предпросмотр */}
            <Divider orientation='left'>
              <HighlightOutlined /> Предпросмотр
            </Divider>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item label='Пример отображения'>{renderTagPreview()}</Form.Item>
              </Col>
            </Row>

            {/* Кнопки действий */}
            <Form.Item>
              <Space>
                <Button
                  type='primary'
                  htmlType='submit'
                  icon={<SaveOutlined />}
                  disabled={!isFormChanged}
                  loading={isUpdateLoading}
                  size='large'
                >
                  Сохранить изменения
                </Button>

                <Button onClick={handleBack} size='large'>
                  Отмена
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  );
}
