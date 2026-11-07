-- Umber Studio, étape 1 : le socle.
-- Comptes, clients, projets, 8 espaces par projet, tâches, commentaires
-- avec mentions, fichiers, boîte de réception, accès par espace.

create extension if not exists pgcrypto;

create type user_role as enum ('owner', 'team', 'freelance', 'client', 'none');
create type task_status as enum ('todo', 'doing', 'blocked', 'review', 'done');
create type access_level as enum ('view', 'edit');

-- ---------------------------------------------------------------- tables

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text not null default '',
  role user_role not null default 'none',
  color text not null default '#2B4566',
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  note text not null default '',
  created_by uuid references profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete cascade,
  name text not null,
  event_date date,
  place text not null default '',
  status text not null default 'cadrage' check (status in ('cadrage', 'en_cours', 'termine')),
  created_at timestamptz not null default now()
);
create index on projects (client_id);

create table space_access (
  project_id uuid not null references projects on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  space smallint not null check (space between 1 and 8),
  level access_level not null,
  primary key (project_id, user_id, space)
);
create index on space_access (user_id);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  space smallint not null check (space between 1 and 8),
  title text not null,
  description text not null default '',
  status task_status not null default 'todo',
  assignee_id uuid references profiles on delete set null,
  due_date date,
  priority text not null default 'normale' check (priority in ('basse', 'normale', 'haute')),
  group_label text not null default '',
  position double precision not null default 0,
  created_by uuid references profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on tasks (project_id, space);
create index on tasks (assignee_id);

create table comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  space smallint not null check (space between 1 and 8),
  task_id uuid references tasks on delete cascade,
  author_id uuid references profiles on delete set null default auth.uid(),
  body text not null,
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on comments (project_id, space);
create index on comments (task_id);

create table files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  space smallint not null check (space between 1 and 8),
  name text not null,
  path text not null unique,
  size bigint not null default 0,
  mime text not null default '',
  uploaded_by uuid references profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on files (project_id, space);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  actor_id uuid references profiles on delete set null,
  kind text not null check (kind in ('mention', 'assigned', 'comment')),
  project_id uuid references projects on delete cascade,
  space smallint,
  task_id uuid references tasks on delete cascade,
  excerpt text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);

-- Invitations : appliquées à la création du compte (voir handle_new_user).
-- access = [{"project_id": "...", "space": 1, "level": "edit"}, ...]
create table invitations (
  email text primary key,
  full_name text not null default '',
  role user_role not null,
  access jsonb not null default '[]',
  invited_by uuid references profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- helpers

create function my_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('owner', 'team') from profiles where id = auth.uid()), false)
$$;

create function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'owner' from profiles where id = auth.uid()), false)
$$;

create function user_can_view_space(uid uuid, p uuid, s int) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = uid and role in ('owner', 'team'))
      or exists (select 1 from space_access where project_id = p and user_id = uid and space = s)
$$;

create function can_view_space(p uuid, s int) returns boolean
language sql stable security definer set search_path = public as $$
  select user_can_view_space(auth.uid(), p, s)
$$;

create function can_edit_space(p uuid, s int) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff()
      or exists (select 1 from space_access
                 where project_id = p and user_id = auth.uid() and space = s and level = 'edit')
$$;

create function can_view_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff()
      or exists (select 1 from space_access where project_id = p and user_id = auth.uid())
$$;

create function shares_project(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from space_access a join space_access b on a.project_id = b.project_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

-- --------------------------------------------------------------- RLS

alter table profiles enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table space_access enable row level security;
alter table tasks enable row level security;
alter table comments enable row level security;
alter table files enable row level security;
alter table notifications enable row level security;
alter table invitations enable row level security;

-- Profils : soi-même, l'équipe Umber, et les personnes d'un même projet.
create policy profiles_select on profiles for select using (
  id = auth.uid() or is_staff() or role in ('owner', 'team') or shares_project(id)
);
create policy profiles_update_self on profiles for update using (id = auth.uid() or is_owner());

-- Seule la propriétaire change un rôle.
create function protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not is_owner() then
    raise exception 'Seule la propriétaire peut changer un rôle';
  end if;
  if new.email is distinct from old.email then
    new.email := old.email;
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on profiles
  for each row execute function protect_role();

create policy clients_select on clients for select using (
  is_staff() or exists (select 1 from projects p where p.client_id = clients.id and can_view_project(p.id))
);
create policy clients_write on clients for all using (is_staff()) with check (is_staff());

create policy projects_select on projects for select using (can_view_project(id));
create policy projects_write on projects for all using (is_staff()) with check (is_staff());

create policy access_select on space_access for select using (
  is_staff() or user_id = auth.uid() or can_view_project(project_id)
);
create policy access_write on space_access for all using (is_staff()) with check (is_staff());

create policy tasks_select on tasks for select using (can_view_space(project_id, space));
create policy tasks_insert on tasks for insert with check (can_edit_space(project_id, space));
create policy tasks_update on tasks for update using (can_edit_space(project_id, space))
  with check (can_edit_space(project_id, space));
create policy tasks_delete on tasks for delete using (can_edit_space(project_id, space));

-- Un accès en lecture suffit pour commenter (un client peut valider une proposition).
create policy comments_select on comments for select using (can_view_space(project_id, space));
create policy comments_insert on comments for insert with check (
  author_id = auth.uid() and can_view_space(project_id, space)
);
create policy comments_delete on comments for delete using (author_id = auth.uid() or is_staff());

create policy files_select on files for select using (can_view_space(project_id, space));
create policy files_insert on files for insert with check (can_edit_space(project_id, space));
create policy files_delete on files for delete using (can_edit_space(project_id, space));

create policy notif_select on notifications for select using (user_id = auth.uid());
create policy notif_update on notifications for update using (user_id = auth.uid());
create policy notif_delete on notifications for delete using (user_id = auth.uid());

create policy invitations_staff on invitations for all using (is_staff()) with check (is_staff());

-- ----------------------------------------------------- comptes et invitations

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
  r user_role;
  a jsonb;
begin
  select * into inv from invitations where email = lower(new.email);
  if not exists (select 1 from profiles) then
    r := 'owner';
  elsif inv.email is not null then
    r := inv.role;
  else
    r := 'none';
  end if;

  insert into profiles (id, email, full_name, role, color)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(inv.full_name, ''), split_part(new.email, '@', 1)),
    r,
    (array['#2B4566','#22605F','#8A3530','#5A3A6B','#7A4A16','#2E5B3B','#615424'])[1 + floor(random() * 7)::int]
  );

  if inv.email is not null then
    for a in select * from jsonb_array_elements(inv.access) loop
      insert into space_access (project_id, user_id, space, level)
      values ((a->>'project_id')::uuid, new.id, (a->>'space')::smallint, (a->>'level')::access_level)
      on conflict (project_id, user_id, space) do update set level = excluded.level;
    end loop;
    delete from invitations where email = inv.email;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Invite une personne. Si elle a déjà un compte, ses accès sont appliqués tout de suite.
create function invite_member(p_email text, p_full_name text, p_role user_role, p_access jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare
  existing profiles;
  a jsonb;
begin
  if not is_staff() then raise exception 'Réservé à l''équipe Umber'; end if;
  if p_role = 'owner' and not is_owner() then raise exception 'Seule la propriétaire peut nommer une propriétaire'; end if;

  select * into existing from profiles where email = lower(p_email);
  if existing.id is not null then
    if existing.role <> 'owner' and existing.role is distinct from p_role and (is_owner() or existing.role = 'none') then
      update profiles set role = p_role where id = existing.id;
    end if;
    for a in select * from jsonb_array_elements(p_access) loop
      insert into space_access (project_id, user_id, space, level)
      values ((a->>'project_id')::uuid, existing.id, (a->>'space')::smallint, (a->>'level')::access_level)
      on conflict (project_id, user_id, space) do update set level = excluded.level;
    end loop;
    return 'existing';
  end if;

  insert into invitations (email, full_name, role, access)
  values (lower(p_email), p_full_name, p_role, p_access)
  on conflict (email) do update set full_name = excluded.full_name, role = excluded.role, access = excluded.access;
  return 'invited';
end $$;

-- ---------------------------------------------------- boîte de réception

create function tasks_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger tasks_updated before update on tasks for each row execute function tasks_touch();

create function notify_task_assigned() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.assignee_id is not null
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id)
     and new.assignee_id is distinct from auth.uid() then
    insert into notifications (user_id, actor_id, kind, project_id, space, task_id, excerpt)
    values (new.assignee_id, auth.uid(), 'assigned', new.project_id, new.space, new.id, new.title);
  end if;
  return new;
end $$;
create trigger tasks_notify after insert or update of assignee_id on tasks
  for each row execute function notify_task_assigned();

create function notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m uuid;
  assignee uuid;
  excerpt text := left(regexp_replace(new.body, '@\[([^\]]+)\]\([0-9a-f-]+\)', '@\1', 'g'), 180);
begin
  foreach m in array new.mentions loop
    if m is distinct from new.author_id and user_can_view_space(m, new.project_id, new.space) then
      insert into notifications (user_id, actor_id, kind, project_id, space, task_id, excerpt)
      values (m, new.author_id, 'mention', new.project_id, new.space, new.task_id, excerpt);
    end if;
  end loop;
  if new.task_id is not null then
    select assignee_id into assignee from tasks where id = new.task_id;
    if assignee is not null and assignee is distinct from new.author_id and not (assignee = any (new.mentions)) then
      insert into notifications (user_id, actor_id, kind, project_id, space, task_id, excerpt)
      values (assignee, new.author_id, 'comment', new.project_id, new.space, new.task_id, excerpt);
    end if;
  end if;
  return new;
end $$;
create trigger comments_notify after insert on comments
  for each row execute function notify_comment();

-- ---------------------------------------------------------- fichiers

insert into storage.buckets (id, name, public) values ('files', 'files', false)
  on conflict (id) do nothing;

-- Chemin : {project_id}/{espace}/{nom}
create function storage_space_ok(object_name text, edit boolean) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  parts text[] := storage.foldername(object_name);
  p uuid;
  s int;
begin
  begin
    p := parts[1]::uuid;
    s := parts[2]::int;
  exception when others then
    return false;
  end;
  if edit then return can_edit_space(p, s); end if;
  return can_view_space(p, s);
end $$;

create policy files_read on storage.objects for select
  using (bucket_id = 'files' and storage_space_ok(name, false));
create policy files_upload on storage.objects for insert
  with check (bucket_id = 'files' and storage_space_ok(name, true));
create policy files_remove on storage.objects for delete
  using (bucket_id = 'files' and storage_space_ok(name, true));
