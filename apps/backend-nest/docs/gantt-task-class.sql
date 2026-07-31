-- Класс задачи Ганта: technical | coexecutor | auxiliary
-- Прогон вручную в DBeaver/psql.

ALTER TABLE gantt_tasks
  ADD COLUMN IF NOT EXISTS task_class varchar(32) NOT NULL DEFAULT 'technical';

COMMENT ON COLUMN gantt_tasks.task_class IS
  'Класс: technical (Техническая), coexecutor (Соисполнитель), auxiliary (Вспомогательная)';
