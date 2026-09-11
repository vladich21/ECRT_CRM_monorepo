-- S9: справочник ставок НДС для КП (и vat_rate_id запроса).
-- DBeaver: Execute SQL Script. CI не гоняет.
-- Если только что была ошибка 25P02 — сначала выполни ОДНУ команду: ROLLBACK;

ROLLBACK;

CREATE TABLE IF NOT EXISTS ref_vat_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) NOT NULL,
  name varchar(80) NOT NULL,
  rate numeric(5, 2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS ref_vat_rates_code_uidx
  ON ref_vat_rates (code);

INSERT INTO ref_vat_rates (code, name, rate, sort_order)
VALUES
  ('0', '0%', 0, 10),
  ('5', '5%', 5, 20),
  ('7', '7%', 7, 30),
  ('10', '10%', 10, 40),
  ('20', '20%', 20, 50),
  ('22', '22%', 22, 60)
ON CONFLICT (code) DO NOTHING;

DO $$ BEGIN
  ALTER TABLE purchase_quotes
    ADD CONSTRAINT purchase_quotes_vat_rate_fk
    FOREIGN KEY (vat_rate_id) REFERENCES ref_vat_rates (id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE purchase_requests
    ADD CONSTRAINT purchase_requests_vat_rate_fk
    FOREIGN KEY (vat_rate_id) REFERENCES ref_vat_rates (id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
