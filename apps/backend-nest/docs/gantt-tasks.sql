-- Gantt: задачи / подзадачи / назначения / списания часов / связи.
-- Прогон вручную в DBeaver/psql.

CREATE TABLE IF NOT EXISTS gantt_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL,
  parent_id uuid,
  name varchar(500) NOT NULL,
  start_date date,
  end_date date,
  deadline date,
  progress integer NOT NULL DEFAULT 0,
  status varchar(50) NOT NULL DEFAULT 'open',
  planned_hours numeric(12, 2) NOT NULL DEFAULT 0,
  responsible_user_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid,
  updated_by uuid,
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS gantt_tasks_stage_idx ON gantt_tasks (stage_id);
CREATE INDEX IF NOT EXISTS gantt_tasks_parent_idx ON gantt_tasks (parent_id);
CREATE INDEX IF NOT EXISTS gantt_tasks_responsible_idx ON gantt_tasks (responsible_user_id);

CREATE TABLE IF NOT EXISTS gantt_task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS gantt_task_assignees_user_idx ON gantt_task_assignees (user_id);

CREATE TABLE IF NOT EXISTS gantt_task_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  work_date date NOT NULL,
  hours numeric(8, 2) NOT NULL,
  comment text,
  external_id varchar(255),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS gantt_time_entries_task_idx ON gantt_task_time_entries (task_id);
CREATE INDEX IF NOT EXISTS gantt_time_entries_user_idx ON gantt_task_time_entries (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS gantt_time_entries_external_uidx
  ON gantt_task_time_entries (external_id)
  WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS gantt_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id uuid NOT NULL,
  target_task_id uuid NOT NULL,
  link_type varchar(10) NOT NULL DEFAULT 'e2s',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gantt_links_source_idx ON gantt_links (source_task_id);
CREATE INDEX IF NOT EXISTS gantt_links_target_idx ON gantt_links (target_task_id);

COMMENT ON TABLE gantt_tasks IS 'Задачи/подзадачи диаграммы Ганта под contract_stages';
COMMENT ON TABLE gantt_task_time_entries IS 'Списания часов (таймшит → SRN); факт = SUM(hours)';
