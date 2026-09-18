import { formatSwStatusLabel } from './swStatusBadge';
import styles from './SwStatusBadge.module.scss';

/** Оттенок бейджа по коду статуса; неизвестный код показываем нейтральным. */
const STATUS_CLASS: Record<string, string> = {
  development: styles.statusDevelopment,
  in_approval: styles.statusInApproval,
  agreed: styles.statusAgreed,
  approved: styles.statusApproved,
  revision: styles.statusRevision,
  received: styles.statusReceived,
  accepted: styles.statusAccepted,
  in_rework: styles.statusInRework,
  issued: styles.statusIssued,
  cancelled: styles.statusCancelled,
  in_ips: styles.statusInIps,
};

type Props = {
  statusCode: string;
  /** Подпись из справочника; без неё показываем сам код. */
  label?: string;
  /** Со сменой статуса бейдж становится кнопкой. */
  onClick?: () => void;
};

/**
 * Состояние документа, листа утверждения или размещения в IPS.
 * Раньше классы бейджа лежали копиями в модулях таблицы, панели и окна IPS,
 * а выбор оттенка шёл через функцию с модулем стилей в аргументе.
 */
export function SwStatusBadge({ statusCode, label, onClick }: Props) {
  const content = (
    <span className={[styles.statusBadge, STATUS_CLASS[statusCode] ?? styles.statusDefault].join(' ')}>
      {formatSwStatusLabel(label, statusCode)}
    </span>
  );
  if (!onClick) return content;
  return (
    <button type='button' className={styles.statusBadgeBtn} onClick={onClick}>
      {content}
    </button>
  );
}
