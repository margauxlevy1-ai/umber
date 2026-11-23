-- Archivage des projets.
-- Un projet archivé disparaît des listes, reste consultable par ceux qui y ont accès,
-- et passe en lecture seule pour tout le monde (tâches, contenus, fichiers).
-- Seule l'équipe peut archiver ou restaurer (règle projects_write existante).

alter table projects add column archived_at timestamptz;

create or replace function can_edit_space(p uuid, s int) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from projects where id = p and archived_at is not null)
     and (
       is_staff()
       or exists (select 1 from space_access
                  where project_id = p and user_id = auth.uid() and space = s and level = 'edit')
     )
$$;
