import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Row, Col, Divider, ColorPicker, Tag } from 'antd';
import styles from './CompetenceCreatePage.module.scss';
import { SaveOutlined, PlusOutlined, TagOutlined, HighlightOutlined } from '@ant-design/icons';
import { useNotification } from '../../../customhooks/useNotification';
import { BackButton } from '../../../components/backButton/BackButton';
import { initialColors, initialFormValues } from './data';
import { useCreatePartnerCompetence } from '../../../api/partners/partnerCompetenceApiHooks';
import { useWatch } from 'antd/es/form/Form';
import { getHexColor } from '../../../helpers/getHexColor';

export default function PartnerCompetenceCreatePage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [tagPreview, setTagPreview] = useState(initialColors);

  const {
    mutate,
    isPending: isCreateLoading,
    isError: isCreateError,
    isSuccess: isCreateSuccess,
  } = useCreatePartnerCompetence();

  useEffect(() => {
    if (isCreateSuccess) {
      showNotification('success', 'Успех', 'Компетенция партнера успешно создана');
      setTimeout(() => navigate(-1), 1000);
    } else if (isCreateError) {
      showNotification('error', 'Ошибка', 'Не удалось создать компетенцию партнера');
    }
  }, [isCreateError, isCreateSuccess, navigate, showNotification]);

  const handleCreate = async (values: any) => {
    const payload = {
      ...values,
    };

    if (payload.color_bg && typeof payload.color_bg === 'object') {
      payload.color_bg = payload.color_bg.toHexString();
    } else {
      payload.color_bg = payload.color_bg || '#1890ff';
    }

    if (payload.color_text && typeof payload.color_text === 'object') {
      payload.color_text = payload.color_text.toHexString();
    } else {
      payload.color_text = payload.color_text || '#ffffff';
    }

    if (payload.color_border && typeof payload.color_border === 'object') {
      payload.color_border = payload.color_border.toHexString();
    } else {
      payload.color_border = payload.color_border || '#1890ff';
    }

    mutate(payload);
  };

  // Функция для предпросмотра тега
  const renderTagPreview = () => {
    const bgColor = getHexColor(tagPreview?.color_bg);
    const textColor = getHexColor(tagPreview?.color_text);
    const borderColor = getHexColor(tagPreview?.color_border);

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
              <PlusOutlined className={styles.iconMargin} />
              Создание новой компетенции партнера
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
                    onChangeComplete={val => setTagPreview(prev => ({ ...prev, color_bg: val as unknown as string }))}
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
                    onChangeComplete={val => setTagPreview(prev => ({ ...prev, color_text: val as unknown as string }))}
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
                    onChangeComplete={val =>
                      setTagPreview(prev => ({ ...prev, color_border: val as unknown as string }))
                    }
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
                <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading} size='large'>
                  Создать компетенцию
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
