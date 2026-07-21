import { useState } from 'react';
import { Spin } from 'antd';

import { useReferenceData } from '../../api/hooks/useReferences';
import { NotFound } from '../../components/notFound/NotFound';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { USE_GANTT_MOCKS } from './ganttConfig';
import { GanttField } from './GanttField';
import styles from './GanttsPage.module.scss';

export default function GanttsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    isError: isReferencesError,
    isLoading: isReferencesLoading,
  } = useReferenceData(USE_GANTT_MOCKS ? [] : ['projects']);

  if (!USE_GANTT_MOCKS && isReferencesError) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }

  if (!USE_GANTT_MOCKS && isReferencesLoading) {
    return (
      <div className={styles.pageContainer}>
        <PageHeader title='Диаграммы Ганта' />
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin size='large' />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <PageHeader title='Диаграммы Ганта' />

      <div className={styles.gantCard}>
        <div className={styles.chartPane}>
          <GanttField searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
        </div>
      </div>
    </div>
  );
}
