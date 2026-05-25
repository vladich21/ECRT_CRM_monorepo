import {
  getDefaultExportColumnKeys,
  getExportColumnsByKeys,
  getExportExtraGroupsWithColumns,
  getExportMainColumns,
  loadExportColumnKeys,
  saveExportColumnKeys,
} from '../../../components/registryExport/registryExportColumnUtils';
import type {
  RegistryExportColumn,
  RegistryExportExtraGroup,
} from '../../../components/registryExport/registryExportTypes';

export type PatentExportColumnKey =
  | 'name'
  | 'registration_number'
  | 'registration_date'
  | 'registration_number_cir'
  | 'registration_date_cir'
  | 'application_number'
  | 'kd_number'
  | 'intellectprop'
  | 'status'
  | 'department'
  | 'contract'
  | 'contract_cipher'
  | 'project'
  | 'project_code'
  | 'expected_licensee'
  | 'responsible'
  | 'authors'
  | 'areas'
  | 'grants_count'
  | 'grants'
  | 'rid_cost_excl_vat'
  | 'rid_vat_rate'
  | 'rid_cost_vat'
  | 'rid_cost_incl_vat'
  | 'requests_earliest_deadline'
  | 'requests_response_required'
  | 'transformed_into_rid'
  | 'transformed_from_rid'
  | 'transformation_notification_ic_zht'
  | 'transformation_notification_cir'
  | 'is_deleted';

export type PatentExportColumn = RegistryExportColumn<PatentExportColumnKey>;
export type PatentExportExtraGroup = RegistryExportExtraGroup<PatentExportColumnKey>;

export const PATENT_EXPORT_COLUMNS: PatentExportColumn[] = [
  { key: 'name', label: 'Наименование РИД', defaultSelected: true },
  { key: 'registration_number', label: 'Рег. номер (ИЦ ЖТ)', defaultSelected: true },
  { key: 'registration_date', label: 'Дата регистрации (ИЦ ЖТ)', defaultSelected: false },
  { key: 'registration_number_cir', label: 'Рег. номер (ЦИР)', defaultSelected: false },
  { key: 'registration_date_cir', label: 'Дата регистрации (ЦИР)', defaultSelected: false },
  { key: 'application_number', label: 'Номер патентной заявки', defaultSelected: false },
  { key: 'kd_number', label: 'Номер КД', defaultSelected: true },
  { key: 'intellectprop', label: 'Объект ИС', defaultSelected: true },
  { key: 'status', label: 'Состояние', defaultSelected: true },
  { key: 'department', label: 'Подразделение', defaultSelected: false },
  { key: 'contract', label: 'Договор (доходный)', defaultSelected: true },
  { key: 'contract_cipher', label: 'Шифр договора', defaultSelected: false },
  { key: 'project', label: 'Проект', defaultSelected: true },
  { key: 'project_code', label: 'Номер проекта', defaultSelected: false },
  { key: 'expected_licensee', label: 'Предполагаемый лицензиат', defaultSelected: false },
  { key: 'responsible', label: 'Ответственный за патентование', defaultSelected: false },
  { key: 'authors', label: 'Исполнители', defaultSelected: false },
  { key: 'areas', label: 'Области применения', defaultSelected: false },
  { key: 'grants_count', label: 'Количество охранных документов', defaultSelected: false },
  { key: 'grants', label: 'Охранные документы', defaultSelected: false },
  { key: 'rid_cost_excl_vat', label: 'Стоимость РИД без НДС', defaultSelected: false },
  { key: 'rid_vat_rate', label: 'Ставка НДС, %', defaultSelected: false },
  { key: 'rid_cost_vat', label: 'Сумма НДС', defaultSelected: false },
  { key: 'rid_cost_incl_vat', label: 'Стоимость РИД с НДС', defaultSelected: false },
  { key: 'requests_earliest_deadline', label: 'Ближайший срок ответа на запрос', defaultSelected: false },
  { key: 'requests_response_required', label: 'Требуется ответ на запрос', defaultSelected: false },
  { key: 'transformed_into_rid', label: 'Преобразован в РИД (номер)', defaultSelected: false },
  { key: 'transformed_from_rid', label: 'Создано из РИД (номер)', defaultSelected: false },
  { key: 'transformation_notification_ic_zht', label: 'Уведомление о преобразовании (ИЦ ЖТ)', defaultSelected: false },
  { key: 'transformation_notification_cir', label: 'Уведомление о преобразовании (ЦИР)', defaultSelected: false },
  { key: 'is_deleted', label: 'Удален', defaultSelected: false },
];

export const PATENT_EXPORT_COLUMNS_STORAGE_KEY = 'patentsExportSelectedColumns';

export function getDefaultPatentExportColumnKeys(): PatentExportColumnKey[] {
  return getDefaultExportColumnKeys(PATENT_EXPORT_COLUMNS);
}

export function loadPatentExportColumnKeys(): PatentExportColumnKey[] {
  return loadExportColumnKeys(PATENT_EXPORT_COLUMNS, PATENT_EXPORT_COLUMNS_STORAGE_KEY);
}

export function savePatentExportColumnKeys(keys: PatentExportColumnKey[]): void {
  saveExportColumnKeys(PATENT_EXPORT_COLUMNS_STORAGE_KEY, keys);
}

export const PATENT_EXPORT_NUMERIC_COLUMN_KEYS = new Set<PatentExportColumnKey>([
  'grants_count',
  'rid_cost_excl_vat',
  'rid_vat_rate',
  'rid_cost_vat',
  'rid_cost_incl_vat',
]);

export const PATENT_EXPORT_CENTER_COLUMN_KEYS = new Set<PatentExportColumnKey>([
  'registration_date',
  'registration_date_cir',
  'requests_earliest_deadline',
  'requests_response_required',
  'is_deleted',
  'project_code',
  'kd_number',
  'registration_number',
  'registration_number_cir',
  'application_number',
]);

export const PATENT_EXPORT_MONEY_COLUMN_KEYS = new Set<PatentExportColumnKey>([
  'rid_cost_excl_vat',
  'rid_cost_vat',
  'rid_cost_incl_vat',
]);

export const PATENT_EXPORT_INTEGER_COLUMN_KEYS = new Set<PatentExportColumnKey>(['grants_count']);

export const PATENT_EXPORT_LONG_TEXT_COLUMN_KEYS = new Set<PatentExportColumnKey>([
  'name',
  'project',
  'authors',
  'areas',
  'grants',
  'transformation_notification_ic_zht',
  'transformation_notification_cir',
]);

export type PatentExportCellAlignment = 'left' | 'center' | 'right';

export function getPatentExportColumnAlignment(key: PatentExportColumnKey): PatentExportCellAlignment {
  if (PATENT_EXPORT_NUMERIC_COLUMN_KEYS.has(key)) return 'right';
  if (PATENT_EXPORT_CENTER_COLUMN_KEYS.has(key)) return 'center';
  return 'left';
}

export const PATENT_EXPORT_EXTRA_GROUPS: PatentExportExtraGroup[] = [
  {
    id: 'registration',
    title: 'Регистрационные данные',
    column: 0,
    keys: ['registration_date', 'registration_number_cir', 'registration_date_cir', 'application_number'],
  },
  {
    id: 'contract_project',
    title: 'Договор и проект',
    column: 0,
    keys: ['contract_cipher', 'project_code', 'expected_licensee'],
  },
  {
    id: 'finance',
    title: 'Финансы',
    column: 0,
    keys: ['rid_cost_excl_vat', 'rid_vat_rate', 'rid_cost_vat', 'rid_cost_incl_vat'],
  },
  {
    id: 'other',
    title: 'Прочее',
    column: 0,
    keys: ['is_deleted'],
  },
  {
    id: 'participants',
    title: 'Участники и классификация',
    column: 1,
    keys: ['department', 'responsible', 'authors', 'areas'],
  },
  {
    id: 'grants',
    title: 'Охранные документы',
    column: 1,
    keys: ['grants_count', 'grants'],
  },
  {
    id: 'requests',
    title: 'Запросы',
    column: 1,
    keys: ['requests_earliest_deadline', 'requests_response_required'],
  },
  {
    id: 'transformation',
    title: 'Преобразование РИД',
    column: 1,
    keys: [
      'transformed_into_rid',
      'transformed_from_rid',
      'transformation_notification_ic_zht',
      'transformation_notification_cir',
    ],
  },
];

export function getPatentExportColumnsByKeys(keys: PatentExportColumnKey[]): PatentExportColumn[] {
  return getExportColumnsByKeys(PATENT_EXPORT_COLUMNS, keys);
}

export function getPatentExportMainColumns(): PatentExportColumn[] {
  return getExportMainColumns(PATENT_EXPORT_COLUMNS);
}

export function getPatentExportExtraGroupsWithColumns(): Array<
  PatentExportExtraGroup & { columns: PatentExportColumn[] }
> {
  return getExportExtraGroupsWithColumns(PATENT_EXPORT_COLUMNS, PATENT_EXPORT_EXTRA_GROUPS);
}

export const PATENT_EXPORT_MODAL_CONFIG = {
  columns: PATENT_EXPORT_COLUMNS,
  extraGroups: PATENT_EXPORT_EXTRA_GROUPS,
  storageKey: PATENT_EXPORT_COLUMNS_STORAGE_KEY,
};

export const PATENT_EXPORT_EXCEL_OPTIONS = {
  sheetName: 'РИД',
  fileNamePrefix: 'reestr_rid',
  numericKeys: PATENT_EXPORT_NUMERIC_COLUMN_KEYS,
  centerKeys: PATENT_EXPORT_CENTER_COLUMN_KEYS,
  moneyKeys: PATENT_EXPORT_MONEY_COLUMN_KEYS,
  integerKeys: PATENT_EXPORT_INTEGER_COLUMN_KEYS,
  longTextKeys: PATENT_EXPORT_LONG_TEXT_COLUMN_KEYS,
  getAlignment: getPatentExportColumnAlignment,
  getNumericFormat: (key: PatentExportColumnKey): string | undefined => {
    if (PATENT_EXPORT_MONEY_COLUMN_KEYS.has(key)) return '#,##0.00';
    if (PATENT_EXPORT_INTEGER_COLUMN_KEYS.has(key)) return '#,##0';
    if (key === 'rid_vat_rate') return '0.##';
    return undefined;
  },
};
