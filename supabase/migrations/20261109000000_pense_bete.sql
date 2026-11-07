-- Pense-bête personnel : une note par personne, visible par elle seule
-- (même la propriétaire ne voit pas celle des autres).
create table personal_notes (
  user_id uuid primary key references profiles on delete cascade default auth.uid(),
  body text not null default '',
  updated_at timestamptz not null default now()
);

alter table personal_notes enable row level security;
create policy notes_own on personal_notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger personal_notes_touch before update on personal_notes
  for each row execute function tasks_touch();
