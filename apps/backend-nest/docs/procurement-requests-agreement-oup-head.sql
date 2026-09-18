-- Второй маршрут (после проработки, покурс закупщика "Отправить на согласование"):
-- было "РП проекта или руководитель ведущего ОУП" (owner_or_head, любой из двух).
-- По уточнению (2026-09-17): закупщик отправляет ТОЛЬКО начальнику ОУП, тем же
-- механизмом, что и шаг 3 маршрута purchase_request_vi4 — держатели права
-- procurement.lead (edit), список, а не РП.
-- DBeaver: Execute SQL Script. CI не гоняет.
-- Если только что была ошибка 25P02 — сначала выполни ОДНУ команду: ROLLBACK;

ROLLBACK;

UPDATE approval_route_steps s
SET
  name = 'Утверждение начальника ОУП',
  description = 'Обязательный шаг',
  step_type = 'any',
  assignment_type = 'employee'
FROM approval_routes r
WHERE s.route_id = r.id
  AND r.code = 'purchase_request_agreement'
  AND s.step_order = 1;

DELETE FROM rel_approval_step_assignees s
USING approval_route_steps rs, approval_routes r
WHERE s.step_id = rs.id
  AND rs.route_id = r.id
  AND r.code = 'purchase_request_agreement'
  AND rs.step_order = 1;

INSERT INTO rel_approval_step_assignees (step_id, employee_id, position)
SELECT step1.id, holders.user_id, 0
FROM approval_routes r
JOIN approval_route_steps step1 ON step1.route_id = r.id AND step1.step_order = 1
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
WHERE r.code = 'purchase_request_agreement';

-- Проверка: 1 шаг, employee, состав = держатели procurement.lead на сейчас.
SELECT s.step_order, s.name, s.assignment_type
FROM approval_routes r
JOIN approval_route_steps s ON s.route_id = r.id
WHERE r.code = 'purchase_request_agreement';

SELECT u.last_name, u.first_name
FROM approval_routes r
JOIN approval_route_steps s ON s.route_id = r.id AND s.step_order = 1
JOIN rel_approval_step_assignees a ON a.step_id = s.id
JOIN users u ON u.id = a.employee_id
WHERE r.code = 'purchase_request_agreement';
