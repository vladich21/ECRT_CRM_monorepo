-- Разделы прав Реестра ПО (постановка §7.1).
-- DBeaver, pmdb_stage, без \set. Таблицы sections / roles не меняем по структуре.

SET client_encoding TO 'UTF8';

BEGIN;

INSERT INTO sections (code, name, is_folder, sort_order) VALUES
  ('sw',             'Реестр ПО',              TRUE,  800),
  ('sw.structure',   'Структура изделий',      FALSE, 810),
  ('sw.items',       'Реестр программ',        FALSE, 820),
  ('sw.summary',     'Свод по документации',   FALSE, 830),
  ('sw.references',  'Справочники Реестра ПО', FALSE, 840)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

UPDATE sections SET parent_id = (SELECT id FROM sections WHERE code = 'sw')
WHERE code LIKE 'sw.%';

INSERT INTO rel_role_section_permissions (role_id, section_id, can_read, can_edit, can_delete)
SELECT r.id, s.id, TRUE, TRUE, TRUE
FROM roles r
CROSS JOIN sections s
WHERE r.code = 'admin'
  AND s.code LIKE 'sw.%'
ON CONFLICT (role_id, section_id) DO UPDATE SET
  can_read = TRUE, can_edit = TRUE, can_delete = TRUE, updated_at = NOW();

INSERT INTO rel_role_section_permissions (role_id, section_id, can_read, can_edit, can_delete)
SELECT r.id, s.id, TRUE, FALSE, FALSE
FROM roles r
CROSS JOIN sections s
WHERE r.code = 'viewer'
  AND s.code IN ('sw.structure', 'sw.items', 'sw.summary', 'sw.references')
ON CONFLICT (role_id, section_id) DO UPDATE SET
  can_read = TRUE, can_edit = FALSE, can_delete = FALSE, updated_at = NOW();

COMMIT;
