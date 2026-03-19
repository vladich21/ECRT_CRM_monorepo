import { Tag, Tooltip } from 'antd';
import {
  CalendarOutlined,
  DollarOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Contract } from '../../../types/contract';
import { getNameById } from '../../../helpers/getNameById';
import { getEntityById } from '../../../helpers/getEntityById';
import type { ReferenceData } from '../../../api/hooks/useReferences';
import styles from './ContractsListPage.module.scss';

type Refs = Pick<ReferenceData, 'partners' | 'contractStates' | 'contractCategories'> | null;

function formatDate(dateStr: string) {
  return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : '—';
}

const ACTIVE_STYLE = { color: '#52c41a', label: 'Действует' };
const INACTIVE_STYLE = { color: '#ff4d4f', label: 'Не действует' };

type Props = {
  contract: Contract;
  refs: Refs;
  onClick: (contract: Contract) => void;
};

export function ContractCard({ contract, refs, onClick }: Props) {
  const partnerName = refs?.partners?.find((partner) => partner.id === contract.partner_id)?.name ?? '—';
  const categoryName = getNameById(contract.category_id, refs?.contractCategories ?? []);
  const stateEntity = getEntityById(contract.state_id, refs?.contractStates);
  const st = contract.is_active ? ACTIVE_STYLE : INACTIVE_STYLE;

  const periodStr =
    contract.start_date || contract.end_date
      ? [contract.start_date, contract.end_date].filter(Boolean).map(formatDate).join(' — ')
      : '—';

  const amountStr =
    contract.amount_incl_vat != null
      ? `${contract.amount_incl_vat.toLocaleString('ru-RU')} ₽`
      : '—';

  return (
    <div
      className={styles.card}
      style={{ '--status-color': st.color } as React.CSSProperties}
      onClick={() => onClick(contract)}
    >
      <div className={styles.mainInfo}>
        <div className={styles.nameRow}>
          <Tooltip title={contract.name}>
            <span className={styles.name}>№ {contract.number || '—'}</span>
          </Tooltip>
          {contract.cipher && (
            <span className={styles.metaText}>Шифр: {contract.cipher}</span>
          )}
        </div>
        <div className={styles.metaRow}>
          <Tag color={st.color} style={{ fontSize: 14 }}>{st.label}</Tag>
          {stateEntity && (
            <Tag style={{ fontSize: 14 }}>{stateEntity.name}</Tag>
          )}
        </div>
        <div className={styles.metaRow} style={{ marginTop: 2 }}>
          <span className={styles.metaText}>
            <TeamOutlined style={{ fontSize: 14 }} />
            {partnerName}
          </span>
        </div>
        {categoryName && (
          <div className={styles.metaRow} style={{ marginTop: 2 }}>
            <span className={styles.tag}>{categoryName}</span>
          </div>
        )}
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
