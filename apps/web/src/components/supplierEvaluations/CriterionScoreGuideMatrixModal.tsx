import { Modal } from 'antd';

import { CriterionScoreGuideAccordion } from './CriterionScoreGuideAccordion';
import { listMatrixCriterionScoreGuides } from './criterionScoreGuides';

import styles from './CriterionScoreGuideMatrixModal.module.scss';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
};

/** Модалка с полной матрицей критериев из Excel (SQA-TEM-003). */
export function CriterionScoreGuideMatrixModal({
  open,
  onClose,
  title = 'Шкала баллов',
}: Props) {
  const guides = listMatrixCriterionScoreGuides();

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      width='max(920px, 80vw)'
      wrapClassName={styles.modalWrap}
      destroyOnHidden
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingTop: 4 } }}
    >
      <div className={styles.list}>
        {guides.map((guide) => (
          <CriterionScoreGuideAccordion key={guide.code} criterionCode={guide.code} title={guide.title} />
        ))}
      </div>
    </Modal>
  );
}
