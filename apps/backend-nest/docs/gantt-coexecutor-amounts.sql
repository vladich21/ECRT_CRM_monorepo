-- Gantt: ручные план/факт ₽ для задач класса «Соисполнитель».
-- Прогон вручную в DBeaver/psql.

ALTER TABLE gantt_tasks
  ADD COLUMN IF NOT EXISTS plan_amount numeric(19, 2),
  ADD COLUMN IF NOT EXISTS fact_amount numeric(19, 2);

COMMENT ON COLUMN gantt_tasks.plan_amount IS 'План ₽ (соисполнитель — вручную; technical — опционально)';
COMMENT ON COLUMN gantt_tasks.fact_amount IS 'Факт ₽ (соисполнитель — вручную; technical — опционально)';
