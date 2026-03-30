import { useEffect, useState } from 'react';
import { SaveOutlined, TagOutlined } from '@ant-design/icons';
import { Button, Col, Divider, Form, Input, Modal, Row } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { usePartnerCompetenceById, useUpdatePartnerCompetence } from '../../../api/partners/partnerCompetenceApiHooks';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import { useNotification } from '../../../customhooks/useNotification';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { partnerCompetenceUpdateFormMapper } from '../../../helpers/mappers/competenceUpdateFormMapper';
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
  const { mutate, isPending: isUpdateLoading } = useUpdatePartnerCompetence();
  useEffect(() => {
    if (competence) {
      form.setFieldsValue(partnerCompetenceUpdateFormMapper(competence));
    }
  }, [competence, form]);
  if (isCompetenceLoading) {
    return <Loader />;
  }
  if (isCompetenceError || !competence) {
    return <NotFound errorMessage='Компетенция партнера не найдена' />;
  }
  const handleBack = () => {
    navigate(-1);
  };
  const handleSave = async (values: { name: string }) => {
    const payload = getChangedFields(values, partnerCompetenceUpdateFormMapper(competence));
    mutate(
      { id: competenceId!, data: payload },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Компетенция партнера успешно изменена');
          setTimeout(() => navigate(-1), 1000);
        },
        onError: () => {
          showNotification('error', 'Ошибка', 'Не удалось изменить компетенцию партнера');
        },
      },
    );
  };
  return (
    <>
      {contextHolder}
      <Modal
        open
        title={`Редактирование компетенции`}
        centered
        width={520}
        onCancel={handleBack}
        footer={null}
        destroyOnHidden
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
            <Button onClick={handleBack}>Отмена</Button>
            <Button
              type='primary'
              htmlType='submit'
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
