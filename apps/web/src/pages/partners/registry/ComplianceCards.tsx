import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import styles from './ComplianceCards.module.scss';

export interface ComplianceItem {
  label: string;
  done: boolean;
  note: string;
}

interface ComplianceCardsProps {
  items: ComplianceItem[];
}

export default function ComplianceCards({ items }: ComplianceCardsProps) {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Статусы и соответствие</h3>
      <div className={styles.row}>
        {items.map((item, i) => (
          <div key={i} className={styles.item}>
            {item.done ? (
              <CheckCircleFilled style={{ color: '#52c41a', fontSize: 14 }} />
            ) : (
              <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 14 }} />
            )}
            <span className={styles.label}>{item.label}</span>
            <span className={item.done ? styles.valueDone : styles.valuePending}>{item.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
