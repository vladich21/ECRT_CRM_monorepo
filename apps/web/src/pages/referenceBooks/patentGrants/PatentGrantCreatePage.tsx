import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Select, Space, Row, Col, Divider, DatePicker } from 'antd';
import { SaveOutlined, FileTextOutlined, NumberOutlined, CalendarOutlined, CopyrightOutlined } from '@ant-design/icons';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { useCreatePatentGrant } from '../../../api/patents/patentGrantsApiHooks';
import { useNotification } from '../../../customhooks/useNotification';
import { BackButton } from '../../../components/backButton/BackButton';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import dayjs from 'dayjs';
import { Reference } from '../../../types/referenceTypes';

const { Option } = Select;
const { TextArea } = Input;

export default function PatentGrantCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();

  const patentIdFromState = location.state?.patentId;

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['patents']);

  const {
    mutate,
    isPending: isCreateLoading,
    isError: isCreateError,
    isSuccess: isCreateSuccess,
  } = useCreatePatentGrant();

  useEffect(() => {
    if (patentIdFromState && referenceBooks?.patents) {
      form.setFieldsValue({ patent_id: patentIdFromState });
    }
  }, [patentIdFromState, referenceBooks, form]);

  useEffect(() => {
    if (isCreateSuccess) {
      showNotification('success', 'Успех', 'Патентный грант успешно создан');
      if (patentIdFromState) {
        setTimeout(() => navigate(`/patents/${patentIdFromState}/grants`), 1000);
      } else {
        setTimeout(() => navigate(-1), 1000);
      }
    } else if (isCreateError) {
      showNotification('error', 'Ошибка', 'Не удалось создать патентный грант');
    }
  }, [isCreateError, isCreateSuccess, navigate, showNotification, patentIdFromState]);

  const handleCreate = async (values: any) => {
    const patentId = values.patent_id;
    if (!patentId) return;
    const data = {
      grant_number: values.grant_number,
      status: values.status,
      renewal_date: values.renewal_date ? values.renewal_date.format('YYYY-MM-DD') : undefined,
      notes: values.notes,
    };
    mutate({ patentId, data });
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
              <CopyrightOutlined style={{ marginRight: 8 }} />
              Создание нового патентного гранта
            </span>
          }
        >
          <Form
            form={form}
            layout='vertical'
            onFinish={handleCreate}
            onKeyPress={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            scrollToFirstError
          >
            {/* Основная информация о гранте */}
            <Divider orientation='left'>
              <CopyrightOutlined /> Основная информация
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Номер гранта'
                  name='grant_number'
                  rules={[{ required: true, message: 'Введите номер гранта' }]}
                >
                  <Input placeholder='GR-2024-001' prefix={<NumberOutlined />} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='РИД' name='patent_id' rules={[{ required: true, message: 'Выберите патент' }]}>
                  <Select
                    placeholder='Выберите РИД'
                    allowClear={!patentIdFromState} // Если перешли со страницы патента, нельзя очистить
                    disabled={!!patentIdFromState} // Если перешли со страницы патента, блокируем выбор
                    showSearch
                    optionFilterProp='children'
                    filterOption={(input, option) =>
                      String(option?.children ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    suffixIcon={<CopyrightOutlined />}
                  >
                    {referenceBooks?.patents?.map((patent: Reference) => (
                      <Option key={patent.id} value={patent.id}>
                        {patent.name || `Патенг ${patent.id}`}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Статус и даты */}
            <Divider orientation='left'>
              <CalendarOutlined /> Статус и даты
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label='Статус' name='status' rules={[{ required: true, message: 'Выберите статус' }]}>
                  <Select placeholder='Выберите статус'>
                    <Option value='Активный'>Активный</Option>
                    <Option value='Истек'>Истек</Option>
                    <Option value='Отозван'>Отозван</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label='Дата продления' name='renewal_date'>
                  <DatePicker placeholder='Выберите дату продления' style={{ width: '100%' }} format='DD.MM.YYYY' />
                </Form.Item>
              </Col>
            </Row>

            {/* Дополнительная информация */}
            <Divider orientation='left'>
              <FileTextOutlined /> Дополнительная информация
            </Divider>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item label='Примечания' name='notes'>
                  <TextArea placeholder='Введите дополнительные сведения о гранте' rows={3} />
                </Form.Item>
              </Col>
            </Row>

            {/* Кнопки действий */}
            <Form.Item>
              <Space>
                <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading} size='large'>
                  Создать патентный грант
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
