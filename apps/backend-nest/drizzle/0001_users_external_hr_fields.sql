ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "external_user_id" uuid;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "personnel_number" varchar(32);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hired_at" date;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "quit_date" date;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "internal_phone" varchar(32);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "supervisor_id" uuid;

CREATE UNIQUE INDEX IF NOT EXISTS "users_external_user_id_uidx" ON "users" ("external_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_supervisor_id_users_id_fk'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_supervisor_id_users_id_fk"
      FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;
