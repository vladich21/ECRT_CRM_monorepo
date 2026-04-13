import { EditOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useDepartmentById } from '../../../api/departments/departmentsApiHooks';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import styles from './DepartmentDetails.module.scss';

export default function DepartmentDetailsPage() {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const { contextHolder } = useNotification();
  const { data: department, isLoading, isError } = useDepartmentById(departmentId!);

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !department) {
    return <NotFound errorMessage='Отдел не найден' />;
  }

  const handleEdit = () => navigate(`/departments/${departmentId}/edit`);

  return (
    <DetailPageHeader
      title={department.name || 'Отдел'}
      backLabel='Отделы'
      onBack={() => navigate('/departments')}
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
            </div>
          </div>
        </div>
      </div>
    </DetailPageHeader>
  );
}
