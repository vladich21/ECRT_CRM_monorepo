import { Tag } from 'antd';
import { PartnerCompetence } from '../../types/partner';
import styles from './renderTag.module.scss';

export const renderCompetenceTag = (competence?: PartnerCompetence) => {
  if (!competence) return null;
  return (
    <Tag
      key={competence.id}
      className={styles.competenceTag}
      style={{
        backgroundColor: competence.color_bg || '#1890ff',
        color: competence.color_text || '#ffffff',
        border: `1px solid ${competence.color_border || '#1890ff'}`,
      }}
    >
      {competence.name}
    </Tag>
  );
};
