import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tabs, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useReferenceData } from '../../api/hooks/useReferences';
import { NotFound } from '../../components/notFound/NotFound';
import ActivePatentsTable from './PatentsActiveTable';
import DeletedPatentsTable from './PatentsDeletedTable';
import { useNotification } from '../../customhooks/useNotification';
import { ReferenceDataForPatents } from './data';
import { usePatentFilters } from './hooks/usePatentFilters';
import { useFilteredPatents } from './hooks/useFilteredPatents';
import { UniversalFilters } from '../../components/basicFilters/BasicFilters';
import { Patent } from '../../types/patent';

export interface CounterType {
  active?: number;
  deleted?: number;
}

export type ActionType = 'active' | 'deleted';

const { TabPane } = Tabs;

export default function PatentsListPage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [activeTab, setActiveTab] = useState<ActionType>('active');
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

  // Используем кастомные хуки для фильтрации
  const { filterConfig } = usePatentFilters();

  // Обработчики действий
  const handleAddPatent = () => {
    navigate('/patents/create');
  };

  if (isReferencesError) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }

  return (
    <div>
      {contextHolder}
      <Card>
        {/* Заголовок и кнопки */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>РИД</h2>
          <Space>
            <Button type='primary' icon={<PlusOutlined />} onClick={handleAddPatent} disabled={activeTab === 'deleted'}>
              Добавить РИД
            </Button>
          </Space>
        </div>

        <UniversalFilters filterConfig={filterConfig} value={filters} onChange={setFilters} />

        {/* Вкладки */}
        <Tabs activeKey={activeTab} onChange={key => setActiveTab(key as 'active' | 'deleted')}>
          <TabPane tab={<span>Активные</span>} key='active'>
            <ActivePatentsTable filters={filters} referenceData={referenceData} showNotification={showNotification} />
          </TabPane>

          <TabPane tab={<span>Удаленные</span>} key='deleted'>
            <DeletedPatentsTable filters={filters} referenceData={referenceData} showNotification={showNotification} />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
