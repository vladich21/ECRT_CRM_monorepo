import { useState } from 'react';

import { PageHeader } from '../../components/pageLayout/PageHeader';
import { GanttField } from './GanttField';
import styles from './GanttsPage.module.scss';

export default function GanttsPage() {
  const [searchQuery, setSearchQuery] = useState('');

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
