import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useReferenceData } from '../../api/hooks/useReferences';
import { NotFound } from '../../components/notFound/NotFound';
import ActivePatentsTable from './PatentsActiveTable';
import DeletedPatentsTable from './PatentsDeletedTable';
import { useNotification } from '../../customhooks/useNotification';
import { ReferenceDataForPatents } from './data';
import { usePatentFilters } from './hooks/usePatentFilters';
import { UniversalFilters } from '../../components/basicFilters/BasicFilters';
import { PageHeader } from '../../components/pageLayout/PageHeader';

export interface CounterType {
  active?: number;
  deleted?: number;
}

export type ActionType = 'active' | 'deleted';

export default function PatentsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, contextHolder } = useNotification();
  const [activeTab, setActiveTab] = useState<ActionType>(() => (location.state as { tab?: ActionType })?.tab ?? 'active');

  useEffect(() => {
    const tab = (location.state as { tab?: ActionType })?.tab;
    if (tab === 'active' || tab === 'deleted') setActiveTab(tab);
  }, [location.state]);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const { data: referenceBooks, isError: isReferencesError } = useReferenceData([
    'departments',
    'users',
    'contracts',
    'projects',
    'contractCategories',
    'patentStatuses',
    'patentIntellectProps',
  ]);
  const referenceData = referenceBooks as ReferenceDataForPatents;

  const { filterConfig } = usePatentFilters();

  const handleAddPatent = () => {
    navigate('/patents/create');
  };

  if (isReferencesError) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }

  return (
    <div>
      {contextHolder}
      <PageHeader
        title="РИД"
        subtitle="Результаты интеллектуальной деятельности"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddPatent}
            disabled={activeTab === 'deleted'}
          >
            Добавить РИД
          </Button>
        }
      />

      <UniversalFilters filterConfig={filterConfig} value={filters} onChange={setFilters} />

      <Tabs
        activeKey={activeTab}
        onChange={key => setActiveTab(key as 'active' | 'deleted')}
        items={[
          {
            key: 'active',
            label: 'Активные',
            children: <ActivePatentsTable filters={filters} referenceData={referenceData} showNotification={showNotification} />,
          },
          {
            key: 'deleted',
            label: 'Удалённые',
            children: (
              <DeletedPatentsTable
                filters={filters}
                referenceData={referenceData}
                showNotification={showNotification}
                onRestoreSuccess={() => setActiveTab('active')}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
