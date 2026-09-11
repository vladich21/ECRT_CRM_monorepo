import { Card, Descriptions, Statistic, Typography } from 'antd';

import { formatMoneyNumber, formatRub } from '@/helpers/numberFormatters';
import type { Patent } from '@/types/patent';
import {
  calcPatentRidVatAmount,
  PATENT_DEFAULT_RID_VAT_RATE,
} from '@/pages/patents/utils/patentRidCostUtils';

import styles from './PatentRidFinanceCard.module.scss';

const { Text } = Typography;

type Props = {
  patent: Patent;
};

export function PatentRidFinanceCard({ patent }: Props) {
  const ridVatRate = patent.rid_vat_rate ?? PATENT_DEFAULT_RID_VAT_RATE;
  const ridVatAmount =
    patent.rid_cost_vat != null && patent.rid_cost_vat > 0
      ? patent.rid_cost_vat
      : calcPatentRidVatAmount(patent.rid_cost_excl_vat, ridVatRate, patent.rid_cost_incl_vat);

  return (
    <Card size='small' title='Финансы' className={styles.card}>
      <Statistic
        value={patent.rid_cost_incl_vat ?? 0}
        formatter={val => formatMoneyNumber(Number(val)) ?? '0,00'}
        suffix='₽'
        valueStyle={{ fontSize: 22, fontWeight: 800 }}
        className={styles.amountStatistic}
      />
      <Text type='secondary' className={styles.amountHint}>
        Итого с НДС
      </Text>

      <Descriptions
        column={1}
        size='small'
        layout='horizontal'
        items={[
          {
            key: 'excl',
            label: 'Без НДС',
            children: <Text strong>{formatRub(patent.rid_cost_excl_vat)}</Text>,
          },
          {
            key: 'vat_sum',
            label: 'Сумма НДС',
            children: <Text strong>{formatRub(ridVatAmount > 0 ? ridVatAmount : null)}</Text>,
          },
          {
            key: 'vat_rate',
            label: 'Ставка НДС',
            children: <Text strong>{ridVatRate}%</Text>,
          },
        ]}
        classNames={{ label: styles.descLabel, content: styles.descContent }}
      />
    </Card>
  );
}
