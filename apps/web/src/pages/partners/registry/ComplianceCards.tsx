import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

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
          <div key={i} className={styles.cell}>
            <div className={`${styles.iconCircle} ${item.done ? styles.iconCircleOk : styles.iconCircleBad}`}>
              {item.done ? <CheckOutlined /> : <CloseOutlined />}
            </div>
            <div className={styles.cellLabel}>{item.label}</div>
            <div className={item.done ? styles.cellValueOk : styles.cellValueBad}>{item.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
