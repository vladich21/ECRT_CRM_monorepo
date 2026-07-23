-- Ручная блокировка контрагента + юр. проверка.
-- Прогон вручную в DBeaver/psql.
--
-- Оставить:
--   partners.is_manually_blocked  — ручная блокировка всего контрагента
--   partners.legal_check_failed   — «Проверка не пройдена»
--
-- Убрать (если успели добавить для ручной блокировки по проекту):
--   supplier_partner_project_blocks.comment

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS is_manually_blocked boolean NOT NULL DEFAULT false;

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS legal_check_failed boolean NOT NULL DEFAULT false;

-- Откат колонки, которая нужна была только для ручной блокировки по проекту.
ALTER TABLE supplier_partner_project_blocks
  DROP COLUMN IF EXISTS comment;

COMMENT ON COLUMN partners.is_manually_blocked IS
  'Ручная блокировка контрагента целиком; авто-деривация статуса её не снимает.';

COMMENT ON COLUMN partners.legal_check_failed IS
  'Явный отказ по юр. проверке («Проверка не пройдена»), вручную со вкладки verification.';
