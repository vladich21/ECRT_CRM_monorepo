import { useEffect, useState } from 'react';
import { Divider, Spin, Tabs } from 'antd';
import { useReferenceData } from '../../api/hooks/useReferences';
import { NotFound } from '../../components/notFound/NotFound';
import { GanttField } from './GanttField';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import styles from './GanttsPage.module.scss';
export interface CounterType {
  active?: number;
  deleted?: number;
}
export default function GanttsPage() {
  const [activeProjectTab, setActiveProjectTab] = useState<string>();
  const {
    data: referenceBooks,
    isError: isReferencesError,
    isLoading: isReferencesLoading,
  } = useReferenceData([
    'departments',
    'users',
    'contracts',
    'projects',
    'contractCategories',
    'patentStatuses',
    'patentIntellectProps',
  ]);
  const ganttProjects = referenceBooks?.projects ?? [];
  useEffect(() => {
    if (ganttProjects.length > 0) {
      setActiveProjectTab(ganttProjects[0]?.id.toString());
    }
  }, [ganttProjects]);
  if (isReferencesError) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }
  if (isReferencesLoading) {
    return (
      <div className={styles.pageContainer}>
        <PageHeader title='Диаграммы Ганта по проектам' />
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin size='large' />
        </div>
      </div>
    );
  }
  const tabItems = ganttProjects.map(el => ({
    key: el.id.toString(),
    label: <span>{el.name}</span>,
    children: (
      <div className={activeProjectTab === el.id.toString() ? styles.tabContent : styles.tabContentHidden}>
        <Divider className={styles.divider} />
        <GanttField />
      </div>
    ),
  }));
  return (
    <div className={styles.pageContainer}>
      <PageHeader title='Диаграммы Ганта по проектам' />

      <div className={styles.gantCard}>
        <Tabs
          activeKey={activeProjectTab}
          onChange={key => setActiveProjectTab(key)}
          items={tabItems}
          style={{
            height: '100%',
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        />
      </div>
    </div>
  );
}
