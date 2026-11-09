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
