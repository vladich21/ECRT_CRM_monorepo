import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, Button, Select, Space, Row, Col, Divider, DatePicker } from 'antd';
import { SaveOutlined, FileTextOutlined, NumberOutlined, CalendarOutlined, CopyrightOutlined } from '@ant-design/icons';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { useNotification } from '../../../customhooks/useNotification';
import { Loader } from '../../../components/loader/Loader';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { NotFound } from '../../../components/notFound/NotFound';
import dayjs from 'dayjs';
import { usePatentGrantById, useUpdatePatentGrant } from '../../../api/patents/patentGrantsApiHooks';
import { BackButton } from '../../../components/backButton/BackButton';

const { Option } = Select;
const { TextArea } = Input;

export default function PatentGrantEditPage() {
  const { grantId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { data: patentGrant, isLoading: isGrantLoading, isError: isGrantError } = usePatentGrantById(grantId!);
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['patents']);
  const {
    mutate,
    isPending: isUpdateLoading,
    isError: isUpdateError,
    isSuccess: isUpdateSuccess,
  } = useUpdatePatentGrant();

  useEffect(() => {
    if (patentGrant) {
      const formData = {
        ...patentGrant,
        renewal_date: patentGrant.renewal_date ? dayjs(patentGrant.renewal_date) : null,
      };
      form.setFieldsValue(formData);
    }
  }, [patentGrant, form]);

  useEffect(() => {
    if (isUpdateSuccess && patentGrant?.patent_id) {
      showNotification('success', 'Успех', 'Патентный грант успешно изменён');
      setTimeout(() => navigate(`/patents/${patentGrant.patent_id}/grants`), 1000);
    } else if (isUpdateError) {
      showNotification('error', 'Ошибка', 'Не удалось изменить патентный грант');
    }
  }, [isUpdateError, isUpdateSuccess, navigate, showNotification, patentGrant?.patent_id]);

  const handleSave = async (values: any) => {
    const payload = getChangedFields(values, patentGrant!);

    // Преобразование даты продления обратно в строку
    if (payload.renewal_date && dayjs.isDayjs(payload.renewal_date)) {
      payload.renewal_date = payload.renewal_date.format('YYYY-MM-DD');
    }

    mutate({ id: grantId!, data: payload });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleFormChange = () => {
    setIsFormChanged(true);
  };

  if (isReferencesLoading || isGrantLoading) {
    return <Loader />;
  }

  if (isReferencesError || isGrantError || !patentGrant || !referenceBooks) {
    return <NotFound errorMessage='Не найден патентный грант или справочник' />;
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
              Редактирование патентного гранта: {patentGrant.grant_number}
            </span>
          }
        >
          <Form
            form={form}
            layout='vertical'
            onFieldsChange={handleFormChange}
            onFinish={handleSave}
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
                <Form.Item label='Патент' name='patent_id' rules={[{ required: true, message: 'Выберите патент' }]}>
                  <Select
                    placeholder='Выберите патент'
                    allowClear
                    showSearch
                    optionFilterProp='children'
                    filterOption={(input, option) =>
                      String(option?.children ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    suffixIcon={<CopyrightOutlined />}
                  >
                    {referenceBooks?.patents?.map(patent => (
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
                <Button
                  type='primary'
                  htmlType='submit'
                  icon={<SaveOutlined />}
                  loading={isUpdateLoading}
                  disabled={!isFormChanged}
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
