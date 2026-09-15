import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Реестр ПО (постановка §6). Смежные таблицы (partners, users, comments, files)
 * не меняем: оттуда только uuid-ссылки без FK в drizzle (как у gantt_*).
 */

export const swRefElementTypes = pgTable(
  'sw_ref_element_types',
  {
    code: varchar('code', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
);

export const swRefResponsibilityRoles = pgTable(
  'sw_ref_responsibility_roles',
  {
    code: varchar('code', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
);

export const swRefDevelopmentKinds = pgTable(
  'sw_ref_development_kinds',
  {
    code: varchar('code', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
);

export const swRefDocumentKinds = pgTable(
  'sw_ref_document_kinds',
  {
    code: varchar('code', { length: 50 }).primaryKey(),
    gostCode: varchar('gost_code', { length: 10 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    requiresApprovalSheet: boolean('requires_approval_sheet').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (t) => [uniqueIndex('sw_ref_document_kinds_gost_uidx').on(t.gostCode)],
);

export const swRefStatuses = pgTable(
  'sw_ref_statuses',
  {
    code: varchar('code', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    isFinal: boolean('is_final').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
);

/** Область: document | sheet. Набор статусов — строки, не if/else в коде. */
export const swRefStatusApplicability = pgTable(
  'sw_ref_status_applicability',
  {
    statusCode: varchar('status_code', { length: 50 }).notNull(),
    developmentKindCode: varchar('development_kind_code', { length: 50 }).notNull(),
    scope: varchar('scope', { length: 20 }).notNull(),
  },
  (t) => [
    uniqueIndex('sw_ref_status_applicability_uidx').on(
      t.statusCode,
      t.developmentKindCode,
      t.scope,
    ),
    index('sw_ref_status_applicability_kind_scope_idx').on(t.developmentKindCode, t.scope),
  ],
);

export const swStructureElements = pgTable(
  'sw_structure_elements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id'),
    elementTypeCode: varchar('element_type_code', { length: 50 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    recordState: varchar('record_state', { length: 20 }).notNull().default('active'),
    archivedByCascade: boolean('archived_by_cascade').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    index('sw_structure_elements_parent_idx').on(t.parentId),
    index('sw_structure_elements_type_idx').on(t.elementTypeCode),
  ],
);

export const swStructureResponsibles = pgTable(
  'sw_structure_responsibles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    elementId: uuid('element_id').notNull(),
    userId: uuid('user_id').notNull(),
    roleCode: varchar('role_code', { length: 50 }).notNull(),
  },
  (t) => [
    uniqueIndex('sw_structure_responsibles_uidx').on(t.elementId, t.userId, t.roleCode),
    index('sw_structure_responsibles_user_idx').on(t.userId),
  ],
);

export const swItems = pgTable(
  'sw_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    designation: varchar('designation', { length: 100 }).notNull(),
    elementId: uuid('element_id').notNull(),
    shortName: varchar('short_name', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 500 }).notNull(),
    partnerId: uuid('partner_id').notNull(),
    responsibleUserId: uuid('responsible_user_id').notNull(),
    developmentKindCode: varchar('development_kind_code', { length: 50 }).notNull(),
    specUrl: varchar('spec_url', { length: 500 }),
    /** Каталог программы в SVN конструкторов: откуда берётся её документация. */
    svnPath: varchar('svn_path', { length: 1000 }),
    recordState: varchar('record_state', { length: 20 }).notNull().default('active'),
    archivedByCascade: boolean('archived_by_cascade').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    uniqueIndex('sw_items_designation_uidx').on(t.designation),
    index('sw_items_element_idx').on(t.elementId),
    index('sw_items_partner_idx').on(t.partnerId),
    index('sw_items_kind_idx').on(t.developmentKindCode),
  ],
);

export const swDocuments = pgTable(
  'sw_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    softwareId: uuid('software_id').notNull(),
    designation: varchar('designation', { length: 100 }).notNull(),
    documentKindCode: varchar('document_kind_code', { length: 50 }).notNull(),
    kindSequenceNo: integer('kind_sequence_no').notNull(),
    name: varchar('name', { length: 500 }).notNull(),
    sheetsCount: integer('sheets_count').notNull(),
    letter: varchar('letter', { length: 10 }),
    statusCode: varchar('status_code', { length: 50 }).notNull(),
    sheetDesignation: varchar('sheet_designation', { length: 100 }),
    sheetSheetsCount: integer('sheet_sheets_count'),
    sheetStatusCode: varchar('sheet_status_code', { length: 50 }),
    ipsId: varchar('ips_id', { length: 100 }),
    ipsPlacedAt: date('ips_placed_at'),
    recordState: varchar('record_state', { length: 20 }).notNull().default('active'),
    archivedByCascade: boolean('archived_by_cascade').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    // Уникально только обозначение: номер вида живой и меняется (scripts/sw-registry/01).
    uniqueIndex('sw_documents_designation_uidx').on(t.designation),
    index('sw_documents_software_idx').on(t.softwareId),
    index('sw_documents_status_idx').on(t.statusCode),
  ],
);

/** Обратный индекс к files-service: листинга по entityType там нет. */
export const swFiles = pgTable(
  'sw_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    objectType: varchar('object_type', { length: 30 }).notNull(),
    objectId: uuid('object_id').notNull(),
    fileId: uuid('file_id').notNull(),
    purpose: varchar('purpose', { length: 30 }).notNull(),
    filename: varchar('filename', { length: 255 }).notNull(),
    // Происхождение из SVN конструкторов: путь внутри репозитория, ревизия на
    // момент переноса и UUID репозитория. UUID — страховка: репозиторий пересоздали,
    // номера ревизий больше не сопоставимы со старыми.
    svnPath: varchar('svn_path', { length: 1000 }),
    svnRevision: integer('svn_revision'),
    svnRepoUuid: varchar('svn_repo_uuid', { length: 40 }),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('sw_files_object_file_uidx').on(t.objectType, t.objectId, t.fileId),
    index('sw_files_object_idx').on(t.objectType, t.objectId),
    // Файл хранилища привязан ровно к одной записи (scripts/sw-registry/02).
    uniqueIndex('sw_files_file_uidx').on(t.fileId),
  ],
);

/** Связь программы реестра ПО с карточкой РИД (patents). */
export const swItemPatents = pgTable(
  'sw_item_patents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    softwareId: uuid('software_id').notNull(),
    patentId: uuid('patent_id').notNull(),
    comment: varchar('comment', { length: 500 }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('sw_item_patents_uidx').on(t.softwareId, t.patentId),
    index('sw_item_patents_patent_idx').on(t.patentId),
  ],
);
