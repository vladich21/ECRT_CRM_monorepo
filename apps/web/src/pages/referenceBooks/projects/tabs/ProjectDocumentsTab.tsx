import { Alert } from 'antd';

import { EntityFilesTab } from '@/components/entityFiles/EntityFilesTab';
import { PROJECT_DOCUMENT_SECTIONS } from '@/components/entityFiles/projectDocumentSections';
import styles from '../ProjectDetails.module.scss';

export default function ProjectDocumentsTab() {
  return (
    <div className={styles.documentsTabWrap}>
      <Alert
        type='info'
        showIcon
        message='Согласование документов'
        description='Дальнейший этап: утверждение проектных документов по регламенту согласования (статусы и маршрут будут добавлены отдельно).'
        style={{ marginBottom: 24 }}
      />
      <EntityFilesTab entityType='project' documentSections={PROJECT_DOCUMENT_SECTIONS} />
    </div>
  );
}
