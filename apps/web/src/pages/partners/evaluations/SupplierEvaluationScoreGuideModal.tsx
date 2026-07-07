import { Modal, Typography } from 'antd';

import type { SupplierEvaluationCriterion } from '../../../types/supplierEvaluation';
import { SUPPLIER_EVALUATION_SCORE_GUIDE } from './supplierEvaluationScoreGuide';

import styles from './SupplierEvaluationScoreGuideModal.module.scss';

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  onClose: () => void;
  criteria: SupplierEvaluationCriterion[];
};

export function SupplierEvaluationScoreGuideModal({ open, onClose, criteria }: Props) {
  return (
    <Modal
      title='Шкала баллов по критериям'
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
    >
      <section className={styles.section}>
        <Title level={5} className={styles.sectionTitle}>
          Общая шкала (1-5)
        </Title>
        <ul className={styles.scaleList}>
          {SUPPLIER_EVALUATION_SCORE_GUIDE.map(step => (
            <li key={step.score}>
              <Text strong>{step.label}</Text>
              <Text>{step.description}</Text>
            </li>
          ))}
        </ul>
      </section>

      {criteria.map(criterion => (
        <section key={criterion.id} className={styles.section}>
          <Title level={5} className={styles.sectionTitle}>
            {criterion.name}
          </Title>
          {criterion.description?.trim() ? (
            <Text type='secondary' className={styles.criterionDescription}>
              {criterion.description.trim()}
            </Text>
          ) : null}
          <ul className={styles.scaleList}>
            {SUPPLIER_EVALUATION_SCORE_GUIDE.map(step => (
              <li key={`${criterion.id}-${step.score}`}>
                <Text strong>{step.label}</Text>
                <Text>{step.description}</Text>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Modal>
  );
}
