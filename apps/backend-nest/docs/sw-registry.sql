-- Реестр ПО: таблицы + справочники (постановка §6).
-- DBeaver: без \set. Сначала pmdb_stage, потом прод.
-- Смежные таблицы (partners, users, comments, files, sections) не меняем.

SET client_encoding TO 'UTF8';

BEGIN;

-- ── Справочники ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sw_ref_element_types (
  code varchar(50) PRIMARY KEY,
  name varchar(255) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS sw_ref_responsibility_roles (
  code varchar(50) PRIMARY KEY,
  name varchar(255) NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS sw_ref_development_kinds (
  code varchar(50) PRIMARY KEY,
  name varchar(255) NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS sw_ref_document_kinds (
  code varchar(50) PRIMARY KEY,
  gost_code varchar(10) NOT NULL,
  name varchar(255) NOT NULL,
  requires_approval_sheet boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS sw_ref_document_kinds_gost_uidx
  ON sw_ref_document_kinds (gost_code);

CREATE TABLE IF NOT EXISTS sw_ref_statuses (
  code varchar(50) PRIMARY KEY,
  name varchar(255) NOT NULL,
  is_final boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS sw_ref_status_applicability (
  status_code varchar(50) NOT NULL,
  development_kind_code varchar(50) NOT NULL,
  scope varchar(20) NOT NULL,
  PRIMARY KEY (status_code, development_kind_code, scope)
);

CREATE INDEX IF NOT EXISTS sw_ref_status_applicability_kind_scope_idx
  ON sw_ref_status_applicability (development_kind_code, scope);

-- ── Структура ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sw_structure_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid,
  element_type_code varchar(50) NOT NULL,
  code varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  record_state varchar(20) NOT NULL DEFAULT 'active',
  archived_by_cascade boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid,
  updated_by uuid
);

CREATE INDEX IF NOT EXISTS sw_structure_elements_parent_idx
  ON sw_structure_elements (parent_id);
CREATE INDEX IF NOT EXISTS sw_structure_elements_type_idx
  ON sw_structure_elements (element_type_code);
CREATE UNIQUE INDEX IF NOT EXISTS sw_structure_elements_root_code_uidx
  ON sw_structure_elements (code)
  WHERE parent_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sw_structure_elements_parent_code_uidx
  ON sw_structure_elements (parent_id, code)
  WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sw_structure_responsibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role_code varchar(50) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS sw_structure_responsibles_uidx
  ON sw_structure_responsibles (element_id, user_id, role_code);
CREATE INDEX IF NOT EXISTS sw_structure_responsibles_user_idx
  ON sw_structure_responsibles (user_id);

-- ── Программы ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sw_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designation varchar(100) NOT NULL,
  element_id uuid NOT NULL,
  short_name varchar(255) NOT NULL,
  full_name varchar(500) NOT NULL,
  partner_id uuid NOT NULL,
  responsible_user_id uuid NOT NULL,
  development_kind_code varchar(50) NOT NULL,
  spec_url varchar(500),
  record_state varchar(20) NOT NULL DEFAULT 'active',
  archived_by_cascade boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid,
  updated_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS sw_items_designation_uidx ON sw_items (designation);
CREATE INDEX IF NOT EXISTS sw_items_element_idx ON sw_items (element_id);
CREATE INDEX IF NOT EXISTS sw_items_partner_idx ON sw_items (partner_id);
CREATE INDEX IF NOT EXISTS sw_items_kind_idx ON sw_items (development_kind_code);

-- ── Документы (ЛУ — поля на той же строке) ───────────────────

CREATE TABLE IF NOT EXISTS sw_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id uuid NOT NULL,
  designation varchar(100) NOT NULL,
  document_kind_code varchar(50) NOT NULL,
  kind_sequence_no integer NOT NULL,
  name varchar(500) NOT NULL,
  sheets_count integer NOT NULL,
  letter varchar(10),
  status_code varchar(50) NOT NULL,
  sheet_designation varchar(100),
  sheet_sheets_count integer,
  sheet_status_code varchar(50),
  ips_id varchar(100),
  ips_placed_at date,
  record_state varchar(20) NOT NULL DEFAULT 'active',
  archived_by_cascade boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid,
  updated_by uuid
);

-- Уникально только обозначение: номер вида живой, перенумерация не должна упираться в индекс
-- (индекс по «программа + вид + номер» снят скриптом scripts/sw-registry/01).
CREATE UNIQUE INDEX IF NOT EXISTS sw_documents_designation_uidx ON sw_documents (designation);
CREATE INDEX IF NOT EXISTS sw_documents_software_idx ON sw_documents (software_id);
CREATE INDEX IF NOT EXISTS sw_documents_status_idx ON sw_documents (status_code);

-- ── Связи с files-service ────────────────────────────────────

CREATE TABLE IF NOT EXISTS sw_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type varchar(30) NOT NULL,
  object_id uuid NOT NULL,
  file_id uuid NOT NULL,
  purpose varchar(30) NOT NULL,
  filename varchar(255) NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sw_files_object_file_uidx
  ON sw_files (object_type, object_id, file_id);
CREATE INDEX IF NOT EXISTS sw_files_object_idx ON sw_files (object_type, object_id);
CREATE UNIQUE INDEX IF NOT EXISTS sw_files_file_uidx ON sw_files (file_id);

-- ── Связи программ с реестром РИД ─────────────────────────────

CREATE TABLE IF NOT EXISTS sw_item_patents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id uuid NOT NULL,
  patent_id uuid NOT NULL,
  comment varchar(500),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sw_item_patents_uidx
  ON sw_item_patents (software_id, patent_id);
CREATE INDEX IF NOT EXISTS sw_item_patents_patent_idx ON sw_item_patents (patent_id);

COMMENT ON TABLE sw_structure_elements IS 'Структура изделий Реестра ПО';
COMMENT ON TABLE sw_items IS 'Программы (обозначение ГОСТ 19.103)';
COMMENT ON TABLE sw_documents IS 'Документы ЕСПД; ЛУ — поля sheet_* на той же строке';
COMMENT ON TABLE sw_files IS 'Обратный индекс к files-service';
COMMENT ON TABLE sw_item_patents IS 'Связи программ реестра ПО с карточками РИД';
COMMENT ON COLUMN sw_structure_elements.archived_by_cascade IS 'Архив пришёл с родителя; возврат только затронутого';
COMMENT ON COLUMN sw_ref_status_applicability.scope IS 'document | sheet';

COMMIT;

-- ── Наполнение справочников (идемпотентно) ───────────────────

BEGIN;

INSERT INTO sw_ref_element_types (code, name, sort_order) VALUES
  ('system',     'Система',     10),
  ('subsystem',  'Подсистема',  20),
  ('complex',    'Комплекс',    30),
  ('component',  'Компонент',   40),
  ('other',      'Прочее',      50)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO sw_ref_responsibility_roles (code, name) VALUES
  ('chief_designer', 'Главный конструктор'),
  ('tech_writer',    'Технический писатель'),
  ('responsible',    'Ответственный')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO sw_ref_development_kinds (code, name) VALUES
  ('rnd',        'ОКР'),
  ('serial',     'Серийное изделие'),
  ('purchased',  'Покупное изделие')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO sw_ref_document_kinds (code, gost_code, name, requires_approval_sheet, sort_order) VALUES
  ('specification',     '12', 'Спецификация',                          true,  10),
  ('holders_list',      '13', 'Ведомость держателей подлинников',      true,  20),
  ('operational_list',  '20', 'Ведомость эксплуатационных документов', true,  30),
  ('program_text',      '30', 'Текст программы',                       true,  40),
  ('program_desc',      '31', 'Описание программы',                    true,  50),
  ('sysprog_guide',     '32', 'Руководство системного программиста',   true,  60),
  ('programmer_guide',  '33', 'Руководство программиста',              true,  70),
  ('operator_guide',    '34', 'Руководство оператора',                 true,  80),
  ('test_program',      '51', 'Программа и методика испытаний',        true,  90),
  ('explanatory_note',  '81', 'Пояснительная записка',                 true, 100),
  ('other',             '90', 'Прочие',                                false, 110)
ON CONFLICT (code) DO UPDATE SET
  gost_code = EXCLUDED.gost_code,
  name = EXCLUDED.name,
  requires_approval_sheet = EXCLUDED.requires_approval_sheet,
  sort_order = EXCLUDED.sort_order;

INSERT INTO sw_ref_statuses (code, name, is_final, sort_order) VALUES
  ('development',  'Разработка',            false, 10),
  ('in_approval',  'На согласовании',       false, 20),
  ('agreed',       'Согласован',            false, 30),
  ('approved',     'Утверждён',             false, 40),
  ('revision',     'Выдан с замечаниями',   false, 50),
  ('received',     'Получен',               false, 60),
  ('accepted',     'Принят',                false, 70),
  ('in_rework',    'На доработке',          false, 80),
  ('issued',       'Выдан',                 false, 90),
  ('cancelled',    'Аннулирован',           false, 100),
  ('in_ips',       'Размещён в IPS',        true,  110)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_final = EXCLUDED.is_final,
  sort_order = EXCLUDED.sort_order;

-- 18 сочетаний. ЛУ (sheet) только у ОКР. ОВ-2 может заменить строки, не логику.
INSERT INTO sw_ref_status_applicability (status_code, development_kind_code, scope) VALUES
  ('development', 'rnd',        'document'),
  ('in_approval', 'rnd',        'document'),
  ('agreed',      'rnd',        'document'),
  ('approved',    'rnd',        'document'),
  ('revision',    'rnd',        'document'),
  ('in_ips',      'rnd',        'document'),
  ('received',    'serial',     'document'),
  ('accepted',    'serial',     'document'),
  ('in_rework',   'serial',     'document'),
  ('in_ips',      'serial',     'document'),
  ('received',    'purchased',  'document'),
  ('accepted',    'purchased',  'document'),
  ('in_rework',   'purchased',  'document'),
  ('in_ips',      'purchased',  'document'),
  ('development', 'rnd',        'sheet'),
  ('agreed',      'rnd',        'sheet'),
  ('approved',    'rnd',        'sheet'),
  ('in_ips',      'rnd',        'sheet')
ON CONFLICT (status_code, development_kind_code, scope) DO NOTHING;

COMMIT;
