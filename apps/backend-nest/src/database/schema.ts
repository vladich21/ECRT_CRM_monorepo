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
  email: varchar('email', { length: 255 }),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: varchar('entitytype', { length: 255 }).notNull(),
    tableId: uuid('table_id'),
    name: varchar('name', { length: 255 }).notNull(),
    /** Для патентов: application | consent | notification; для прочих сущностей: default */
    documentSection: varchar('document_section', { length: 32 }).notNull().default('default'),
    type: varchar('type', { length: 255 }).notNull(),
    size: integer('size'),
    uploadedById: uuid('uploadedby_id'),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (table) => [
    uniqueIndex('files_entity_section_name').on(
      table.entityType,
      table.tableId,
      table.documentSection,
      table.name,
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
  inn: varchar('inn', { length: 12 }),
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
  questionnaireFilled: boolean('questionnaire_filled').default(false),
  initialAssessmentDone: boolean('initial_assessment_done').default(false),
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
