import { ApartmentOutlined, EditOutlined, TeamOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useDepartmentById } from '../../../api/departments/departmentsApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader, { detailPageHeaderStyles as hStyles } from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { getNameById } from '../../../helpers/getNameById';
import styles from './DepartmentDetails.module.scss';

export default function DepartmentDetailsPage() {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const { contextHolder } = useNotification();
  const { data: department, isLoading, isError } = useDepartmentById(departmentId!);

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['departments', 'users']);

  if (isLoading || isReferencesLoading) {
    return <Loader />;
  }

  if (isError || !department || isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Отдел не найден или не подгрузились справочники' />;
  }

  const handleEdit = () => navigate(`/departments/${departmentId}/edit`);

  return (
    <DetailPageHeader
      title={department.name || 'Отдел'}
      backLabel='Отделы'
      onBack={() => navigate('/departments')}
      statusBadge={{
        label: department.is_active ? 'Активен' : 'Не активен',
        variant: department.is_active ? 'activityActive' : 'activityInactive',
      }}
      metaItems={[
        department.short_name && (
          <span key='short' className={hStyles.metaText}>
            <TeamOutlined /> {department.short_name}
          </span>
        ),
        department.parent_id && (
          <span key='parent' className={hStyles.metaText}>
            <ApartmentOutlined /> {getNameById(department.parent_id, referenceBooks?.departments!)}
          </span>
        ),
      ].filter(Boolean)}
      actions={
        <Button type='primary' icon={<EditOutlined />} onClick={handleEdit}>
          Редактировать
        </Button>
      }
      tabs={[{ key: 'main', label: 'Основное' }]}
      activeTab='main'
      onTabChange={() => {}}
      contextHolder={contextHolder}
    >
      <div className={styles.layout}>
        <div className={styles.leftColumn}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Основная информация</h3>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Название</span>
                <span className={department.name ? styles.infoValue : styles.infoValueMuted}>
                  {department.name || 'Не указано'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Короткое название</span>
                <span className={department.short_name ? styles.infoValue : styles.infoValueMuted}>
                  {department.short_name || 'Не указано'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Организационная структура</h3>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Руководитель</span>
                <span className={department.manager_id ? styles.infoValue : styles.infoValueMuted}>
                  {department.manager_id ? getNameById(department.manager_id, referenceBooks?.users) : 'Не назначен'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Родительский отдел</span>
                <span className={department.parent_id ? styles.infoValue : styles.infoValueMuted}>
                  {department.parent_id ? getNameById(department.parent_id, referenceBooks?.departments!) : 'Нет'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DetailPageHeader>
  );
}
