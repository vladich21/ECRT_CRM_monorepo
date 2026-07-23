import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
  date,
  numeric,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalUserId: uuid('external_user_id'),
    personnelNumber: varchar('personnel_number', { length: 32 }),
    hiredAt: date('hired_at'),
    quitDate: date('quit_date'),
    internalPhone: varchar('internal_phone', { length: 32 }),
    avatarUrl: text('avatar_url'),
    supervisorId: uuid('supervisor_id'),
    passwordHash: varchar('password_hash', { length: 255 }),
    mustChangePassword: boolean('must_change_password').default(false),
    twoFactorEnabled: boolean('two_factor_enabled').default(false),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    lastName: varchar('last_name', { length: 50 }),
    firstName: varchar('first_name', { length: 50 }),
    middleName: varchar('middle_name', { length: 50 }),
    email: varchar('email', { length: 100 }),
    phone: varchar('phone', { length: 20 }),
    departmentId: uuid('department_id'),
    positionId: uuid('position_id'),
    isActive: boolean('is_active').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('users_email_idx').on(t.email),
    uniqueIndex('users_external_user_id_uidx').on(t.externalUserId),
  ],
);

export const authCodes = pgTable(
  'auth_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    codeHash: varchar('code_hash', { length: 255 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(), // 'temp_password' | '2fa'
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('auth_codes_user_type_idx').on(t.userId, t.type, t.createdAt)],
);

export const relUsersGroups = pgTable('rel_users_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  groupId: uuid('group_id').notNull(),
});

export const departments = pgTable(
  'departments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }),
    /** UUID отдела во внешнем HR; для upsert при hr-sync */
    externalHrId: uuid('external_hr_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (t) => [uniqueIndex('departments_external_hr_id_uidx').on(t.externalHrId)],
);

export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  number: varchar('number', { length: 255 }),
  cipher: varchar('cipher', { length: 255 }),
  dateSigned: date('date_signed'),
  partnerId: uuid('partner_id'),
  description: text('description'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  amountExclVat: numeric('amount_excl_vat', { precision: 19, scale: 2 }),
  vatRate: numeric('vat_rate', { precision: 5, scale: 2 }),
  amountVat: numeric('amount_vat', { precision: 19, scale: 2 }),
  amountInclVat: numeric('amount_incl_vat', { precision: 19, scale: 2 }),
  categoryId: uuid('category_id'),
  responsibleId: uuid('responsible_id'),
  supplierManagerId: uuid('supplier_manager_id'),
  projectId: uuid('project_id'),
  isActive: boolean('is_active').notNull().default(true),
  stateId: uuid('state_id').notNull(),
  contractTypeId: uuid('contract_type_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  isDeleted: boolean('is_deleted').notNull().default(false),
});

export const contractStages = pgTable('contract_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  stageNumber: integer('stage_number').notNull().default(1),
  responsibleId: uuid('responsible_id'),
  stateId: uuid('state_id'),
  plannedStartDate: date('planned_start_date'),
  plannedEndDate: date('planned_end_date'),
  actualStartDate: date('actual_start_date'),
  actualEndDate: date('actual_end_date'),
  plannedBudget: numeric('planned_budget', { precision: 19, scale: 2 }).notNull().default('0'),
  forecastedBudget: numeric('forecasted_budget', { precision: 19, scale: 2 }).notNull().default('0'),
  actualBudget: numeric('actual_budget', { precision: 19, scale: 2 }).notNull().default('0'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const positions = pgTable(
  'positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }),
    /** UUID должности во внешнем HR; для upsert при hr-sync */
    externalHrId: uuid('external_hr_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (t) => [uniqueIndex('positions_external_hr_id_uidx').on(t.externalHrId)],
);

export const refGroups = pgTable('ref_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

/**
 * RBAC: роль. Назначается пользователю через relUsersRoles. Права роли
 * описываются через relRoleSectionPermissions.
 */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('roles_code_uidx').on(t.code),
    index('roles_active_idx').on(t.isActive),
  ],
);

/**
 * RBAC: раздел системы. Имеет уникальный код (admin.users, partners.list).
 * is_folder = true для группирующих узлов в UI-дереве (без прав).
 */
export const sections = pgTable(
  'sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    parentId: uuid('parent_id'),
    isFolder: boolean('is_folder').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('sections_code_uidx').on(t.code),
    index('sections_parent_idx').on(t.parentId),
  ],
);

/**
 * RBAC: связка пользователь ↔ роль (M:N).
 * Права суммируются через BOOL_OR при наличии нескольких ролей.
 */
export const relUsersRoles = pgTable(
  'rel_users_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    roleId: uuid('role_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('rel_users_roles_user_role_uidx').on(t.userId, t.roleId),
    index('rel_users_roles_user_idx').on(t.userId),
    index('rel_users_roles_role_idx').on(t.roleId),
  ],
);

/**
 * RBAC: права роли на раздел. Три булевых флага.
 * Зависимости (валидируются на бэке): delete → edit → read.
 */
export const relRoleSectionPermissions = pgTable(
  'rel_role_section_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id').notNull(),
    sectionId: uuid('section_id').notNull(),
    canRead: boolean('can_read').notNull().default(false),
    canEdit: boolean('can_edit').notNull().default(false),
    canDelete: boolean('can_delete').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('rel_rsp_role_section_uidx').on(t.roleId, t.sectionId),
    index('rel_rsp_role_idx').on(t.roleId),
    index('rel_rsp_section_idx').on(t.sectionId),
  ],
);

export const refContractStates = pgTable('ref_contract_states', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const refContractCategories = pgTable('ref_contract_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const refContractTypes = pgTable('ref_contract_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 255 }),
  name: varchar('name', { length: 255 }),
  shortName: varchar('short_name', { length: 255 }),
  description: text('description'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  managerId: uuid('manager_id'),
  purchaserId: uuid('purchaser_id'),
  status: varchar('status', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  isDeleted: boolean('is_deleted').notNull().default(false),
});

export const refPatentStatuses = pgTable('ref_patent_statuses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const refIntellectualPropertyTypes = pgTable('ref_intellectual_property_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const refPatentApplicationAreas = pgTable('ref_patent_application_areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  code: varchar('code', { length: 50 }),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const relPatentsApplicationAreas = pgTable('rel_patents_application_areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  patentId: uuid('patent_id'),
  areaId: uuid('area_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const patents = pgTable('patents', {
  id: uuid('id').primaryKey().defaultRandom(),
  registrationNumber: varchar('registration_number', { length: 255 }),
  registrationDate: date('registration_date'),
  registrationNumberCir: varchar('registration_number_cir', { length: 255 }),
  registrationDateCir: date('registration_date_cir'),
  applicationNumber: varchar('application_number', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  departmentId: uuid('department_id').notNull(),
  contractId: uuid('contract_id'),
  ridCostExclVat: numeric('rid_cost_excl_vat', { precision: 19, scale: 2 }),
  ridVatRate: numeric('rid_vat_rate', { precision: 5, scale: 2 }),
  ridCostVat: numeric('rid_cost_vat', { precision: 19, scale: 2 }),
  ridCostInclVat: numeric('rid_cost_incl_vat', { precision: 19, scale: 2 }),
  projectId: uuid('project_id'),
  kdNumber: varchar('kd_number', { length: 255 }),
  intellectualPropertyTypeId: uuid('intellectual_property_type_id'),
  intellectpropId: uuid('intellectprop_id'),
  statusId: uuid('status_id'),
  responsibleForPatentId: uuid('responsible_for_patenting_id'),
  /** РИД, в который оформлено преобразование (статус «Преобразование»). */
  transformedIntoPatentId: uuid('transformed_into_patent_id'),
  /** Обратная ссылка: исходный РИД, из которого пришло преобразование. */
  transformedFromPatentId: uuid('transformed_from_patent_id'),
  transformationNotificationIcZht: varchar('transformation_notification_ic_zht', { length: 255 }),
  transformationNotificationCir: varchar('transformation_notification_cir', { length: 255 }),
  /** Решение о выдаче отмечено без файла в разделе «Положительное». */
  decisionPositiveMarked: boolean('decision_positive_marked').notNull().default(false),
  /** Отказ в выдаче отмечен без файла в разделе «Отрицательное». */
  decisionNegativeMarked: boolean('decision_negative_marked').notNull().default(false),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const patentGrants = pgTable('patent_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  patentId: uuid('patent_id'),
  grantNumber: varchar('grant_number', { length: 255 }),
  grantDate: date('grant_date'),
  office: varchar('office', { length: 255 }),
  status: varchar('status', { length: 50 }),
  renewalDate: date('renewal_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const relPatentGrantExpectedLicensees = pgTable('rel_patent_grants_expected_licensees', {
  id: uuid('id').primaryKey().defaultRandom(),
  patentGrantId: uuid('patent_grant_id'),
  partnerId: uuid('partner_id'),
  name: varchar('name', { length: 255 }),
  inn: varchar('inn', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const relPatentGrantActualLicensees = pgTable('rel_patent_grants_actual_licensees', {
  id: uuid('id').primaryKey().defaultRandom(),
  patentGrantId: uuid('patent_grant_id'),
  partnerId: uuid('partner_id'),
  name: varchar('name', { length: 255 }),
  inn: varchar('inn', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const relPatentsExpectedLicensees = pgTable('rel_patents_expected_licensees', {
  id: uuid('id').primaryKey().defaultRandom(),
  patentId: uuid('patent_id'),
  partnerId: uuid('partner_id'),
  name: varchar('name', { length: 255 }),
  inn: varchar('inn', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const relPatentAuthors = pgTable('rel_patents_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  patentId: uuid('patent_id'),
  userId: uuid('user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const refPartnerCategories = pgTable('ref_partner_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const refPartnerStatuses = pgTable('ref_partner_statuses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const refPartnerTypes = pgTable('ref_partner_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const refPartnerCompetencies = pgTable('ref_partner_competencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const refPartnerEconomicCategories = pgTable('ref_partner_economic_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  code: varchar('code', { length: 50 }),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const relPartnersTypes = pgTable('rel_partners_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id'),
  typeId: uuid('type_id'),
});

export const relPartnersCompetencies = pgTable('rel_partners_competencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id'),
  competenceId: uuid('competence_id'),
});

export const partnerContacts = pgTable('partner_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id'),
  fullName: varchar('full_name', { length: 255 }),
  position: varchar('position', { length: 255 }),
  phone: varchar('phone', { length: 255 }),
  phoneExt: varchar('phone_ext', { length: 12 }),
  email: varchar('email', { length: 255 }),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const partnerContactPhones = pgTable('partner_contact_phones', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id'),
  phone: varchar('phone', { length: 255 }),
  phoneExt: varchar('phone_ext', { length: 12 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: varchar('entitytype', { length: 255 }).notNull(),
    tableId: uuid('table_id'),
    name: varchar('name', { length: 255 }).notNull(),
    /** Для патентов: application | consent | notification | requests | decision_positive | decision_negative */
    documentSection: varchar('document_section', { length: 32 }).notNull().default('default'),
    type: varchar('type', { length: 255 }).notNull(),
    size: integer('size'),
    uploadedById: uuid('uploadedby_id'),
    /** Для раздела «Запросы» у патентов: нужен ли ответ контрагенту/в ведомство */
    responseRequired: boolean('response_required').notNull().default(false),
    /** Крайний срок ответа (дата по Москве хранится как timestamptz начала дня UTC) */
    responseDeadline: timestamp('response_deadline', { withTimezone: true }),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    /** Версионность (F-V0): version - номер версии/раунда; is_current - входит ли в последнюю версию набора. */
    version: integer('version').notNull().default(1),
    isCurrent: boolean('is_current').notNull().default(true),
  },
  (table) => [
    uniqueIndex('files_entity_section_name_version').on(
      table.entityType,
      table.tableId,
      table.documentSection,
      table.name,
      table.version,
    ),
  ],
);

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  entityType: varchar('entity_type', { length: 255 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  message: text('message').notNull(),
  html: text('html'),
  userId: uuid('user_id'),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const partners = pgTable('partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  thesisId: uuid('thesis_id'),
  name: varchar('name', { length: 255 }),
  shortName: varchar('short_name', { length: 255 }),
  inn: varchar('inn', { length: 32 }),
  kpp: varchar('kpp', { length: 9 }),
  ogrn: varchar('ogrn', { length: 15 }),
  legalAddress: text('legal_address'),
  actualAddress: text('actual_address'),
  phone: varchar('phone', { length: 255 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  statusId: uuid('status_id'),
  categoryId: uuid('category_id'),
  comment: text('comment'),
  partnerEconomicCategoryId: uuid('partner_economic_category_id'),
  isKeySupplier: boolean('is_key_supplier').default(false),
  isTargeted: boolean('is_targeted').default(false),
  legalCheckPassed: boolean('legal_check_passed').default(false),
  /** Явный отказ по юр. проверке («Проверка не пройдена»), вручную с вкладки verification. */
  legalCheckFailed: boolean('legal_check_failed').notNull().default(false),
  questionnaireFilled: boolean('questionnaire_filled').default(false),
  initialAssessmentDone: boolean('initial_assessment_done').default(false),
  isManuallyBlocked: boolean('is_manually_blocked').notNull().default(false),
  /** Причина блокировки контрагента; очищается при снятии блокировки. */
  blockReason: text('block_reason'),
  rating: numeric('rating', { precision: 3, scale: 2 }),
  nextAuditDate: date('next_audit_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  isDeleted: boolean('is_deleted').notNull().default(false),
});

export const refSupplierEvaluationCriteria = pgTable(
  'ref_supplier_evaluation_criteria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    weight: numeric('weight', { precision: 6, scale: 4 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('ref_supplier_eval_criteria_code_uidx').on(t.code)],
);

export const supplierEvaluations = pgTable(
  'supplier_evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partnerId: uuid('partner_id').notNull(),
    projectId: uuid('project_id'),
    scope: varchar('scope', { length: 20 }).notNull().default('project'),
    status: varchar('status', { length: 20 }).notNull(),
    weightedScore: numeric('weighted_score', { precision: 5, scale: 2 }).notNull(),
    category: varchar('category', { length: 1 }).notNull(),
    evaluatedAt: date('evaluated_at').notNull(),
    nextReevaluationDate: date('next_reevaluation_date'),
    comment: text('comment'),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    index('supplier_evaluations_partner_idx').on(t.partnerId),
    index('supplier_evaluations_project_idx').on(t.projectId),
    index('supplier_evaluations_partner_scope_status_idx').on(t.partnerId, t.scope, t.status),
    index('supplier_evaluations_partner_project_status_idx').on(t.partnerId, t.projectId, t.status),
    index('supplier_evaluations_next_reeval_idx').on(t.nextReevaluationDate),
  ],
);

export const supplierEvaluationCriterionScores = pgTable(
  'supplier_evaluation_criterion_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    evaluationId: uuid('evaluation_id').notNull(),
    criterionId: uuid('criterion_id').notNull(),
    score: numeric('score', { precision: 4, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('supplier_eval_scores_eval_criterion_uidx').on(t.evaluationId, t.criterionId),
    index('supplier_eval_scores_evaluation_idx').on(t.evaluationId),
  ],
);

export const supplierPartnerProjectBlocks = pgTable(
  'supplier_partner_project_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partnerId: uuid('partner_id').notNull(),
    projectId: uuid('project_id').notNull(),
    sourceEvaluationId: uuid('source_evaluation_id'),
    reason: varchar('reason', { length: 64 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    index('supplier_partner_project_blocks_pair_active_idx').on(t.partnerId, t.projectId, t.isActive),
    index('supplier_partner_project_blocks_project_idx').on(t.projectId),
  ],
);

export const syncMetadata = pgTable('sync_metadata', {
  key: varchar('key', { length: 100 }).primaryKey(),
  lastSyncTs: timestamp('last_sync_ts', { withTimezone: true }),
  result: jsonb('result'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================================
// Согласования документов (approvals). FK и CHECK - в scripts/approvals/.
// enum-подобные поля хранятся как varchar (в проекте pgEnum не используется).
// ============================================================

/** Типы сущностей, поддерживающие согласование (contract/partner/patent/project). */
export const refApprovalEntityTypes = pgTable(
  'ref_approval_entity_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    tableName: varchar('table_name', { length: 100 }).notNull(),
    statusField: varchar('status_field', { length: 50 }).default('status_id'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex('appr_entity_types_code_uidx').on(t.code)],
);

/** Роли шагов: approver / approver_final (зашиты в логику). */
export const refApprovalStepRoles = pgTable(
  'ref_approval_step_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 20 }).default('#3b82f6'),
    isActive: boolean('is_active').default(true),
  },
  (t) => [uniqueIndex('appr_step_roles_code_uidx').on(t.code)],
);

/** Маршрут согласования (шаблон процесса). */
export const approvalRoutes = pgTable(
  'approval_routes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    entityTypeId: uuid('entity_type_id').notNull(),
    isDefault: boolean('is_default').default(false),
    isActive: boolean('is_active').default(true),
    onCompleteActions: jsonb('on_complete_actions').default([]),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('appr_routes_code_uidx').on(t.code),
    index('appr_routes_entity_type_idx').on(t.entityTypeId),
  ],
);

/** Шаги маршрута (шаблон). step_type: any|all|sequential. */
export const approvalRouteSteps = pgTable(
  'approval_route_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    routeId: uuid('route_id').notNull(),
    stepOrder: integer('step_order').notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    stepType: varchar('step_type', { length: 20 }).notNull().default('any'),
    assignmentType: varchar('assignment_type', { length: 20 }).notNull().default('employee'),
    stepRoleId: uuid('step_role_id'),
    isRequired: boolean('is_required').default(true),
    canDelegate: boolean('can_delegate').default(false),
    canReturnToPrevious: boolean('can_return_to_previous').default(true),
    timeLimitHours: integer('time_limit_hours'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('appr_route_steps_route_order_uidx').on(t.routeId, t.stepOrder),
    index('appr_route_steps_route_idx').on(t.routeId),
  ],
);

/** Статичные согласующие шага (assignment_type='employee'). */
export const relApprovalStepAssignees = pgTable(
  'rel_approval_step_assignees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stepId: uuid('step_id').notNull(),
    employeeId: uuid('employee_id').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('appr_step_assignees_step_emp_uidx').on(t.stepId, t.employeeId),
    index('appr_step_assignees_step_idx').on(t.stepId),
  ],
);

/** Экземпляр согласования (рантайм). currentProcessStepId - FK добавляется в SQL (цикл). */
export const approvalProcesses = pgTable(
  'approval_processes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    routeId: uuid('route_id').notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    currentStepOrder: integer('current_step_order').notNull().default(1),
    currentProcessStepId: uuid('current_process_step_id'),
    initiatedBy: uuid('initiated_by').notNull(),
    initiatedAt: timestamp('initiated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completedBy: uuid('completed_by'),
    completionComment: text('completion_comment'),
    runtimeData: jsonb('runtime_data').default({}),
    routeCode: varchar('route_code', { length: 50 }),
    hasApproverFinal: boolean('has_approver_final').notNull().default(false),
    onCompleteActionsSnapshot: jsonb('on_complete_actions_snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('appr_processes_entity_idx').on(t.entityType, t.entityId),
    index('appr_processes_initiated_by_idx').on(t.initiatedBy),
    index('appr_processes_status_idx').on(t.status),
  ],
);

/** СНАПШОТ шагов процесса (рантайм читает только его). */
export const approvalProcessSteps = pgTable(
  'approval_process_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    processId: uuid('process_id').notNull(),
    stepOrder: integer('step_order').notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    stepType: varchar('step_type', { length: 20 }).notNull().default('all'),
    assignmentType: varchar('assignment_type', { length: 20 }).notNull().default('employee'),
    stepRoleId: uuid('step_role_id'),
    stepRoleCode: varchar('step_role_code', { length: 50 }),
    stepRoleName: varchar('step_role_name', { length: 100 }),
    stepRoleColor: varchar('step_role_color', { length: 20 }),
    isRequired: boolean('is_required').notNull().default(true),
    isIncluded: boolean('is_included').notNull().default(true),
    canDelegate: boolean('can_delegate').notNull().default(false),
    canReturnToPrevious: boolean('can_return_to_previous').notNull().default(true),
    timeLimitHours: integer('time_limit_hours'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('appr_process_steps_proc_order_uidx').on(t.processId, t.stepOrder),
    index('appr_process_steps_process_idx').on(t.processId),
  ],
);

/** СНАПШОТ назначенцев шага (только assignment_type='employee'). */
export const relApprovalProcessStepAssignees = pgTable(
  'rel_approval_process_step_assignees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    processStepId: uuid('process_step_id').notNull(),
    employeeId: uuid('employee_id').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('appr_pss_assignees_step_emp_uidx').on(t.processStepId, t.employeeId),
    index('appr_pss_assignees_step_idx').on(t.processStepId),
  ],
);

/** Назначения согласующих на шаг (с историей флагов pending/active). */
export const approvalAssignments = pgTable(
  'approval_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    processId: uuid('process_id').notNull(),
    stepOrder: integer('step_order').notNull(),
    processStepId: uuid('process_step_id'),
    assigneeId: uuid('assignee_id').notNull(),
    sourceType: varchar('source_type', { length: 30 }).notNull(),
    sourceRoleId: uuid('source_role_id'),
    isPending: boolean('is_pending').default(true),
    isActive: boolean('is_active').default(true),
    position: integer('position').notNull().default(0),
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
    overdueNotifiedAt: timestamp('overdue_notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('appr_assignments_proc_step_assignee_uidx').on(t.processId, t.stepOrder, t.assigneeId),
    index('appr_assignments_process_idx').on(t.processId),
    index('appr_assignments_assignee_idx').on(t.assigneeId),
  ],
);

/** Задачи-последствия согласования (on_complete_actions, F5). Полиморфные. */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: uuid('entity_id'),
    taskType: varchar('task_type', { length: 50 }).notNull().default('post_approval'),
    sourceType: varchar('source_type', { length: 50 }),
    sourceId: uuid('source_id'),
    title: text('title').notNull(),
    description: text('description'),
    assigneeId: uuid('assignee_id'),
    dueDate: timestamp('due_date', { withTimezone: true }),
    priority: varchar('priority', { length: 20 }).default('normal'),
    status: varchar('status', { length: 20 }).notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('tasks_assignee_status_idx').on(t.assigneeId, t.status),
    index('tasks_source_idx').on(t.sourceType, t.sourceId),
    index('tasks_entity_idx').on(t.entityType, t.entityId),
  ],
);

/** Лог системных событий процесса (старт/повторная отправка/замена файла) для ленты. */
export const approvalEvents = pgTable(
  'approval_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    processId: uuid('process_id').notNull(),
    eventType: varchar('event_type', { length: 30 }).notNull(),
    actorId: uuid('actor_id'),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('appr_events_process_idx').on(t.processId)],
);

/** Журнал решений согласующих. */
export const approvalDecisions = pgTable(
  'approval_decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    processId: uuid('process_id').notNull(),
    stepOrder: integer('step_order').notNull(),
    processStepId: uuid('process_step_id'),
    decidedBy: uuid('decided_by').notNull(),
    decisionType: varchar('decision_type', { length: 30 }).notNull(),
    delegatedTo: uuid('delegated_to'),
    returnToStep: integer('return_to_step'),
    comment: text('comment'),
    decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('appr_decisions_process_idx').on(t.processId)],
);
