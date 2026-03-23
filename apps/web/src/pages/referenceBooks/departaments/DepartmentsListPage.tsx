import { useNavigate } from 'react-router-dom';
import { useDepartments } from '../../../api/departments/departmentsApiHooks';
import { getColumnsData } from './data';
import BasicTable from '../../../components/basicTable/BasicTable';
import { Department } from '../../../types/referenceTypes';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { NotFound } from '../../../components/notFound/NotFound';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';

export default function DepartmentsListPage() {
  const navigate = useNavigate();
  const { data: departments = [], isLoading, isError } = useDepartments();

  const {
    data: referenceBooks,
    isError: isReferencesError,
    isLoading: isReferencesLoading,
  } = useReferenceData(['departments', 'users']);

  const handleRowClick = (record: Department) => {
    navigate(`/departments/${record.id}`, {
      state: {
        department: record,
        from: 'departments-list',
      },
    });
  };

  if (isReferencesError || isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  return (
    <ReferenceBookListPage title='Отделы' addButtonLabel='Добавить отдел' onAdd={() => navigate('/departments/create')}>
      <BasicTable<Department>
        data={departments}
        loading={isReferencesLoading || isLoading}
        columns={getColumnsData({ departments: referenceBooks?.departments!, users: referenceBooks?.users! })}
        onRowClick={handleRowClick}
        enableContextMenu={true}
        enableExpandable={true}
        showActions={false}
      />
    </ReferenceBookListPage>
  );
}
