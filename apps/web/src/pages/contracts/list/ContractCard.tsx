import { CalendarOutlined, DollarOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

import type { ReferenceData } from '@/api/hooks/useReferences';
import { getEntityById } from '@/helpers/getEntityById';
import { getNameById } from '@/helpers/getNameById';
import { formatRub } from '@/helpers/numberFormatters';
import { Contract } from '@/types/contract';
import {
  formatContractRegistryCardHeading,
  formatProjectChipLabel,
} from '../utils/contractDetailsUtils';
import styles from './ContractsListPage.module.scss';
import { formatDateRu } from '@/utils/formatDate';

type Refs =
  | Pick<
      ReferenceData,
      'partners' | 'contractStates' | 'contractCategories' | 'contractTypes' | 'projects'
    >
  | null;

type Props = {
  contract: Contract;
  refs: Refs;
  onClick: (contract: Contract) => void;
};
export function ContractCard({ contract, refs, onClick }: Props) {
  const partnerName = refs?.partners?.find(partner => partner.id === contract.partner_id)?.name ?? '-';
  const contractTypeName = getNameById(contract.contract_type_id, refs?.contractTypes ?? []);
  const projectEntity = getEntityById(contract.project_id, refs?.projects ?? []);
  const projectLabel = formatProjectChipLabel(projectEntity);
  const stateEntity = getEntityById(contract.state_id, refs?.contractStates);
  const effectiveLabel = contract.is_active ? 'Действует' : 'Не действует';
  const effectiveTagClass = contract.is_active ? styles.contractEffectiveTag : styles.contractInactiveTag;
  const periodStr =
    contract.start_date || contract.end_date
      ? [contract.start_date, contract.end_date].filter(Boolean).map(d => formatDateRu(d, '-')).join(' - ')
      : '-';
  const amountExclStr = formatRub(contract.amount_excl_vat);
  const amountInclStr = formatRub(contract.amount_incl_vat);
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
        <div className={styles.statsBlock} aria-label='Суммы договора'>
          <div className={styles.statPrimaryRow}>
            <span className={styles.statPrimaryLabel}>Без НДС</span>
            <span className={styles.statValue}>
              <DollarOutlined className={styles.statIcon} />
              {amountExclStr}
            </span>
          </div>
          <div className={styles.statSecondaryRow}>
            <span className={styles.statSecondaryLabel}>С НДС</span>
            <span className={styles.statSecondaryAmount}>{amountInclStr}</span>
          </div>
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
