/**
 * Единый источник правды для имен разделов системы.
 * В коде ссылаемся через SECTIONS.X, чтобы IDE могла найти все упоминания.
 *
 * Значения должны соответствовать ref_role_section_permissions.section_id →
 * sections.code (см. scripts/rbac/02_seed_data.sql).
 *
 * При добавлении нового раздела:
 *  1. Добавить запись в sections (DB) через миграцию или админку.
 *  2. Добавить константу здесь (и зеркальную на фронте).
 *  3. Применить в @RequirePermission на эндпоинтах.
 *  4. Применить в <CanAccess> / usePermissions на фронте.
 */
export const SECTIONS = {
  // Администрирование
  ADMIN_USERS: 'admin.users',
  ADMIN_ROLES: 'admin.roles',
  ADMIN_SECTIONS: 'admin.sections',
  ADMIN_IMPERSONATE: 'admin.impersonate',
  ADMIN_APPROVAL_ROUTES: 'admin.approval_routes',

  // Справочники
  REFERENCES_DEPARTMENTS: 'references.departments',
  REFERENCES_POSITIONS: 'references.positions',
  REFERENCES_COMPETENCIES: 'references.competencies',
  REFERENCES_PARTNER_TYPES: 'references.partner_types',
  REFERENCES_PARTNER_STATUSES: 'references.partner_statuses',
  REFERENCES_PARTNER_CATEGORIES: 'references.partner_categories',
  REFERENCES_PARTNER_ECONOMIC: 'references.partner_economic',
  REFERENCES_CONTRACT_TYPES: 'references.contract_types',
  REFERENCES_CONTRACT_STATES: 'references.contract_states',
  REFERENCES_PATENT_STATUSES: 'references.patent_statuses',
  REFERENCES_PATENT_AREAS: 'references.patent_areas',
  REFERENCES_EVALUATION_CRITERIA: 'references.evaluation_criteria',

  // Контрагенты
  PARTNERS_LIST: 'partners.list',
  PARTNERS_CONTACTS: 'partners.contacts',
  PARTNERS_EVALUATIONS: 'partners.evaluations',

  // Договоры
  CONTRACTS_LIST: 'contracts.list',
  CONTRACTS_STAGES: 'contracts.stages',
  CONTRACTS_REVISIONS: 'contracts.revisions',

  // Проекты
  PROJECTS_LIST: 'projects.list',
  PROJECTS_GANTT: 'projects.gantt',

  // Патенты
  PATENTS_LIST: 'patents.list',
  PATENTS_GRANTS: 'patents.grants',

  // Реестр ПО
  SW_STRUCTURE: 'sw.structure',
  SW_ITEMS: 'sw.items',
  SW_SUMMARY: 'sw.summary',
  SW_REFERENCES: 'sw.references',

  // Системные
  SYSTEM_FILES: 'system.files',
  SYSTEM_HR_SYNC: 'system.hr_sync',
  SYSTEM_PARTNER_SYNC: 'system.partner_sync',
} as const;

export type SectionCode = (typeof SECTIONS)[keyof typeof SECTIONS];
