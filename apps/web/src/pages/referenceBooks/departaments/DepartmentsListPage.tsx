import { useNavigate } from 'react-router-dom';

import { useDepartments } from '../../../api/departments/departmentsApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import BasicTable from '../../../components/basicTable/BasicTable';
import { NotFound } from '../../../components/notFound/NotFound';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { Department } from '../../../types/referenceTypes';
import { getColumnsData } from './data';

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
