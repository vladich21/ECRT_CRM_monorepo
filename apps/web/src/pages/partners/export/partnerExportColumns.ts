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

export type PartnerExportColumnKey =
  | 'display_name'
  | 'inn'
  | 'status'
  | 'category'
  | 'types'
  | 'is_approved'
  | 'phone'
  | 'name'
  | 'short_name'
  | 'kpp'
  | 'ogrn'
  | 'legal_address'
  | 'actual_address'
  | 'email'
  | 'website'
  | 'competences'
  | 'economic_category'
  | 'is_key_supplier'
  | 'is_targeted'
  | 'legal_check_passed'
  | 'questionnaire_filled'
  | 'initial_assessment_done'
  | 'evaluation_required'
  | 'has_active_evaluation_block'
  | 'comment'
  | 'created_at'
  | 'updated_at'
  | 'is_deleted'
  | 'contacts_summary'
  | 'primary_contact_name'
  | 'primary_contact_position'
  | 'primary_contact_phone'
  | 'primary_contact_email'
  | 'contracts_summary'
  | 'contracts_count'
  | 'legal_verification_files'
  | 'questionnaire_files'
  | 'partner_files'
  | 'avg_project_score'
  | 'next_reevaluation_date'
  | 'initial_evaluation_score'
  | 'blocked_projects_count';

export type PartnerExportColumn = RegistryExportColumn<PartnerExportColumnKey>;
export type PartnerExportExtraGroup = RegistryExportExtraGroup<PartnerExportColumnKey>;

export const PARTNER_EXPORT_COLUMNS: PartnerExportColumn[] = [
  { key: 'display_name', label: 'Наименование', defaultSelected: true },
  { key: 'inn', label: 'ИНН', defaultSelected: true },
  { key: 'status', label: 'Статус', defaultSelected: true },
  { key: 'category', label: 'Категория', defaultSelected: true },
  { key: 'types', label: 'Тип контрагента', defaultSelected: true },
  { key: 'is_approved', label: 'Утвержден', defaultSelected: true },
  { key: 'phone', label: 'Телефон', defaultSelected: true },
  { key: 'name', label: 'Полное наименование', defaultSelected: false },
  { key: 'short_name', label: 'Краткое наименование', defaultSelected: false },
  { key: 'kpp', label: 'КПП', defaultSelected: false },
  { key: 'ogrn', label: 'ОГРН', defaultSelected: false },
  { key: 'legal_address', label: 'Юридический адрес', defaultSelected: false },
  { key: 'actual_address', label: 'Фактический адрес', defaultSelected: false },
  { key: 'email', label: 'Email', defaultSelected: false },
  { key: 'website', label: 'Сайт', defaultSelected: false },
  { key: 'competences', label: 'Компетенции', defaultSelected: false },
  { key: 'economic_category', label: 'Экономическая группа', defaultSelected: false },
  { key: 'is_key_supplier', label: 'Ключевой поставщик', defaultSelected: false },
  { key: 'is_targeted', label: 'Целевой поставщик', defaultSelected: false },
  { key: 'legal_check_passed', label: 'Юридическая проверка', defaultSelected: false },
  { key: 'questionnaire_filled', label: 'Анкета', defaultSelected: false },
  { key: 'initial_assessment_done', label: 'Первичная оценка', defaultSelected: false },
  { key: 'evaluation_required', label: 'Требуется оценка', defaultSelected: false },
  { key: 'has_active_evaluation_block', label: 'Есть блокировки', defaultSelected: false },
  { key: 'comment', label: 'Комментарий', defaultSelected: false },
  { key: 'created_at', label: 'Дата создания', defaultSelected: false },
  { key: 'updated_at', label: 'Дата изменения', defaultSelected: false },
  { key: 'is_deleted', label: 'Удален', defaultSelected: false },
  { key: 'contacts_summary', label: 'Контактные лица', defaultSelected: false },
  { key: 'primary_contact_name', label: 'ФИО', exportLabel: 'Основной контакт, ФИО', defaultSelected: false },
  {
    key: 'primary_contact_position',
    label: 'Должность',
    exportLabel: 'Основной контакт, Должность',
    defaultSelected: false,
  },
  { key: 'primary_contact_phone', label: 'Телефон', exportLabel: 'Основной контакт, Телефон', defaultSelected: false },
  { key: 'primary_contact_email', label: 'Email', exportLabel: 'Основной контакт, Email', defaultSelected: false },
  { key: 'contracts_summary', label: 'Договоры', defaultSelected: false },
  { key: 'contracts_count', label: 'Количество договоров', defaultSelected: false },
  { key: 'legal_verification_files', label: 'Файлы юридической проверки', defaultSelected: false },
  { key: 'questionnaire_files', label: 'Файлы анкетирования', defaultSelected: false },
  { key: 'partner_files', label: 'Файлы', defaultSelected: false },
  { key: 'avg_project_score', label: 'Оценка по проектам', defaultSelected: false },
  { key: 'next_reevaluation_date', label: 'Следующая оценка', defaultSelected: false },
  { key: 'initial_evaluation_score', label: 'Балл первичной оценки', defaultSelected: false },
  { key: 'blocked_projects_count', label: 'Заблокированные проекты', defaultSelected: false },
];

export const PARTNER_EXPORT_COLUMNS_STORAGE_KEY = 'partnersExportSelectedColumns';

export function getDefaultPartnerExportColumnKeys(): PartnerExportColumnKey[] {
  return getDefaultExportColumnKeys(PARTNER_EXPORT_COLUMNS);
}

export function loadPartnerExportColumnKeys(): PartnerExportColumnKey[] {
  return loadExportColumnKeys(PARTNER_EXPORT_COLUMNS, PARTNER_EXPORT_COLUMNS_STORAGE_KEY);
}

export function savePartnerExportColumnKeys(keys: PartnerExportColumnKey[]): void {
  saveExportColumnKeys(PARTNER_EXPORT_COLUMNS_STORAGE_KEY, keys);
}

export const PARTNER_EXPORT_CENTER_COLUMN_KEYS = new Set<PartnerExportColumnKey>([
  'inn',
  'kpp',
  'ogrn',
  'is_approved',
  'is_key_supplier',
  'is_targeted',
  'legal_check_passed',
  'questionnaire_filled',
  'initial_assessment_done',
  'evaluation_required',
  'has_active_evaluation_block',
  'is_deleted',
  'created_at',
  'updated_at',
  'contracts_count',
  'blocked_projects_count',
  'next_reevaluation_date',
]);

export const PARTNER_EXPORT_NUMERIC_COLUMN_KEYS = new Set<PartnerExportColumnKey>([
  'avg_project_score',
  'initial_evaluation_score',
  'contracts_count',
  'blocked_projects_count',
]);

export const PARTNER_EXPORT_LONG_TEXT_COLUMN_KEYS = new Set<PartnerExportColumnKey>([
  'display_name',
  'name',
  'short_name',
  'legal_address',
  'actual_address',
  'comment',
  'types',
  'competences',
  'contacts_summary',
  'contracts_summary',
  'legal_verification_files',
  'questionnaire_files',
  'partner_files',
]);

export function getPartnerExportColumnAlignment(key: PartnerExportColumnKey): 'left' | 'center' | 'right' {
  if (PARTNER_EXPORT_NUMERIC_COLUMN_KEYS.has(key)) return 'right';
  if (PARTNER_EXPORT_CENTER_COLUMN_KEYS.has(key)) return 'center';
  return 'left';
}

export const PARTNER_EXPORT_EXTRA_GROUPS: PartnerExportExtraGroup[] = [
  {
    id: 'identification',
    title: 'Реквизиты и адреса',
    column: 0,
    keys: ['name', 'short_name', 'kpp', 'ogrn', 'legal_address', 'actual_address'],
  },
  {
    id: 'classification',
    title: 'Классификация',
    column: 0,
    keys: ['competences', 'economic_category', 'is_key_supplier', 'is_targeted'],
  },
  {
    id: 'contracts',
    title: 'Договоры',
    column: 0,
    keys: ['contracts_summary', 'contracts_count'],
  },
  {
    id: 'evaluations',
    title: 'Оценки',
    column: 0,
    keys: ['avg_project_score', 'next_reevaluation_date', 'initial_evaluation_score', 'blocked_projects_count'],
  },
  {
    id: 'contacts',
    title: 'Контакты',
    column: 1,
    sections: [
      {
        keys: ['email', 'website', 'contacts_summary'],
        layout: 'row',
      },
      {
        title: 'Основной контакт',
        keys: ['primary_contact_name', 'primary_contact_position', 'primary_contact_phone', 'primary_contact_email'],
        layout: 'split',
      },
    ],
  },
  {
    id: 'compliance',
    title: 'Статусы и соответствие',
    column: 1,
    keys: [
      'legal_check_passed',
      'questionnaire_filled',
      'initial_assessment_done',
      'evaluation_required',
      'has_active_evaluation_block',
      'legal_verification_files',
      'questionnaire_files',
      'partner_files',
    ],
  },
  {
    id: 'other',
    title: 'Прочее',
    column: 1,
    keys: ['comment', 'created_at', 'updated_at', 'is_deleted'],
  },
];

export function getPartnerExportColumnsByKeys(keys: PartnerExportColumnKey[]): PartnerExportColumn[] {
  return getExportColumnsByKeys(PARTNER_EXPORT_COLUMNS, keys);
}

export function getPartnerExportMainColumns(): PartnerExportColumn[] {
  return getExportMainColumns(PARTNER_EXPORT_COLUMNS);
}

export function getPartnerExportExtraGroupsWithColumns(): Array<
  PartnerExportExtraGroup & { columns: PartnerExportColumn[] }
> {
  return getExportExtraGroupsWithColumns(PARTNER_EXPORT_COLUMNS, PARTNER_EXPORT_EXTRA_GROUPS);
}

export const PARTNER_EXPORT_MODAL_CONFIG = {
  columns: PARTNER_EXPORT_COLUMNS,
  extraGroups: PARTNER_EXPORT_EXTRA_GROUPS,
  storageKey: PARTNER_EXPORT_COLUMNS_STORAGE_KEY,
};

export const PARTNER_EXPORT_HYPERLINK_COLUMN_KEYS = new Set<PartnerExportColumnKey>([
  'legal_verification_files',
  'questionnaire_files',
  'partner_files',
]);

export const PARTNER_EXPORT_EXCEL_OPTIONS = {
  sheetName: 'Контрагенты',
  fileNamePrefix: 'reestr_kontragentov',
  numericKeys: PARTNER_EXPORT_NUMERIC_COLUMN_KEYS,
  centerKeys: PARTNER_EXPORT_CENTER_COLUMN_KEYS,
  longTextKeys: PARTNER_EXPORT_LONG_TEXT_COLUMN_KEYS,
  hyperlinkKeys: PARTNER_EXPORT_HYPERLINK_COLUMN_KEYS,
  getAlignment: getPartnerExportColumnAlignment,
  getNumericFormat: (key: PartnerExportColumnKey): string | undefined => {
    if (key === 'avg_project_score' || key === 'initial_evaluation_score') return '0.00';
    if (key === 'contracts_count' || key === 'blocked_projects_count') return '#,##0';
    return undefined;
  },
};
