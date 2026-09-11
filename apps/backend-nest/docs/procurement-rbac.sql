-- Разделы прав ФС-1 «Запрос на закупку».
-- DBeaver, без \set. Таблицы sections / roles не меняем по структуре.
-- Как Реестр ПО: отдельный скрипт, 02_seed_data.sql не трогаем.

SET client_encoding TO 'UTF8';

BEGIN;

INSERT INTO sections (code, name, is_folder, sort_order) VALUES
  ('procurement',            'Закупки: запросы',           TRUE,  350),
  ('procurement.requests',   'Запросы на закупку',         FALSE, 360),
  ('procurement.correction', 'Корректировка привязки ЗЗ', FALSE, 370),
  ('procurement.lead',       'Назначение ведущего ОУП',   FALSE, 380)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

UPDATE sections SET parent_id = (SELECT id FROM sections WHERE code = 'procurement')
WHERE code IN ('procurement.requests', 'procurement.correction', 'procurement.lead');

INSERT INTO rel_role_section_permissions (role_id, section_id, can_read, can_edit, can_delete)
SELECT r.id, s.id, TRUE, TRUE, TRUE
FROM roles r
CROSS JOIN sections s
WHERE r.code = 'admin'
  AND s.code IN ('procurement.requests', 'procurement.correction', 'procurement.lead')
ON CONFLICT (role_id, section_id) DO UPDATE SET
  can_read = TRUE, can_edit = TRUE, can_delete = TRUE, updated_at = NOW();

INSERT INTO rel_role_section_permissions (role_id, section_id, can_read, can_edit, can_delete)
SELECT r.id, s.id, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN sections s
WHERE r.code = 'procurement'
  AND s.code = 'procurement.requests'
ON CONFLICT (role_id, section_id) DO UPDATE SET
  can_read = TRUE, can_edit = TRUE, can_delete = FALSE, updated_at = NOW();

INSERT INTO rel_role_section_permissions (role_id, section_id, can_read, can_edit, can_delete)
SELECT r.id, s.id, TRUE, FALSE, FALSE
FROM roles r
CROSS JOIN sections s
WHERE r.code IN ('viewer', 'project_mgr')
  AND s.code = 'procurement.requests'
ON CONFLICT (role_id, section_id) DO UPDATE SET
  can_read = TRUE, can_edit = FALSE, can_delete = FALSE, updated_at = NOW();

-- РП утверждает ВИ-4 как назначенный, не как ОУП.
-- Роль project_mgr: read карточки. edit / procurement.lead — не давать.
-- Назначенный без роли всё равно откроет карточку (участник процесса).
-- Роль пользователю: Администрирование → Пользователи → роли, не этот скрипт.

COMMIT;
