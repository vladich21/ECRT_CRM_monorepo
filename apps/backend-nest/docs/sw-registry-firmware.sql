-- Реестр ПО: прошивки программного обеспечения с версиями.
-- Выполнять на pmdb_stage, затем на проде. Идемпотентно.

SET client_encoding TO 'UTF8';

BEGIN;

CREATE TABLE IF NOT EXISTS sw_firmwares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id uuid NOT NULL,
  version varchar(50) NOT NULL,
  built_at date,
  note varchar(1000),
  -- Копия в files-service: прошивки бывают до десятка гигабайт, поэтому в реестре
  -- лежит только ссылка, байты хранит файловый сервис.
  file_id uuid NOT NULL,
  filename varchar(255) NOT NULL,
  size_bytes bigint,
  sha256 varchar(64),
  record_state varchar(20) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS sw_firmwares_version_uidx
  ON sw_firmwares (software_id, version)
  WHERE record_state <> 'deleted';
CREATE INDEX IF NOT EXISTS sw_firmwares_software_idx ON sw_firmwares (software_id);
CREATE INDEX IF NOT EXISTS sw_firmwares_file_idx ON sw_firmwares (file_id);

COMMENT ON TABLE sw_firmwares IS 'Прошивки программного обеспечения: версия, дата сборки и файл';
COMMENT ON COLUMN sw_firmwares.version IS 'Номер версии прошивки, уникален в пределах программы';
COMMENT ON COLUMN sw_firmwares.size_bytes IS 'Размер файла: прошивки крупные, показываем без обращения к хранилищу';

COMMIT;
