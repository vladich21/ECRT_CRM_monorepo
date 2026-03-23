import { Button } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import type { RecentContractItem } from '../../../types/partnerRegistry';
import styles from './RecentContracts.module.scss';

interface RecentContractsProps {
  contracts: RecentContractItem[];
}

export default function RecentContracts({ contracts }: RecentContractsProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>Последние договоры</h3>
        <Button type='link' size='small' style={{ padding: 0 }}>
          Все договоры <RightOutlined />
        </Button>
      </div>

      {contracts.map((c, i) => (
        <div key={i} className={i < contracts.length - 1 ? styles.rowBorder : styles.row}>
          <div className={c.status === 'active' ? styles.dotActive : styles.dotCompleted} />
          <div className={styles.info}>
            <div className={styles.numRow}>
              <span className={styles.num}>{c.num}</span>
              <span className={styles.date}>{c.date}</span>
            </div>
            <div className={styles.subject}>{c.subject}</div>
          </div>
          <div className={styles.amount}>{c.amount}</div>
        </div>
      ))}
    </div>
  );
}
