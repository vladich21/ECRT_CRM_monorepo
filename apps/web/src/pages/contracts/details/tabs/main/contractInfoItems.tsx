import { Typography } from 'antd';
import type { Contract } from '../../../../../types/contract';
import type { ReferenceData } from '../../../../../api/hooks/useReferences';
import { getEntityById } from '../../../../../helpers/getEntityById';
import { getNameById } from '../../../../../helpers/getNameById';
import { formatDate } from '../stages/data';
import { getContractStateTagClass } from '../../../utils/contractStateUtils';
import listStyles from '../../../list/ContractsListPage.module.scss';

const { Text } = Typography;

type MainInfoRefs = Partial<
  Pick<ReferenceData, 'partners' | 'projects' | 'users' | 'contractCategories' | 'contractTypes'>
>;

type AsideRefs = Partial<
  Pick<ReferenceData, 'partners' | 'users' | 'contractStates' | 'contractCategories'>
>;

/** Items for the main info Descriptions table in ContractMainInfoTab */
export function buildMainInfoItems(
  contract: Contract,
  refs: MainInfoRefs,
  formatDateValue: (d: string | null | undefined) => string
) {
  const categoryName = getNameById(contract.category_id, refs?.contractCategories ?? []);
  const typeName     = getNameById(contract.contract_type_id, refs?.contractTypes ?? []);

  return [
    // ── Стороны ──────────────────────────────────────────────────────────────
    {
      key: 'partner',
      label: 'Партнёр',
      children: getNameById(contract.partner_id, refs?.partners ?? []) || '-',
    },
    {
      key: 'responsible',
      label: 'Ответственный',
      children: getNameById(contract.responsible_id, refs?.users ?? []) || '-',
    },
    {
      key: 'project',
      label: 'Проект',
      children: getNameById(contract.project_id, refs?.projects ?? []) || '-',
    },
    // ── Классификация ─────────────────────────────────────────────────────────
    {
      key: 'category',
      label: 'Категория',
      children: categoryName
        ? <span className={listStyles.cardCategory}>{categoryName}</span>
        : '-',
    },
    {
      key: 'type',
      label: 'Тип',
      children: typeName || '-',
    },
    // ── Условия ───────────────────────────────────────────────────────────────
    {
      key: 'date_signed',
      label: 'Дата подписания',
      children: formatDateValue(contract.date_signed),
    },
  ];
}

/** Items for the contract details Descriptions table in ContractDetailsAside */
export function buildDetailItems(contract: Contract, refs: AsideRefs) {
  const state = getEntityById(contract.state_id, refs?.contractStates);
  const categoryName = getNameById(contract.category_id, refs?.contractCategories ?? []);

  return [
    {
      key: 'number',
      label: 'Номер',
      children: `№${contract.number || '—'}`,
    },
    {
      key: 'cipher',
      label: 'Шифр',
      children: <Text code>{contract.cipher || '—'}</Text>,
    },
    {
      key: 'category',
      label: 'Категория',
      children: categoryName
        ? <span className={listStyles.cardCategory}>{categoryName}</span>
        : '—',
    },
    {
      key: 'status',
      label: 'Статус',
      children: (
        <span
          className={
            contract.is_active ? listStyles.tagStatusActive : listStyles.tagStatusInactive
          }
        >
          {contract.is_active ? 'Действует' : 'Не действует'}
        </span>
      ),
    },
    {
      key: 'state',
      label: 'Состояние',
      children: state ? (
        <span
          className={
            listStyles[getContractStateTagClass(state.code) as keyof typeof listStyles]
          }
        >
          {state.name}
        </span>
      ) : '—',
    },
    { key: 'signed', label: 'Подписан', children: formatDate(contract.date_signed) },
    { key: 'start',  label: 'Начало',   children: formatDate(contract.start_date) },
    { key: 'end',    label: 'Окончание', children: formatDate(contract.end_date) },
  ];
}
