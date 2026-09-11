import { PlusOutlined } from '@ant-design/icons';
import { Button, Divider, Select, Spin, Typography } from 'antd';

import type { PurchaseRequestSupplierCandidate } from '@/api/procurement/requests/procurementRequest.types';
import { CanAccess } from '@/components/canAccess/CanAccess';
import { SECTIONS } from '@/shared/permissions';

import { SupplierFlagTags, supplierWarningText } from './purchaseRequestSupplierFlags';
import styles from './PurchaseRequestSuppliers.module.scss';

type Props = {
  search: string;
  candidates: PurchaseRequestSupplierCandidate[];
  loading?: boolean;
  adding?: boolean;
  onSearch: (value: string) => void;
  onSelect: (partnerId: string) => void;
  onCreate: () => void;
};

export function PurchaseRequestCounterpartySelect({
  search,
  candidates,
  loading,
  adding,
  onSearch,
  onSelect,
  onCreate,
}: Props) {
  const typedEnough = search.trim().length >= 2;

  return (
    <Select
      className={styles.select}
      classNames={{ popup: { root: styles.popup } }}
      popupMatchSelectWidth={false}
      styles={{ popup: { root: { minWidth: 360, maxWidth: 'min(90vw, 960px)' } } }}
      placeholder='Выберите поставщика или введите ИНН'
      showSearch
      allowClear
      filterOption={false}
      value={null}
      searchValue={search}
      onSearch={onSearch}
      onSelect={value => {
        if (typeof value === 'string') onSelect(value);
      }}
      loading={loading || adding}
      options={candidates.map(candidate => ({
        value: candidate.partner_id,
        label: candidate.name,
        candidate,
      }))}
      optionRender={option => {
        const candidate = (option.data as { candidate?: PurchaseRequestSupplierCandidate }).candidate;
        if (!candidate) return option.label;
        const warning = supplierWarningText(candidate.flags);
        return (
          <div className={styles.option}>
            <span className={styles.optionName}>{candidate.name}</span>
            <div className={styles.optionMeta}>
              <span>ИНН {candidate.inn || '—'}</span>
              <SupplierFlagTags flags={candidate.flags} />
            </div>
            {warning ? <div className={styles.warning}>{warning}</div> : null}
          </div>
        );
      }}
      notFoundContent={
        loading ? (
          <Spin size='small' />
        ) : !typedEnough ? (
          <Typography.Text type='secondary' className={styles.emptyHint}>
            Введите название или ИНН
          </Typography.Text>
        ) : (
          <div className={styles.emptyHint}>
            Нет в реестре.{' '}
            <CanAccess section={SECTIONS.PARTNERS_LIST}>
              <Button
                type='link'
                onMouseDown={event => event.preventDefault()}
                onClick={onCreate}
              >
                Завести контрагента
              </Button>
            </CanAccess>
          </div>
        )
      }
      popupRender={menu => (
        <>
          {menu}
          <CanAccess section={SECTIONS.PARTNERS_LIST}>
            <Divider style={{ margin: '8px 0' }} />
            <Button
              type='link'
              icon={<PlusOutlined />}
              onMouseDown={event => event.preventDefault()}
              onClick={onCreate}
            >
              Завести контрагента
            </Button>
          </CanAccess>
        </>
      )}
    />
  );
}
