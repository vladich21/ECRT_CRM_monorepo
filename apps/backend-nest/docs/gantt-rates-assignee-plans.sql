-- Ставка задачич + план часов на исполнителя.
-- Прогон вручную после gantt-task-class.sql.

ALTER TABLE gantt_tasks
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(12, 2);

COMMENT ON COLUMN gantt_tasks.hourly_rate IS
  'Ставка ₽/ч; План/Факт ₽ для technical = часы × ставка';

ALTER TABLE gantt_task_assignees
  ADD COLUMN IF NOT EXISTS planned_hours numeric(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN gantt_task_assignees.planned_hours IS
  'План (ч.), выделенный исполнителю начальником';
