-- Реестр ПО: один файл не заводится двумя версиями одной прошивки.
-- Хеш считает хранилище по всем байтам, совпадение — тот же файл.
--
-- На стенде перед применением убрать дубли внутри прошивки
-- (одинаковый sha256 при разных номерах версии). Идемпотентно.

SET client_encoding TO 'UTF8';

CREATE UNIQUE INDEX IF NOT EXISTS sw_firmware_versions_sha256_uidx
  ON sw_firmware_versions (firmware_id, sha256)
  WHERE record_state <> 'deleted' AND sha256 IS NOT NULL;

COMMENT ON COLUMN sw_firmware_versions.sha256 IS 'SHA-256 файла; уникален внутри прошивки, пока запись не удалена';
