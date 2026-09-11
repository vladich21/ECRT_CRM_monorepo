-- S10: снимок состава НМЦД (вошло / исключено / отклонение) — ЗАП-22.
-- DBeaver: Execute SQL Script. CI не гоняет.
-- Если только что была ошибка 25P02 — сначала выполни ОДНУ команду: ROLLBACK;

ROLLBACK;

ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS nmcd_snapshot jsonb;

COMMENT ON COLUMN purchase_requests.nmcd_snapshot IS
  'S10: состав НМЦД на момент фиксации (method, amount, included, excluded)';
