import { CriterionScoreGuideMatrixModal } from '@/components/supplierEvaluations/CriterionScoreGuideMatrixModal';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SupplierEvaluationScoreGuideModal({ open, onClose }: Props) {
  return <CriterionScoreGuideMatrixModal open={open} onClose={onClose} />;
}
