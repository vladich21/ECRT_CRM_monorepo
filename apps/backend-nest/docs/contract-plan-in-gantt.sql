-- Чекбокс «Планировать договор в диаграмме Ганта».
-- По умолчанию true — текущие договоры остаются в Ганте, пока не снимут галочку.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS plan_in_gantt boolean NOT NULL DEFAULT true;
