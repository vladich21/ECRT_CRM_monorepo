import { Contract } from '../../types/contract';
import { getNameById } from '../../helpers/getNameById';
import { getEntityById } from '../../helpers/getEntityById';
import { getContractStateTagClass } from './utils/contractStateUtils';
import type { ReferenceData } from '../../api/hooks/useReferences';
import styles from './ContractsListPage.module.scss';

type Refs = Pick<ReferenceData, 'partners' | 'contractStates' | 'contractCategories'> | null;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

function getCardData(contract: Contract, refs: Refs) {
  const partnerName = refs?.partners?.find((p) => p.id === contract.partner_id)?.name ?? '—';
  const categoryName = getNameById(contract.category_id, refs?.contractCategories ?? []);
  const stateEntity = getEntityById(contract.state_id, refs?.contractStates);
  const periodStr =
    contract.start_date || contract.end_date
      ? [contract.start_date, contract.end_date].filter(Boolean).map(formatDate).join(' — ')
      : '—';
  const signedDateStr = contract.date_signed ? formatDate(contract.date_signed) : '—';
  return {
    partnerName,
    categoryName,
    stateEntity,
    stateTagClass: getContractStateTagClass(stateEntity?.code),
    periodStr,
    signedDateStr,
  };
}

type Props = {
  contract: Contract;
  refs: Refs;
  onClick: (contract: Contract) => void;
};

export function ContractCard({ contract, refs, onClick }: Props) {
  const card = getCardData(contract, refs);
  const amountStr =
    contract.amount_incl_vat != null
      ? `${contract.amount_incl_vat.toLocaleString('ru-RU')} ₽`
      : '—';

  return (
    <div
      className={styles.contractCard}
      role="button"
      tabIndex={0}
      onClick={() => onClick(contract)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(contract)}
    >
      <div className={styles.contractCardBody}>
        <div className={styles.cardMain}>
          <span className={styles.cardNum}>{contract.number || '—'}</span>
          {card.categoryName && (
            <span className={styles.cardCategory}>{card.categoryName}</span>
          )}
          <span className={styles.cardPartner}>{card.partnerName}</span>
        </div>
        <div className={styles.cardRight}>
          <span className={styles.cardAmountWrap}>
            <span className={styles.cardAmount}>{amountStr}</span>
            <span className={styles.cardAmountLabel}> с НДС</span>
          </span>
          <div className={styles.cardStatusRow}>
            <span
              className={
                contract.is_active ? styles.tagStatusActive : styles.tagStatusInactive
              }
            >
              {contract.is_active ? 'Активен' : 'Неактивен'}
            </span>
            <span className={styles[card.stateTagClass]}>
              {card.stateEntity?.name ?? '—'}
            </span>
          </div>
        </div>
      </div>
      <span className={styles.cardMeta}>
        {contract.cipher && (
          <>
            <span className={styles.cardMetaDot}>Шифр: {contract.cipher}</span>
            <span className={styles.cardMetaSep}>·</span>
          </>
        )}
        <span className={styles.cardMetaDot}>Дата: {card.signedDateStr}</span>
        <span className={styles.cardMetaSep}>·</span>
        <span className={styles.cardMetaDot}>Период: {card.periodStr}</span>
      </span>
    </div>
  );
}
