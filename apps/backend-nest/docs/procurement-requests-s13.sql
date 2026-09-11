-- S13: связь запроса с порождённым документом оформления (ВИ-7).
-- Расходный договор живёт в contracts; здесь только ссылка для цепочки S14.
-- DBeaver: Execute SQL Script. CI не гоняет.
-- Если только что была ошибка 25P02 — сначала выполни ОДНУ команду: ROLLBACK;

ROLLBACK;

CREATE TABLE IF NOT EXISTS purchase_request_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES purchase_requests (id) ON DELETE CASCADE,
  kind varchar(20) NOT NULL,
  entity_type varchar(40) NOT NULL DEFAULT 'contract',
  entity_id uuid NOT NULL,
  base_contract_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS purchase_request_documents_request_idx
  ON purchase_request_documents (request_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_request_documents_request_contract_uidx
  ON purchase_request_documents (request_id)
  WHERE kind = 'contract';

COMMENT ON TABLE purchase_request_documents IS
  'S13: запрос → расходный договор (и позже ДС/заказ). Цепочка S14 читает отсюда, не кэш.';
