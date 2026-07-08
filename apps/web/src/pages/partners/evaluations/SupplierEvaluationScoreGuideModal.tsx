import { Modal, Typography } from 'antd';

import { SUPPLIER_EVALUATION_SCORE_GUIDE } from './supplierEvaluationScoreGuide';

import styles from './SupplierEvaluationScoreGuideModal.module.scss';

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SupplierEvaluationScoreGuideModal({ open, onClose }: Props) {
  return (
    <Modal
      title='Шкала баллов'
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnHidden
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
    </Modal>
  );
}
