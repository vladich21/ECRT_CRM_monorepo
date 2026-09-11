-- S7: ведущий ОУП. DBeaver: Execute SQL Script. CI не гоняет.
-- Право procurement.lead — в docs/procurement-rbac.sql (прогони его тоже).
-- Задачу «назначить ведущего» создаёт handler по пользователям с этим правом,
-- а не on_complete initiator_head.

ROLLBACK;

UPDATE approval_routes
SET
  on_complete_actions = '[]'::jsonb,
  description = 'ВИ-4: решение принимает РП проекта или руководитель инициатора. После утверждения руководитель ОУП назначает ведущего (POST /lead).',
  updated_at = NOW()
WHERE code = 'purchase_request_vi4';
