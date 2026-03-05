import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Tag, Space } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { NotFound } from '../../../components/notFound/NotFound';
import { Loader } from '../../../components/loader/Loader';
import { BackButton } from '../../../components/backButton/BackButton';
import { useModalStore } from '../../../store/ModalStore';
import { useNotification } from '../../../customhooks/useNotification';
import { ConfirmModal } from '../../../components/modals/currentModals/ConfirmModal';
import { useDeleteProject, useProjectById } from '../../../api/projects/projectApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { getNameById } from '../../../helpers/getNameById';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import styles from './ProjectDetailsPage.module.scss';

export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const { data: project, isLoading, isError } = useProjectById(projectId!);
  const mutation = useDeleteProject();

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['users']);

  const { handleOpenModal } = useConfirmByModal({
    mutation,
    successMessage: 'Проект успешно удалён',
    errorMessage: 'Не удалось удалить проект',
    redirectPath: '/projects',
    getMutationProps: () => projectId!,
    showNotification,
  });

  const handleEdit = () => {
    navigate(`/projects/${projectId}/edit`);
  };

  const getStatusTag = (status: string) => {
    const statusConfig = {
      active: { color: 'green', text: 'Активный' },
      completed: { color: 'blue', text: 'Завершен' },
      pending: { color: 'orange', text: 'В ожидании' },
      paused: { color: 'gray', text: 'Приостановлен' },
      cancelled: { color: 'red', text: 'Отменен' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: 'default',
      text: status,
    };

    return <Tag color={config.color}>{config.text}</Tag>;
  };

  if (isLoading || isReferencesLoading) {
    return <Loader />;
  }

  if (isError || isReferencesError) {
    return <NotFound errorMessage='Проект не найден' />;
  }

  return (
    <div>
      {contextHolder}
      <Space direction='vertical' size='middle' className={styles.container}>
        <BackButton />
        <Card
          title={project?.name}
          extra={
            <Space>
              <Button type='primary' icon={<EditOutlined />} onClick={handleEdit}>
                Редактировать
              </Button>
              <Button type='primary' danger icon={<DeleteOutlined />} onClick={handleOpenModal}>
                Удалить
              </Button>
            </Space>
          }
        >
          <Descriptions column={1} bordered className={styles.descriptions}>
            <Descriptions.Item label='Код проекта'>
              {project?.code || <Tag color='gray'>Не указан</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label='Название'>
              {project?.name || <Tag color='gray'>Не указано</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label='Короткое название'>
              {project?.short_name || <Tag color='gray'>Не указано</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label='Описание'>
              {project?.description || <Tag color='gray'>Не указано</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label='Статус'>{getStatusTag(project?.status!)}</Descriptions.Item>

            <Descriptions.Item label='Дата начала'>
              {project?.start_date ? (
                new Date(project?.start_date).toLocaleDateString('ru-RU')
              ) : (
                <Tag color='gray'>Не указана</Tag>
              )}
            </Descriptions.Item>

            <Descriptions.Item label='Дата окончания'>
              {project?.end_date ? (
                new Date(project?.end_date).toLocaleDateString('ru-RU')
              ) : (
                <Tag color='gray'>Не указана</Tag>
              )}
            </Descriptions.Item>

            <Descriptions.Item label='Менеджер'>
              {getNameById(project?.manager_id, referenceBooks?.users) || <Tag color='gray'>Не указан</Tag>}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </div>
  );
}
