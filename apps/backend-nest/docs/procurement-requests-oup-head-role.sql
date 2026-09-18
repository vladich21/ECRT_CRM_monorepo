-- Причина «лишних людей» на шаге «Начальник ОУП»: право procurement.lead
-- сейчас есть только как побочный эффект общей роли «Администратор» (у неё
-- edit разом на 37 секций) — у Коваля, Макеева, Муравьёва, Сарафа. Отдельной
-- роли «Начальник ОУП» не существовало, у Артура Рудена (реального начальника
-- ОУП) есть только «Закупщик» и «Оценщик».
-- DBeaver: Execute SQL Script. CI не гоняет.
-- Если только что была ошибка 25P02 — сначала выполни ОДНУ команду: ROLLBACK;

ROLLBACK;

-- 1) Снимаем procurement.lead с «Администратора» — админка не должна значить
--    «начальник ОУП» автоматически. can_delete тоже снимаем — в БД есть
--    constraint rel_rsp_dependency_check: delete без edit невозможен.
UPDATE rel_role_section_permissions
SET can_edit = FALSE, can_delete = FALSE, updated_at = NOW()
WHERE role_id = (SELECT id FROM roles WHERE name = 'Администратор')
  AND section_id = (SELECT id FROM sections WHERE code = 'procurement.lead');

-- 2) Заводим отдельную роль «Начальник ОУП» с этим правом.
INSERT INTO roles (code, name, description, is_active, is_system)
VALUES ('procurement_oup_head', 'Начальник ОУП', 'Утверждает запросы на закупку, назначает ведущего', TRUE, FALSE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO rel_role_section_permissions (role_id, section_id, can_read, can_edit, can_delete)
SELECT r.id, s.id, TRUE, TRUE, FALSE
FROM roles r, sections s
WHERE r.code = 'procurement_oup_head' AND s.code = 'procurement.lead'
  AND NOT EXISTS (
    SELECT 1 FROM rel_role_section_permissions p WHERE p.role_id = r.id AND p.section_id = s.id
  );

-- 3) Назначаем роль Артуру Рудену (реальный начальник ОУП).
INSERT INTO rel_users_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.last_name = 'Руден' AND u.first_name = 'Артур'
  AND r.code = 'procurement_oup_head'
  AND NOT EXISTS (
    SELECT 1 FROM rel_users_roles uro WHERE uro.user_id = u.id AND uro.role_id = r.id
  );

-- Проверка: держатель procurement.lead (edit) теперь должен быть только Артур.
SELECT u.last_name, u.first_name, r.name as role_name
FROM rel_users_roles uro
JOIN rel_role_section_permissions perm ON perm.role_id = uro.role_id
JOIN sections sec ON sec.id = perm.section_id
JOIN users u ON u.id = uro.user_id
JOIN roles r ON r.id = uro.role_id
WHERE sec.code = 'procurement.lead' AND perm.can_edit = TRUE AND u.is_active = TRUE;
