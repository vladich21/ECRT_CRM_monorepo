-- S5: журнал действий запроса (ВИ-3). Для баз, где уже прогнан procurement-requests.sql.
-- DBeaver, без \set. CI не гоняет.

SET client_encoding TO 'UTF8';

BEGIN;

CREATE TABLE IF NOT EXISTS purchase_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES purchase_requests (id) ON DELETE CASCADE,
  action varchar(40) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  comment text,
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_request_events_request_idx
  ON purchase_request_events (request_id, created_at DESC);

COMMENT ON TABLE purchase_request_events IS 'S5 журнал: created | updated | income_link_changed; payload.from/to снимок связи';
COMMENT ON COLUMN purchase_request_events.action IS 'created | updated | income_link_changed';

COMMIT;
