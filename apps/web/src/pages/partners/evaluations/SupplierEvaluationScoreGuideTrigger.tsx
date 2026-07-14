import { useState } from 'react';
import { BarChartOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import { SupplierEvaluationScoreGuideModal } from './SupplierEvaluationScoreGuideModal';

type Props = {
  size?: 'small' | 'middle' | 'large';
  type?: 'link' | 'default' | 'text';
};

/** Кнопка «Шкала баллов» — полная матрица критериев из Excel. */
export function SupplierEvaluationScoreGuideTrigger({
  size = 'small',
  type = 'link',
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type={type} size={size} icon={<BarChartOutlined />} onClick={() => setOpen(true)}>
        Шкала баллов
      </Button>
      <SupplierEvaluationScoreGuideModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
