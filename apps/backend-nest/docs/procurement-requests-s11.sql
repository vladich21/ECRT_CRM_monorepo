-- S11: второй процесс approvals — согласование после проработки.
-- Отдельный entity type: ВИ-4 на purchase_request после approve лочит повторный старт.
-- DBeaver: Execute SQL Script. CI не гоняет.
-- Если только что была ошибка 25P02 — сначала выполни ОДНУ команду: ROLLBACK;

ROLLBACK;

INSERT INTO ref_approval_entity_types (code, name, table_name, status_field, is_active)
VALUES (
  'purchase_request_agreement',
  'Согласование запроса на закупку',
  'purchase_requests',
  'status',
  TRUE
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  table_name = EXCLUDED.table_name,
  status_field = EXCLUDED.status_field,
  is_active = TRUE;

INSERT INTO approval_routes (
  code, name, description, entity_type_id, is_default, is_active, on_complete_actions
)
SELECT
  'purchase_request_agreement',
  'Согласование запроса на закупку',
  'После проработки: решение принимает РП проекта или руководитель ведущего ОУП. Достаточно одного.',
  et.id,
  TRUE,
  TRUE,
  '[]'::jsonb
FROM ref_approval_entity_types et
WHERE et.code = 'purchase_request_agreement'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  entity_type_id = EXCLUDED.entity_type_id,
  is_default = TRUE,
  is_active = TRUE,
  on_complete_actions = EXCLUDED.on_complete_actions,
  updated_at = NOW();

INSERT INTO approval_route_steps (
  route_id, step_order, name, description, step_type, assignment_type,
  step_role_id, is_required, can_delegate, can_return_to_previous
)
SELECT
  r.id,
  1,
  'Согласование',
  'РП проекта или руководитель ведущего ОУП (достаточно одного)',
  'any',
  'owner_or_head',
  roles.id,
  TRUE,
  FALSE,
  FALSE
FROM approval_routes r
CROSS JOIN ref_approval_step_roles roles
WHERE r.code = 'purchase_request_agreement'
  AND roles.code = 'approver_final'
  AND NOT EXISTS (
    SELECT 1 FROM approval_route_steps s
    WHERE s.route_id = r.id AND s.step_order = 1
  );

UPDATE approval_route_steps s
SET
  name = 'Согласование',
  description = 'РП проекта или руководитель ведущего ОУП (достаточно одного)',
  step_type = 'any',
  assignment_type = 'owner_or_head',
  is_required = TRUE,
  can_delegate = FALSE,
  can_return_to_previous = FALSE,
  step_role_id = (SELECT id FROM ref_approval_step_roles WHERE code = 'approver_final')
FROM approval_routes r
WHERE s.route_id = r.id
  AND r.code = 'purchase_request_agreement'
  AND s.step_order = 1;
