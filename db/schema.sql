-- Applied by `npm run db:migrate`. Every statement is idempotent so it can run again safely.

create table if not exists site_stats (
  id smallint primary key default 1 check (id = 1),
  projects_delivered integer not null check (projects_delivered between 0 and 9999),
  core_frameworks integer not null check (core_frameworks between 0 and 9999),
  updated_at timestamptz not null default now()
);

create table if not exists partners (
  id serial primary key,
  position integer not null,
  name text not null check (length(name) between 1 and 80)
);

-- Optional logo file in the `documents` bucket under logos/<logo_id>; null shows the name instead.
alter table partners add column if not exists logo_id text;

create table if not exists projects (
  id serial primary key,
  position integer not null,
  name text not null,
  discipline text not null check (discipline in ('Frontend', 'Backend', 'UI/UX Designer')),
  file text not null,
  kind text not null,
  client text not null,
  headline text not null,
  project text not null,
  description text not null,
  type text not null,
  stack text not null,
  role text not null
);

-- Optional image in the `documents` bucket under shots/<image_id>, shown instead of the sketch.
alter table projects add column if not exists image_id text;

-- Several images per project, in display order. Replaces image_id: an existing single image is copied over.
-- image_id stays so the previous API keeps working until the new one is deployed; nothing reads it after that.
alter table projects add column if not exists image_ids text[] not null default '{}';
update projects set image_ids = array[image_id] where image_id is not null and cardinality(image_ids) = 0;

-- The stack as a list of { name, icon, hex } (icon is a Simple Icons slug, null for a custom entry).
-- The plain `stack` text keeps the names, so older readers still work; existing text is split once.
alter table projects add column if not exists stack_items jsonb not null default '[]'::jsonb;
update projects set stack_items = coalesce(
  (select jsonb_agg(jsonb_build_object('name', trim(x), 'icon', null, 'hex', null))
     from unnest(string_to_array(stack, ',')) as x where trim(x) <> ''),
  '[]'::jsonb)
where stack_items = '[]'::jsonb;

-- Job description of the project, one task per item, shown in a dialog on the site.
alter table projects add column if not exists duties text[] not null default '{}';

-- Optional live address of the project, shown as a link in the details.
alter table projects add column if not exists url text;

-- "Main job" was renamed to "Professional work"; existing rows are converted.
alter table projects drop constraint if exists projects_kind_check;
update projects set kind = 'Professional work' where kind = 'Main job';
alter table projects add constraint projects_kind_check check (kind in ('Professional work', 'Freelance'));

create table if not exists experience (
  id serial primary key,
  position integer not null,
  period text not null,
  place text not null default '',
  title text not null,
  org text not null,
  is_current boolean not null default false,
  points jsonb not null default '[]'::jsonb,
  tools text[] not null default '{}'
);

-- The PDF itself lives in the `documents` bucket; this row points at it.
create table if not exists cv_file (
  id smallint primary key default 1 check (id = 1),
  object_key text not null,
  filename text not null,
  size_bytes integer not null check (size_bytes > 0),
  updated_at timestamptz not null default now()
);

-- Project board in /mydashboard (separate from the portfolio's projects above).
-- Projects hold the details; tasks belong to a project and sit in a status column.
create table if not exists board_projects (
  id serial primary key,
  title text not null check (length(title) between 1 and 120),
  kind text not null default 'Freelance' check (kind in ('Professional', 'Freelance')),
  description text not null default '' check (length(description) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists board_tasks (
  id serial primary key,
  project_id integer not null references board_projects (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- The first version kept the status on projects and a done flag on tasks; both tables were empty when it changed.
alter table board_projects add column if not exists kind text not null default 'Freelance' check (kind in ('Professional', 'Freelance'));
alter table board_projects drop column if exists status;
alter table board_projects drop column if exists position;
alter table board_tasks add column if not exists status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done'));
alter table board_tasks drop column if exists done;

drop index if exists board_tasks_project_idx;
create index if not exists board_tasks_status_idx on board_tasks (status, position);

-- Notes on a board project, shown in the notes dialog on its page.
create table if not exists board_notes (
  id serial primary key,
  project_id integer not null references board_projects (id) on delete cascade,
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists board_notes_project_idx on board_notes (project_id, created_at desc);

-- Features of a board project; a task can belong to one. Removing a feature keeps its tasks.
create table if not exists board_features (
  id serial primary key,
  project_id integer not null references board_projects (id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create unique index if not exists board_features_name_idx on board_features (project_id, lower(name));

alter table board_tasks add column if not exists feature_id integer references board_features (id) on delete set null;

-- Links on a board project, as a list of { label, url }, shown under its name.
alter table board_projects add column if not exists links jsonb not null default '[]'::jsonb;

-- When a task reached Selesai; cleared if it moves back out.
alter table board_tasks add column if not exists done_at timestamptz;

-- Ruang Lari in /mydashboard: the logged runs, and the two dates the training plan is built from.
-- A route is a list of [latitude, longitude] pairs.
create table if not exists runs (
  id serial primary key,
  run_date date not null,
  km numeric(6, 2) not null check (km > 0 and km <= 200),
  seconds integer check (seconds is null or seconds between 1 and 172800),
  note text not null default '' check (length(note) <= 500),
  route jsonb,
  created_at timestamptz not null default now()
);

create index if not exists runs_date_idx on runs (run_date desc, id desc);

create table if not exists run_settings (
  id integer primary key default 1 check (id = 1),
  birthday date not null,
  start_date date not null,
  updated_at timestamptz not null default now()
);

-- Ruang Vocabulary in /mydashboard: one row per day that was opened, with the five new
-- words handed out that day, the five to review, and the ones ticked off.
create table if not exists vocab_days (
  day date primary key,
  new_words text[] not null,
  review_words text[] not null,
  done_words text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Ruang TV in /mydashboard: films and series, with the platform each is on.
create table if not exists tv_items (
  id serial primary key,
  title text not null check (length(title) between 1 and 200),
  kind text not null check (kind in ('Film', 'Series')),
  platform text not null check (length(platform) between 1 and 40),
  status text not null default 'done' check (status in ('watching', 'planned', 'done')),
  rating smallint check (rating is null or rating between 1 and 5),
  watched_on date,
  note text not null default '' check (length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
