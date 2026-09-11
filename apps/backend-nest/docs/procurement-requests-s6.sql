-- S6: тип сущности и маршрут ВИ-4 (утверждение запроса).
-- DBeaver: Execute SQL Script. CI не гоняет.
-- Если только что была ошибка 25P02 — сначала выполни ОДНУ команду: ROLLBACK;
-- Задача после утверждения: assignee_type initiator_head — роли «руководитель ОУП» нет (S7).

-- Снимает aborted-транзакцию после прошлого падения. Нет открытой tx → WARNING, это нормально.
ROLLBACK;

ALTER TABLE approval_route_steps DROP CONSTRAINT IF EXISTS appr_route_steps_assignment_type_chk;
ALTER TABLE approval_route_steps ADD CONSTRAINT appr_route_steps_assignment_type_chk
  CHECK (assignment_type IN (
    'employee', 'initiator_head', 'department_head', 'document_owner', 'select_on_start', 'owner_or_head'
  ));

ALTER TABLE approval_process_steps DROP CONSTRAINT IF EXISTS appr_process_steps_assignment_type_chk;
ALTER TABLE approval_process_steps ADD CONSTRAINT appr_process_steps_assignment_type_chk
  CHECK (assignment_type IN (
    'employee', 'initiator_head', 'department_head', 'document_owner', 'select_on_start', 'owner_or_head'
  ));

INSERT INTO ref_approval_entity_types (code, name, table_name, status_field, is_active)
VALUES ('purchase_request', 'Запрос на закупку', 'purchase_requests', 'status', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  table_name = EXCLUDED.table_name,
  status_field = EXCLUDED.status_field,
  is_active = TRUE;

INSERT INTO approval_routes (
  code, name, description, entity_type_id, is_default, is_active, on_complete_actions
)
SELECT
  'purchase_request_vi4',
  'Утверждение запроса на закупку',
  'ВИ-4: решение принимает РП проекта или руководитель инициатора. Техприёмщик только уведомляется.',
  et.id,
  TRUE,
  TRUE,
  '[{"id":"oup-assign-lead","action_type":"create_task","task_config":{"title_template":"Назначить ведущего ОУП по запросу {number}","description_template":"Запрос {number} утверждён и переведён в проработку. Назначьте ведущего ОУП.","assignee_type":"initiator_head","due_days":3,"priority":"normal"}}]'::jsonb
FROM ref_approval_entity_types et
WHERE et.code = 'purchase_request'
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
  'Утверждение',
  'РП проекта или руководитель инициатора (достаточно одного)',
  'any',
  'owner_or_head',
  roles.id,
  TRUE,
  FALSE,
  FALSE
FROM approval_routes r
CROSS JOIN ref_approval_step_roles roles
WHERE r.code = 'purchase_request_vi4'
  AND roles.code = 'approver_final'
  AND NOT EXISTS (
    SELECT 1 FROM approval_route_steps s
    WHERE s.route_id = r.id AND s.step_order = 1
  );

UPDATE approval_route_steps s
SET
  name = 'Утверждение',
  description = 'РП проекта или руководитель инициатора (достаточно одного)',
  step_type = 'any',
  assignment_type = 'owner_or_head',
  is_required = TRUE,
  can_delegate = FALSE,
  can_return_to_previous = FALSE,
  step_role_id = (SELECT id FROM ref_approval_step_roles WHERE code = 'approver_final')
FROM approval_routes r
WHERE s.route_id = r.id
  AND r.code = 'purchase_request_vi4'
  AND s.step_order = 1;
