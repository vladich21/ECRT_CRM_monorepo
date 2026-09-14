-- Реестр ПО: происхождение файла из SVN конструкторов.
-- Выполнять на pmdb_stage, затем на проде. Идемпотентно.

SET client_encoding TO 'UTF8';

BEGIN;

ALTER TABLE sw_files ADD COLUMN IF NOT EXISTS svn_path varchar(1000);
ALTER TABLE sw_files ADD COLUMN IF NOT EXISTS svn_revision integer;
ALTER TABLE sw_files ADD COLUMN IF NOT EXISTS svn_repo_uuid varchar(40);

COMMENT ON COLUMN sw_files.svn_path IS 'Путь файла внутри репозитория SVN конструкторов';
COMMENT ON COLUMN sw_files.svn_revision IS 'Ревизия SVN на момент переноса файла в реестр';
COMMENT ON COLUMN sw_files.svn_repo_uuid IS 'UUID репозитория: сменился — ревизии несопоставимы';

CREATE INDEX IF NOT EXISTS sw_files_svn_path_idx ON sw_files (svn_path) WHERE svn_path IS NOT NULL;

-- Каталог программы в SVN: из него берётся её документация.
ALTER TABLE sw_items ADD COLUMN IF NOT EXISTS svn_path varchar(1000);
COMMENT ON COLUMN sw_items.svn_path IS 'Каталог программы в SVN конструкторов';

COMMIT;
