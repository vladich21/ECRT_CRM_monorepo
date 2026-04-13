-- Отделы: только название + связь с HR; убираем короткое имя, иерархию, руководителя, флаг активности
ALTER TABLE "departments" DROP COLUMN IF EXISTS "short_name";
ALTER TABLE "departments" DROP COLUMN IF EXISTS "parent_id";
ALTER TABLE "departments" DROP COLUMN IF EXISTS "manager_id";
ALTER TABLE "departments" DROP COLUMN IF EXISTS "is_active";
