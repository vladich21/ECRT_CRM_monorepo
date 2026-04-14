-- Статусы РИД: фиксированный перечень и перенос существующих записей patents.status_id

ALTER TABLE "ref_patent_statuses" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;

-- Канонические статусы (если строки с таким name ещё нет — добавляем)
INSERT INTO "ref_patent_statuses" ("name", "sort_order", "created_at")
SELECT v.name, v.sort_order, now()
FROM (VALUES
  ('Подготовка документации', 1),
  ('Сдано в ЦИР', 2),
  ('Заявка подана / на рассмотрении в ведомстве', 3),
  ('На рассмотрении, запрос', 4),
  ('Отказ в выдаче', 5),
  ('Решение о выдаче', 6),
  ('Выдан патент', 7)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "ref_patent_statuses" r WHERE r.name = v.name
);

UPDATE "ref_patent_statuses" AS r
SET "sort_order" = v.sort_order,
    "updated_at" = now()
FROM (VALUES
  ('Подготовка документации', 1),
  ('Сдано в ЦИР', 2),
  ('Заявка подана / на рассмотрении в ведомстве', 3),
  ('На рассмотрении, запрос', 4),
  ('Отказ в выдаче', 5),
  ('Решение о выдаче', 6),
  ('Выдан патент', 7)
) AS v(name, sort_order)
WHERE r.name = v.name;

-- Целевой canonical name для каждой старой строки справочника
-- (DROP — чтобы повторный запуск в той же сессии DBeaver не падал на «already exists»)
DROP TABLE IF EXISTS _patent_status_canon;
DROP TABLE IF EXISTS _patent_status_target;

CREATE TEMP TABLE _patent_status_target AS
SELECT
  old_s.id AS old_id,
  (CASE
    WHEN old_s.name IS NULL OR trim(old_s.name) = '' THEN 'Подготовка документации'
    WHEN lower(trim(old_s.name)) = lower('Подготовка документации') THEN 'Подготовка документации'
    WHEN lower(trim(old_s.name)) = lower('Сдано в ЦИР') THEN 'Сдано в ЦИР'
    WHEN lower(trim(old_s.name)) = lower('Заявка подана / на рассмотрении в ведомстве') THEN 'Заявка подана / на рассмотрении в ведомстве'
    WHEN lower(trim(old_s.name)) = lower('Заявка подана или на рассмотрении в ведомстве') THEN 'Заявка подана / на рассмотрении в ведомстве'
    WHEN lower(trim(old_s.name)) = lower('На рассмотрении, запрос') THEN 'На рассмотрении, запрос'
    WHEN lower(trim(old_s.name)) = lower('Отказ в выдаче') THEN 'Отказ в выдаче'
    WHEN lower(trim(old_s.name)) = lower('Решение о выдаче') THEN 'Решение о выдаче'
    WHEN lower(trim(old_s.name)) = lower('Выдан патент') THEN 'Выдан патент'
    WHEN lower(trim(old_s.name)) = lower('Подана заявка') THEN 'Заявка подана / на рассмотрении в ведомстве'
    WHEN lower(trim(old_s.name)) = lower('На рассмотрении') THEN 'На рассмотрении, запрос'
    WHEN lower(trim(old_s.name)) IN (
      'выдан', 'патент выдан', 'зарегистрирован', 'действует', 'патент действует', 'выдано'
    ) THEN 'Выдан патент'
    WHEN lower(trim(old_s.name)) LIKE '%отказ%выдач%' OR lower(trim(old_s.name)) IN ('отказ', 'отклонено') THEN 'Отказ в выдаче'
    WHEN lower(trim(old_s.name)) LIKE '%решение%выдач%'
      OR lower(trim(old_s.name)) LIKE '%положительное решение%' THEN 'Решение о выдаче'
    WHEN lower(trim(old_s.name)) IN ('на рассмотрении, запрос')
      OR lower(trim(old_s.name)) LIKE '%ответ на запрос%'
      OR (
        lower(trim(old_s.name)) LIKE '%запрос%'
        AND lower(trim(old_s.name)) NOT LIKE '%ведомств%'
        AND lower(trim(old_s.name)) NOT LIKE '%заявк%'
      ) THEN 'На рассмотрении, запрос'
    WHEN lower(trim(old_s.name)) LIKE '%заявк%'
      OR lower(trim(old_s.name)) LIKE '%ведомств%'
      OR lower(trim(old_s.name)) LIKE '%подач%'
      OR lower(trim(old_s.name)) LIKE '%рассмотрени%в ведомстве%' THEN 'Заявка подана / на рассмотрении в ведомстве'
    WHEN lower(trim(old_s.name)) LIKE '%цир%' THEN 'Сдано в ЦИР'
    WHEN lower(trim(old_s.name)) IN (
      'активен', 'не активен', 'активный', 'неактивен', 'активно', 'не активно',
      'активна', 'не активна'
    ) THEN 'Подготовка документации'
    WHEN lower(trim(old_s.name)) LIKE '%подготов%'
      OR lower(trim(old_s.name)) IN ('черновик', 'документация', 'в работе') THEN 'Подготовка документации'
    ELSE 'Подготовка документации'
  END)::varchar AS target_name
FROM "ref_patent_statuses" AS old_s;

CREATE TEMP TABLE _patent_status_canon AS
SELECT t.target_name, min(r.id) AS canon_id
FROM _patent_status_target t
JOIN "ref_patent_statuses" r ON r.name = t.target_name
GROUP BY t.target_name;

-- Патенты → один id на каждый канонический статус
UPDATE "patents" AS p
SET "status_id" = c.canon_id,
    "updated_at" = now()
FROM _patent_status_target t
JOIN _patent_status_canon c ON c.target_name = t.target_name
WHERE p.status_id = t.old_id;

-- Дубликаты справочника с одинаковым name
DELETE FROM "ref_patent_statuses" AS older
WHERE EXISTS (
  SELECT 1 FROM "ref_patent_statuses" AS keeper
  WHERE keeper.name = older.name AND keeper.id < older.id
);

DELETE FROM "ref_patent_statuses"
WHERE name NOT IN (
  'Подготовка документации',
  'Сдано в ЦИР',
  'Заявка подана / на рассмотрении в ведомстве',
  'На рассмотрении, запрос',
  'Отказ в выдаче',
  'Решение о выдаче',
  'Выдан патент'
);

UPDATE "patents" AS p
SET "status_id" = d.id,
    "updated_at" = now()
FROM (SELECT id FROM "ref_patent_statuses" WHERE name = 'Подготовка документации' LIMIT 1) AS d
WHERE p.status_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "ref_patent_statuses" s WHERE s.id = p.status_id);
