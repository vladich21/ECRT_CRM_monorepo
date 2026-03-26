import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

import styles from './ComplianceCards.module.scss';

export interface ComplianceItem {
  label: string;
  done: boolean;
  note: string;
}

interface ComplianceCardsProps {
  items: ComplianceItem[];
  compact?: boolean;
  embedded?: boolean;
}

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export default function ComplianceCards({ items, compact, embedded }: ComplianceCardsProps) {
  return (
    <div className={cn(embedded ? styles.embeddedRoot : styles.wrapper, !embedded && compact && styles.wrapperCompact)}>
      <h3 className={cn(styles.title, compact && styles.titleCompact)}>Статусы и соответствие</h3>
      <div className={styles.row}>
        {items.map((item, i) => (
          <div key={i} className={cn(styles.cell, compact && styles.cellCompact)}>
            <div
              className={cn(
                styles.iconCircle,
                compact && styles.iconCircleCompact,
                item.done ? styles.iconCircleOk : styles.iconCircleBad,
              )}
            >
              {item.done ? <CheckOutlined /> : <CloseOutlined />}
            </div>
            <div className={cn(styles.cellLabel, compact && styles.cellLabelCompact)}>{item.label}</div>
            <div className={cn(item.done ? styles.cellValueOk : styles.cellValueBad, compact && styles.cellValueCompact)}>
              {item.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
