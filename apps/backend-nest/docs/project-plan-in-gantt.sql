-- Чекбокс «Планировать в диаграмме Ганта» на проекте.
-- По умолчанию true — текущие проекты остаются в Ганте, пока не снимут галочку.
-- В иерархию попадают проекты с plan_in_gantt = true и их договоры с plan_in_gantt = true.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS plan_in_gantt boolean NOT NULL DEFAULT true;
