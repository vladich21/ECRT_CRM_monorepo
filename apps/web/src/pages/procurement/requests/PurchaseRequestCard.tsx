import { CalendarOutlined, DollarOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

import type { PurchaseRequestListRow } from '@/api/procurement/requests/procurementRequestApi';

import type { PurchaseRequestListColumnKey } from './purchaseRequestListColumns';
import {
  formatPurchaseRequestAmount,
  formatPurchaseRequestDate,
  purchaseRequestStatusLabel,
  purchaseRequestStatusTagColor,
} from './purchaseRequestLabels';
import styles from './PurchaseRequestsListPage.module.scss';

type Props = {
  request: PurchaseRequestListRow;
  visibleColumns: ReadonlySet<PurchaseRequestListColumnKey>;
  onClick: (id: string) => void;
};

export function PurchaseRequestCard({ request, visibleColumns, onClick }: Props) {
  return (
    <div
      className={styles.card}
      data-danger-stripe={request.is_urgent || undefined}
      onClick={() => onClick(request.id)}
    >
      <div className={styles.mainInfo}>
        <div className={styles.cardHeading}>
          <span className={styles.number}>№ {request.number}</span>
          {request.subject}
        </div>
        <div className={styles.metaRow}>
          {visibleColumns.has('status') ? (
            <Tag color={purchaseRequestStatusTagColor(request.status)}>
              {purchaseRequestStatusLabel(request.status)}
            </Tag>
          ) : null}
          {request.is_urgent ? <Tag color='error'>Срочно</Tag> : null}
          {visibleColumns.has('project') && request.project_name ? (
            <Tag className={styles.chip} bordered>
              {request.project_name}
            </Tag>
          ) : null}
        </div>
        {visibleColumns.has('initiator') && request.initiator_name ? (
          <div className={styles.metaText}>
            <UserOutlined />
            {request.initiator_name}
          </div>
        ) : null}
        {visibleColumns.has('lead') && request.lead_manager_name ? (
          <div className={styles.metaText}>
            <UserOutlined />
            {request.lead_manager_name}
          </div>
        ) : null}
      </div>

      <div className={styles.metricsCol}>
        {visibleColumns.has('amount') ? (
          <div className={styles.statValue}>
            <DollarOutlined />
            {formatPurchaseRequestAmount(request.amount, request.currency_code)}
          </div>
        ) : null}
        {visibleColumns.has('request_date') ? (
          <div className={styles.statLabel}>
            <CalendarOutlined />
            {formatPurchaseRequestDate(request.request_date)}
          </div>
        ) : null}
      </div>

      <div className={styles.activityCol}>
        <RightOutlined className={styles.arrow} />
      </div>
    </div>
  );
}
