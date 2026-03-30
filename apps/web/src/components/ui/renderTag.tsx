import { Tag } from 'antd';

import { PartnerCompetence } from '../../types/partner';
import styles from './renderTag.module.scss';

export const renderCompetenceTag = (competence?: PartnerCompetence) => {
  if (!competence) return null;
  return (
    <Tag key={competence.id} bordered={false} className={styles.competenceTag}>
      {competence.name}
    </Tag>
  );
};
