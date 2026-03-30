import { CalendarOutlined, DollarOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

import type { ReferenceData } from '../../../api/hooks/useReferences';
import { getEntityById } from '../../../helpers/getEntityById';
import { getNameById } from '../../../helpers/getNameById';
import { Contract } from '../../../types/contract';
import {
  formatContractRegistryCardHeading,
  formatProjectChipLabel,
} from '../utils/contractDetailsUtils';
import styles from './ContractsListPage.module.scss';

type Refs =
  | Pick<
      ReferenceData,
      'partners' | 'contractStates' | 'contractCategories' | 'contractTypes' | 'projects'
    >
  | null;

function formatDate(dateStr: string) {
  return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : '—';
}
type Props = {
  contract: Contract;
  refs: Refs;
  onClick: (contract: Contract) => void;
};
export function ContractCard({ contract, refs, onClick }: Props) {
  const partnerName = refs?.partners?.find(partner => partner.id === contract.partner_id)?.name ?? '—';
  const contractTypeName = getNameById(contract.contract_type_id, refs?.contractTypes ?? []);
  const projectEntity = getEntityById(contract.project_id, refs?.projects ?? []);
  const projectLabel = formatProjectChipLabel(projectEntity);
  const stateEntity = getEntityById(contract.state_id, refs?.contractStates);
  const effectiveLabel = contract.is_active ? 'Действует' : 'Не действует';
  const effectiveTagClass = contract.is_active ? styles.contractEffectiveTag : styles.contractInactiveTag;
  const periodStr =
    contract.start_date || contract.end_date
      ? [contract.start_date, contract.end_date].filter(Boolean).map(formatDate).join(' — ')
      : '—';
  const amountStr = contract.amount_incl_vat != null ? `${contract.amount_incl_vat.toLocaleString('ru-RU')} ₽` : '—';
  const heading = formatContractRegistryCardHeading(contract);

  return (
    <div
      className={styles.card}
      {...(!contract.is_active ? { 'data-danger-stripe': true as const } : {})}
      onClick={() => onClick(contract)}
    >
      <div className={styles.mainInfo}>
        <div className={styles.cardHeading}>{heading}</div>
        <div className={styles.partnerRow}>
          <UserOutlined style={{ fontSize: 14, flexShrink: 0 }} />
          <span className={styles.partnerNameUpper}>{partnerName}</span>
        </div>
        <div className={styles.chipsRow}>
          <Tag bordered={false} className={effectiveTagClass}>
            {effectiveLabel}
          </Tag>
          {stateEntity ? <Tag className={styles.chipTight}>{stateEntity.name}</Tag> : null}
          {contractTypeName ? (
            <Tag className={`${styles.typeChip} ${styles.chipTight}`}>{contractTypeName}</Tag>
          ) : null}
          {projectLabel ? (
            <Tag className={`${styles.projectChip} ${styles.chipTight}`}>{projectLabel}</Tag>
          ) : null}
        </div>
      </div>

      <div className={styles.metricsCol}>
        <div className={styles.statsBlock}>
          <div className={styles.statValue}>
            <DollarOutlined style={{ fontSize: 11, marginRight: 4 }} />
            {amountStr}
          </div>
          <div className={styles.statLabel}>Сумма с НДС</div>
        </div>
        <div className={styles.periodInfo}>
          <CalendarOutlined style={{ fontSize: 11 }} />
          {periodStr}
        </div>
      </div>

      <div className={styles.activityCol}>
        <RightOutlined className={styles.arrow} />
      </div>
    </div>
  );
}
