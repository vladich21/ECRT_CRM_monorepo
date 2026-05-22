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

export type PatentExportColumn = {
  key: PatentExportColumnKey;
  label: string;
  defaultSelected: boolean;
};

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
  return PATENT_EXPORT_COLUMNS.filter(column => column.defaultSelected).map(column => column.key);
}

export function loadPatentExportColumnKeys(): PatentExportColumnKey[] {
  try {
    const raw = localStorage.getItem(PATENT_EXPORT_COLUMNS_STORAGE_KEY);
    if (!raw) return getDefaultPatentExportColumnKeys();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return getDefaultPatentExportColumnKeys();
    const allowed = new Set(PATENT_EXPORT_COLUMNS.map(column => column.key));
    const keys = parsed.filter(
      (key): key is PatentExportColumnKey => typeof key === 'string' && allowed.has(key as PatentExportColumnKey),
    );
    return keys.length > 0 ? keys : getDefaultPatentExportColumnKeys();
  } catch {
    return getDefaultPatentExportColumnKeys();
  }
}

export function savePatentExportColumnKeys(keys: PatentExportColumnKey[]): void {
  localStorage.setItem(PATENT_EXPORT_COLUMNS_STORAGE_KEY, JSON.stringify(keys));
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

export type PatentExportCellAlignment = 'left' | 'center' | 'right';

export function getPatentExportColumnAlignment(key: PatentExportColumnKey): PatentExportCellAlignment {
  if (PATENT_EXPORT_NUMERIC_COLUMN_KEYS.has(key)) return 'right';
  if (PATENT_EXPORT_CENTER_COLUMN_KEYS.has(key)) return 'center';
  return 'left';
}

export type PatentExportExtraGroup = {
  id: string;
  title: string;
  keys: PatentExportColumnKey[];
};

export const PATENT_EXPORT_EXTRA_GROUPS: PatentExportExtraGroup[] = [
  {
    id: 'registration',
    title: 'Регистрационные данные',
    keys: ['registration_date', 'registration_number_cir', 'registration_date_cir', 'application_number'],
  },
  {
    id: 'contract_project',
    title: 'Договор и проект',
    keys: ['contract_cipher', 'project_code', 'expected_licensee'],
  },
  {
    id: 'participants',
    title: 'Участники и классификация',
    keys: ['department', 'responsible', 'authors', 'areas'],
  },
  {
    id: 'grants',
    title: 'Охранные документы',
    keys: ['grants_count', 'grants'],
  },
  {
    id: 'finance',
    title: 'Финансы',
    keys: ['rid_cost_excl_vat', 'rid_vat_rate', 'rid_cost_vat', 'rid_cost_incl_vat'],
  },
  {
    id: 'requests',
    title: 'Запросы',
    keys: ['requests_earliest_deadline', 'requests_response_required'],
  },
  {
    id: 'transformation',
    title: 'Преобразование РИД',
    keys: [
      'transformed_into_rid',
      'transformed_from_rid',
      'transformation_notification_ic_zht',
      'transformation_notification_cir',
    ],
  },
  {
    id: 'other',
    title: 'Прочее',
    keys: ['is_deleted'],
  },
];

const PATENT_EXPORT_COLUMN_BY_KEY = new Map(PATENT_EXPORT_COLUMNS.map(column => [column.key, column]));

export function getPatentExportColumnsByKeys(keys: PatentExportColumnKey[]): PatentExportColumn[] {
  return keys.map(key => PATENT_EXPORT_COLUMN_BY_KEY.get(key)).filter((column): column is PatentExportColumn => column != null);
}

export function getPatentExportMainColumns(): PatentExportColumn[] {
  return PATENT_EXPORT_COLUMNS.filter(column => column.defaultSelected);
}

export function getPatentExportExtraGroupsWithColumns(): Array<PatentExportExtraGroup & { columns: PatentExportColumn[] }> {
  return PATENT_EXPORT_EXTRA_GROUPS.map(group => ({
    ...group,
    columns: getPatentExportColumnsByKeys(group.keys),
  })).filter(group => group.columns.length > 0);
}

