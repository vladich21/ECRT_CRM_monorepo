-- ФС-1 «Запрос и проработка»: таблицы + справочники (постановка §6).
-- DBeaver: без \set. Сначала pmdb_stage.
-- Как Гант / Реестр ПО: CI этот файл не гоняет. Смежные (contracts, partners, users) не меняем.

SET client_encoding TO 'UTF8';

BEGIN;

CREATE SEQUENCE IF NOT EXISTS purchase_request_number_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE TABLE IF NOT EXISTS ref_purchase_selection_reasons (
  code varchar(40) PRIMARY KEY,
  name varchar(60) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS ref_purchase_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL,
  name varchar(60) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS ref_purchase_methods_code_uidx
  ON ref_purchase_methods (code);

CREATE TABLE IF NOT EXISTS purchase_method_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method_id uuid NOT NULL REFERENCES ref_purchase_methods (id),
  amount_from numeric(15, 2),
  amount_to numeric(15, 2),
  vat_base varchar(10) NOT NULL DEFAULT 'net',
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS purchase_method_thresholds_method_idx
  ON purchase_method_thresholds (method_id);

CREATE TABLE IF NOT EXISTS purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL DEFAULT nextval('purchase_request_number_seq'),
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  status varchar(20) NOT NULL DEFAULT 'draft',
  project_id uuid NOT NULL,
  income_contract_id uuid,
  income_stage_id uuid,
  subject varchar(2000) NOT NULL,
  justification varchar(2000) NOT NULL,
  required_date date NOT NULL,
  department_id uuid NOT NULL,
  tech_acceptor_id uuid NOT NULL,
  expert_price numeric(15, 2),
  amount numeric(15, 2),
  currency_code varchar(3) NOT NULL DEFAULT 'RUB',
  vat_rate_id uuid,
  vat_included boolean NOT NULL DEFAULT true,
  funding_source varchar(30) NOT NULL,
  price_method varchar(30),
  price_method_note text,
  initial_max_price numeric(15, 2),
  nmcd_snapshot jsonb,
  is_urgent boolean NOT NULL DEFAULT false,
  selected_quote_id uuid,
  selection_note text,
  purchase_method_id uuid REFERENCES ref_purchase_methods (id),
  method_justification text,
  initiator_id uuid NOT NULL,
  lead_manager_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_requests_number_uidx
  ON purchase_requests (number);
CREATE INDEX IF NOT EXISTS purchase_requests_status_idx
  ON purchase_requests (status);
CREATE INDEX IF NOT EXISTS purchase_requests_project_idx
  ON purchase_requests (project_id);
CREATE INDEX IF NOT EXISTS purchase_requests_income_contract_idx
  ON purchase_requests (income_contract_id);
CREATE INDEX IF NOT EXISTS purchase_requests_urgent_idx
  ON purchase_requests (is_urgent);

CREATE TABLE IF NOT EXISTS purchase_request_suppliers (
  request_id uuid NOT NULL REFERENCES purchase_requests (id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  warning_snapshot jsonb,
  PRIMARY KEY (request_id, partner_id)
);

CREATE TABLE IF NOT EXISTS purchase_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES purchase_requests (id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  quote_number varchar(60),
  quote_date date,
  valid_until date,
  price numeric(15, 2) NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'RUB',
  vat_rate_id uuid,
  delivery_days integer,
  warranty_months integer,
  contact_name text,
  comment text,
  excluded_from_nmcd boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_quotes_request_partner_uidx
  ON purchase_quotes (request_id, partner_id);
CREATE INDEX IF NOT EXISTS purchase_quotes_request_idx
  ON purchase_quotes (request_id);

CREATE TABLE IF NOT EXISTS purchase_quote_payment_terms (
  quote_id uuid NOT NULL REFERENCES purchase_quotes (id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  share numeric(5, 2) NOT NULL,
  payment_type varchar(20) NOT NULL,
  days integer,
  day_kind varchar(12),
  base_event varchar(40),
  PRIMARY KEY (quote_id, line_no)
);

CREATE TABLE IF NOT EXISTS purchase_request_selection_reasons (
  request_id uuid NOT NULL REFERENCES purchase_requests (id) ON DELETE CASCADE,
  reason_code varchar(40) NOT NULL REFERENCES ref_purchase_selection_reasons (code),
  PRIMARY KEY (request_id, reason_code)
);

DO $$ BEGIN
  ALTER TABLE purchase_requests
    ADD CONSTRAINT purchase_requests_selected_quote_fk
    FOREIGN KEY (selected_quote_id) REFERENCES purchase_quotes (id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO ref_purchase_selection_reasons (code, name, sort_order) VALUES
  ('lowest_price',             'Наименьшая цена',                      10),
  ('best_payment_terms',       'Лучшие условия оплаты',                20),
  ('delivery_deadline',        'Соблюдение срока поставки',            30),
  ('long_term_relations',      'Долгосрочные отношения',               40),
  ('sole_supplier',            'Единственный поставщик',               50),
  ('technical_recommendation', 'Рекомендация технического специалиста', 60)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO ref_purchase_methods (id, code, name, sort_order)
SELECT gen_random_uuid(), v.code, v.name, v.sort_order
FROM (VALUES
  ('small',      'До 100 тыс. ₽',                 10),
  ('medium',     'Свыше 100 до 500 тыс. ₽',       20),
  ('commission', 'Свыше 500 тыс. ₽ (комиссия)',   30)
) AS v(code, name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM ref_purchase_methods m WHERE m.code = v.code);

INSERT INTO purchase_method_thresholds (method_id, amount_from, amount_to, vat_base, is_active)
SELECT m.id, t.amount_from, t.amount_to, 'net', true
FROM ref_purchase_methods m
JOIN (VALUES
  ('small',      NULL::numeric, 100000::numeric),
  ('medium',     100000::numeric, 500000::numeric),
  ('commission', 500000::numeric, NULL::numeric)
) AS t(code, amount_from, amount_to) ON t.code = m.code
WHERE NOT EXISTS (
  SELECT 1 FROM purchase_method_thresholds x WHERE x.method_id = m.id
);

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

COMMENT ON SEQUENCE purchase_request_number_seq IS 'Номер запроса на закупку; не MAX+1';
COMMENT ON COLUMN purchase_requests.funding_source IS 'income_contract | investment_program | budget';
COMMENT ON COLUMN purchase_requests.status IS 'draft | pending_approval | in_elaboration | in_agreement | agreed | rejected';
COMMENT ON COLUMN purchase_method_thresholds.vat_base IS 'ОВ-46: net без НДС (БП-1 сейчас), gross — с НДС';
COMMENT ON COLUMN purchase_method_thresholds.amount_from IS 'Нижняя граница исключительно';
COMMENT ON COLUMN purchase_method_thresholds.amount_to IS 'Верхняя граница включительно';
COMMENT ON TABLE purchase_request_events IS 'Журнал: created | updated | income_link_changed | lead_assigned | supplier_added | quote_* | price_fixed | supplier_selected';
COMMENT ON COLUMN purchase_request_events.action IS 'created | updated | income_link_changed | lead_assigned | supplier_added | quote_added | quote_updated | price_fixed | supplier_selected';
COMMENT ON COLUMN purchase_requests.nmcd_snapshot IS 'S10: состав НМЦД на момент фиксации (method, amount, included, excluded)';

COMMIT;
