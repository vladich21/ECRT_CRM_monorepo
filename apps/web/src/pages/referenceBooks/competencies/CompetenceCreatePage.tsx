import { SaveOutlined, TagOutlined } from '@ant-design/icons';
import { Button, Col, Divider, Form, Input, Modal, Row } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useCreatePartnerCompetence } from '../../../api/partners/partnerCompetenceApiHooks';
import { useNotification } from '../../../customhooks/useNotification';
import styles from './CompetencyFormPage.module.scss';

export default function PartnerCompetenceCreatePage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const { mutate, isPending: isCreateLoading } = useCreatePartnerCompetence();
  const handleCreate = (values: { name: string }) => {
    mutate(
      { name: values.name },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Компетенция партнера успешно создана');
          setTimeout(() => navigate(-1), 1000);
        },
        onError: () => {
          showNotification('error', 'Ошибка', 'Не удалось создать компетенцию партнера');
        },
      },
    );
  };
  return (
    <>
      {contextHolder}
      <Modal
        open
        title='Создание компетенции партнера'
        centered
        width={520}
        onCancel={() => navigate(-1)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={form}
          layout='vertical'
          initialValues={{ name: '' }}
          onFinish={handleCreate}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          scrollToFirstError
        >
          <Divider orientation='left'>
            <TagOutlined /> Основная информация
          </Divider>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label='Название компетенции'
                name='name'
                rules={[{ required: true, message: 'Введите название компетенции' }]}
              >
                <Input placeholder='Введите название компетенции' prefix={<TagOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          <div className={styles.formActions}>
            <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
              Очистить форму
            </Button>
            <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading}>
              Создать компетенцию
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
