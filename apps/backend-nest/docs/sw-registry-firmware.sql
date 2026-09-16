-- Реестр ПО: прошивки программного обеспечения и версии их сборок.
--
-- У программы бывает несколько прошивок (загрузчик, основное ПО, образ ПЛИС),
-- у каждой — своя линия версий. Поэтому прошивка это запись с наименованием,
-- а сборки лежат в sw_firmware_versions: номер версии уникален внутри прошивки,
-- а не в пределах всей программы.
--
-- Выполнять на pmdb_stage, затем на проде. Идемпотентно.

SET client_encoding TO 'UTF8';

BEGIN;

-- Первая редакция таблицы держала версию и файл прямо в прошивке. Данных в ней
-- нет ни на стенде, ни на проде, поэтому раскладываем на две таблицы сразу.
DROP TABLE IF EXISTS sw_firmwares;

CREATE TABLE IF NOT EXISTS sw_firmwares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id uuid NOT NULL,
  name varchar(255) NOT NULL,
  note varchar(1000),
  record_state varchar(20) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS sw_firmwares_name_uidx
  ON sw_firmwares (software_id, name)
  WHERE record_state <> 'deleted';
CREATE INDEX IF NOT EXISTS sw_firmwares_software_idx ON sw_firmwares (software_id);

CREATE TABLE IF NOT EXISTS sw_firmware_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firmware_id uuid NOT NULL REFERENCES sw_firmwares (id) ON DELETE CASCADE,
  version varchar(50) NOT NULL,
  built_at date,
  note varchar(1000),
  -- Копия в files-service: сборки бывают до десятка гигабайт, поэтому в реестре
  -- лежит только ссылка, байты хранит файловый сервис.
  file_id uuid NOT NULL,
  filename varchar(255) NOT NULL,
  size_bytes bigint,
  sha256 varchar(64),
  record_state varchar(20) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS sw_firmware_versions_uidx
  ON sw_firmware_versions (firmware_id, version)
  WHERE record_state <> 'deleted';
CREATE UNIQUE INDEX IF NOT EXISTS sw_firmware_versions_sha256_uidx
  ON sw_firmware_versions (firmware_id, sha256)
  WHERE record_state <> 'deleted' AND sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS sw_firmware_versions_firmware_idx
  ON sw_firmware_versions (firmware_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sw_firmware_versions_file_idx ON sw_firmware_versions (file_id);

COMMENT ON TABLE sw_firmwares IS 'Прошивки программного обеспечения: наименование, своя линия версий у каждой';
COMMENT ON TABLE sw_firmware_versions IS 'Сборки прошивки: номер версии, дата сборки и файл';
COMMENT ON COLUMN sw_firmware_versions.version IS 'Номер версии, уникален внутри своей прошивки';
COMMENT ON COLUMN sw_firmware_versions.size_bytes IS 'Размер файла: сборки крупные, показываем без обращения к хранилищу';

COMMIT;
