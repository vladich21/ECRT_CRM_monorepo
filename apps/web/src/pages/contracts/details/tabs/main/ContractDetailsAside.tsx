import {
  Card,
  Descriptions,
  Progress,
  Avatar,
  Typography,
  Space,
  Statistic,
  Tag,
  Alert,
  Divider,
} from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import type { Contract, ContractStage } from '../../../../../types/contract';
import type { ReferenceData } from '../../../../../api/hooks/useReferences';
import { getNameById } from '../../../../../helpers/getNameById';
import { buildDetailItems } from './contractInfoItems';
import styles from './ContractDetailsAside.module.scss';

const { Text } = Typography;

type AsideReferences = Partial<
  Pick<ReferenceData, 'partners' | 'users' | 'contractStates' | 'contractCategories'>
>;

type ContractDetailsAsideProps = {
  contract: Contract;
  stages?: ContractStage[];
  references?: AsideReferences | null;
};

function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `${amount.toLocaleString('ru-RU')} ₽`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function calcVatAmount(contract: Contract): number {
  const rate = Number(contract.vat_rate) || 0;
  if (rate <= 0) return 0;

  const excl = Number(contract.amount_excl_vat) || 0;
  if (excl > 0) return roundMoney(excl * (rate / 100));

  const incl = Number(contract.amount_incl_vat) || 0;
  if (incl > 0) return roundMoney(incl - incl / (1 + rate / 100));

  return 0;
}

function getDaysUntilDate(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function getInitials(fullName: string | undefined): string {
  if (!fullName) return '?';
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ContractDetailsAside({
  contract,
  stages = [],
  references,
}: ContractDetailsAsideProps) {
  const responsibleName = getNameById(contract.responsible_id, references?.users ?? []);

  const totalPlannedBudget = stages.reduce((s, st) => s + (st.planned_budget || 0), 0);
  const totalActualBudget  = stages.reduce((s, st) => s + (st.actual_budget  || 0), 0);
  const budgetProgressPercent =
    totalPlannedBudget > 0
      ? Math.min((totalActualBudget / totalPlannedBudget) * 100, 100)
      : 0;
  const budgetDeviationPercent =
    totalPlannedBudget > 0 && totalActualBudget > 0
      ? ((totalActualBudget - totalPlannedBudget) / totalPlannedBudget) * 100
      : null;

  const daysUntilEnd = getDaysUntilDate(contract.end_date);
  const showDeadlineCallout =
    daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 30;

  const detailItems = buildDetailItems(contract, references ?? {});
  const vatSum = contract.amount_vat > 0 ? contract.amount_vat : calcVatAmount(contract);

  return (
    <div className={styles.asideWrap}>
      <Card size="small" title="Финансы">
        <Statistic
          value={contract.amount_incl_vat ?? 0}
          formatter={(val) => Number(val).toLocaleString('ru-RU')}
          suffix="₽"
          valueStyle={{ fontSize: 22, fontWeight: 800 }}
          className={styles.amountStatistic}
        />
        <Text type="secondary" className={styles.amountHint}>
          Итого с НДС
        </Text>

        <Descriptions
          column={1}
          size="small"
          layout="horizontal"
          items={[
            {
              key: 'excl',
              label: 'Без НДС',
              children: <Text strong>{formatAmount(contract.amount_excl_vat)}</Text>,
            },
            {
              key: 'vat_sum',
              label: 'Сумма НДС',
              children: <Text strong>{formatAmount(vatSum)}</Text>,
            },
            {
              key: 'vat_rate',
              label: 'Ставка НДС',
              children: <Text strong>{contract.vat_rate ?? 0}%</Text>,
            },
          ]}
          classNames={{ label: styles.descLabel, content: styles.descContent }}
        />

        {stages.length > 0 && (
          <>
            <Divider style={{ margin: '10px 0' }} />
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <div>
                <div className={styles.budgetRow}>
                  <Text type="secondary" className={styles.budgetLabel}>Бюджет (план)</Text>
                  <Text strong className={styles.budgetLabel}>{formatAmount(totalPlannedBudget)}</Text>
                </div>
                <Progress percent={100} showInfo={false} strokeColor="#d9d9d9" trailColor="#ebebeb" size="small" />
              </div>

              <div>
                <div className={styles.budgetRow}>
                  <Text type="secondary" className={styles.budgetLabel}>Освоено (факт)</Text>
                  <Text strong className={styles.budgetLabel}>{formatAmount(totalActualBudget)}</Text>
                </div>
                <Progress percent={Math.round(budgetProgressPercent)} showInfo={false} size="small" />
              </div>

              {budgetDeviationPercent !== null && (
                <>
                  <Divider style={{ margin: '4px 0' }} />
                  <div className={styles.deviationRow}>
                    <Text type="secondary">Отклонение</Text>
                    <Tag style={{ fontSize: 14 }} color={budgetDeviationPercent >= 0 ? 'success' : 'error'}>
                      {budgetDeviationPercent >= 0 ? '+' : ''}
                      {budgetDeviationPercent.toFixed(1)}%
                    </Tag>
                  </div>
                </>
              )}
            </Space>
          </>
        )}
      </Card>

      <Card size="small" title="Детали договора">
        <Descriptions
          column={1}
          size="small"
          layout="horizontal"
          items={detailItems}
          classNames={{ label: styles.descLabel, content: styles.descContent }}
        />
        {showDeadlineCallout && (
          <Alert
            message={<>Осталось <Text strong>{daysUntilEnd} дн.</Text></>}
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            className={styles.deadlineAlert}
          />
        )}
      </Card>

      <Card size="small" title="Команда">
        <Space align="center">
          <Avatar className={styles.avatar}>{getInitials(responsibleName)}</Avatar>
          <div>
            <Text strong className={styles.personName}>
              {responsibleName || 'Не назначен'}
            </Text>
            <Text type="secondary" className={styles.personRole}>
              Ответственный по договору
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
