import { useState } from 'react';
import { BarChartOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import { useSupplierEvaluationCriteria } from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import type { SupplierEvaluationCriterion } from '../../../types/supplierEvaluation';

import { SupplierEvaluationScoreGuideModal } from './SupplierEvaluationScoreGuideModal';

type Props = {
  criteria?: SupplierEvaluationCriterion[];
  size?: 'small' | 'middle' | 'large';
  type?: 'link' | 'default' | 'text';
};

/** Кнопка «Шкала баллов» - открывает модалку с расшифровкой по критериям. */
export function SupplierEvaluationScoreGuideTrigger({
  criteria,
  size = 'small',
  type = 'link',
}: Props) {
  const [open, setOpen] = useState(false);
  const { data: loadedCriteria = [] } = useSupplierEvaluationCriteria();
  const resolvedCriteria = criteria?.length ? criteria : loadedCriteria;

  return (
    <>
      <Button type={type} size={size} icon={<BarChartOutlined />} onClick={() => setOpen(true)}>
        Шкала баллов
      </Button>
      <SupplierEvaluationScoreGuideModal
        open={open}
        onClose={() => setOpen(false)}
        criteria={resolvedCriteria}
      />
    </>
  );
}
