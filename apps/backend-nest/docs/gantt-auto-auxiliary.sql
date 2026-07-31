-- Авто-вспомогательная задача проекта (одна на проект, исполнители = из technical).
-- Прогон вручную после gantt-rates-assignee-plans.sql.

ALTER TABLE gantt_tasks
  ADD COLUMN IF NOT EXISTS is_auto_auxiliary boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN gantt_tasks.is_auto_auxiliary IS
  'Системная вспомогательная задача проекта: исполнители синхронизируются с technical';

CREATE INDEX IF NOT EXISTS gantt_tasks_auto_aux_idx
  ON gantt_tasks (stage_id)
  WHERE is_auto_auxiliary = true AND is_deleted = false;
