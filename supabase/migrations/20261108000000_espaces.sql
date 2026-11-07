-- Umber Studio, étape 2 : le contenu propre à chaque espace.
-- Lignes de budget, déplacements, lieux, propositions, goodies, partenaires, prestataires…
-- Une seule table « entries » : chaque ligne a un type (kind) et ses champs dans data.
-- Les droits suivent ceux de l'espace, comme pour les tâches.

create table entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  space smallint not null check (space between 1 and 8),
  kind text not null,
  title text not null default '',
  data jsonb not null default '{}',
  position double precision not null default 0,
  created_by uuid references profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on entries (project_id, space);

alter table entries enable row level security;
create policy entries_select on entries for select using (can_view_space(project_id, space));
create policy entries_insert on entries for insert with check (can_edit_space(project_id, space));
create policy entries_update on entries for update using (can_edit_space(project_id, space))
  with check (can_edit_space(project_id, space));
create policy entries_delete on entries for delete using (can_edit_space(project_id, space));

create trigger entries_updated before update on entries for each row execute function tasks_touch();

-- Dossier d'un fichier (Ressources, DA et goodies…)
alter table files add column category text not null default '';
create policy files_update on files for update using (can_edit_space(project_id, space))
  with check (can_edit_space(project_id, space));

-- Une tâche peut changer d'espace (colonne « Espace » de la to-do d'Orga) :
-- sa discussion et ses notifications la suivent.
create function task_space_moved() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.space is distinct from old.space then
    update comments set space = new.space where task_id = new.id;
    update notifications set space = new.space where task_id = new.id;
  end if;
  return new;
end $$;
create trigger tasks_space_moved after update of space on tasks
  for each row execute function task_space_moved();
