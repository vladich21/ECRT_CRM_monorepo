-- ВИ-4 (утверждение запроса на закупку): было — один шаг «РП или руководитель
-- инициатора, достаточно одного» (owner_or_head). По решению встречи с
-- Дмитрием Сарафом (2026-09-16, подтверждено «Да и да») — три последовательных шага:
--   1. Руководитель инициатора — НЕобязательный: инициатор решает флажком при
--      отправке (POST .../submit body.included_step_orders), по умолчанию включён.
--   2. РП проекта — обязательный, всегда.
--   3. Начальник ОУП — обязательный, всегда; конкретные сотрудники — держатели
--      права procurement.lead (edit), список ниже пересобирается по факту прогона
--      этого скрипта, а не хранится статично где-то ещё.
-- DBeaver: Execute SQL Script. CI не гоняет.
-- Если только что была ошибка 25P02 — сначала выполни ОДНУ команду: ROLLBACK;

ROLLBACK;

-- Шаг 1: было step_order=1 «Утверждение» (owner_or_head) — становится
-- необязательным шагом «Руководитель инициатора» (initiator_head).
UPDATE approval_route_steps s
SET
  name = 'Руководитель инициатора',
  description = 'Необязательный шаг — инициатор решает флажком при отправке',
  step_type = 'any',
  assignment_type = 'initiator_head',
  is_required = FALSE,
  can_delegate = FALSE,
  can_return_to_previous = FALSE,
  step_role_id = (SELECT id FROM ref_approval_step_roles WHERE code = 'approver_final')
FROM approval_routes r
WHERE s.route_id = r.id
  AND r.code = 'purchase_request_vi4'
  AND s.step_order = 1;

-- Шаг 2: РП проекта (document_owner -> resolveOwnerId -> projects.manager_id).
INSERT INTO approval_route_steps (
  route_id, step_order, name, description, step_type, assignment_type,
  step_role_id, is_required, can_delegate, can_return_to_previous
)
SELECT
  r.id, 2, 'Утверждение РП проекта', 'Обязательный шаг', 'any', 'document_owner',
  (SELECT id FROM ref_approval_step_roles WHERE code = 'approver_final'), TRUE, FALSE, FALSE
FROM approval_routes r
WHERE r.code = 'purchase_request_vi4'
  AND NOT EXISTS (SELECT 1 FROM approval_route_steps s WHERE s.route_id = r.id AND s.step_order = 2);

UPDATE approval_route_steps s
SET
  name = 'Утверждение РП проекта',
  description = 'Обязательный шаг',
  step_type = 'any',
  assignment_type = 'document_owner',
  is_required = TRUE,
  can_delegate = FALSE,
  can_return_to_previous = FALSE,
  step_role_id = (SELECT id FROM ref_approval_step_roles WHERE code = 'approver_final')
FROM approval_routes r
WHERE s.route_id = r.id AND r.code = 'purchase_request_vi4' AND s.step_order = 2;

-- Шаг 3: Начальник ОУП (employee -> конкретный список ниже).
INSERT INTO approval_route_steps (
  route_id, step_order, name, description, step_type, assignment_type,
  step_role_id, is_required, can_delegate, can_return_to_previous
)
SELECT
  r.id, 3, 'Утверждение начальника ОУП', 'Обязательный шаг', 'any', 'employee',
  (SELECT id FROM ref_approval_step_roles WHERE code = 'approver_final'), TRUE, FALSE, FALSE
FROM approval_routes r
WHERE r.code = 'purchase_request_vi4'
  AND NOT EXISTS (SELECT 1 FROM approval_route_steps s WHERE s.route_id = r.id AND s.step_order = 3);

UPDATE approval_route_steps s
SET
  name = 'Утверждение начальника ОУП',
  description = 'Обязательный шаг',
  step_type = 'any',
  assignment_type = 'employee',
  is_required = TRUE,
  can_delegate = FALSE,
  can_return_to_previous = FALSE,
  step_role_id = (SELECT id FROM ref_approval_step_roles WHERE code = 'approver_final')
FROM approval_routes r
WHERE s.route_id = r.id AND r.code = 'purchase_request_vi4' AND s.step_order = 3;

-- Список согласующих шага 3 = держатели права procurement.lead (edit), сейчас.
-- Перезаписывается целиком при каждом прогоне — держатели меняются, назначь
-- заново этим же скриптом, если состав руководителей ОУП поменялся.
DELETE FROM rel_approval_step_assignees s
USING approval_route_steps rs, approval_routes r
WHERE s.step_id = rs.id
  AND rs.route_id = r.id
  AND r.code = 'purchase_request_vi4'
  AND rs.step_order = 3;

INSERT INTO rel_approval_step_assignees (step_id, employee_id, position)
SELECT step3.id, holders.user_id, 0
FROM approval_routes r
JOIN approval_route_steps step3 ON step3.route_id = r.id AND step3.step_order = 3
JOIN (
  SELECT DISTINCT uro.user_id
  FROM rel_users_roles uro
  JOIN rel_role_section_permissions perm ON perm.role_id = uro.role_id
  JOIN sections sec ON sec.id = perm.section_id
  JOIN users u ON u.id = uro.user_id
  WHERE sec.code = 'procurement.lead'
    AND perm.can_edit = TRUE
    AND u.is_active = TRUE
) holders ON TRUE
WHERE r.code = 'purchase_request_vi4';

-- Проверка после прогона: должно быть 3 шага (1 необязательный, 2 обязательных),
-- и на шаге 3 — хотя бы один согласующий.
SELECT s.step_order, s.name, s.assignment_type, s.is_required
FROM approval_routes r
JOIN approval_route_steps s ON s.route_id = r.id
WHERE r.code = 'purchase_request_vi4'
ORDER BY s.step_order;

SELECT s.step_order, u.last_name, u.first_name
FROM approval_routes r
JOIN approval_route_steps s ON s.route_id = r.id AND s.step_order = 3
JOIN rel_approval_step_assignees a ON a.step_id = s.id
JOIN users u ON u.id = a.employee_id
WHERE r.code = 'purchase_request_vi4';
