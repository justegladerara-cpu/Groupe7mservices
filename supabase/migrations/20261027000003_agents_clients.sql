-- Groupe7M : fiches des agents placés et contrat commercial des clients.

create table if not exists public.g7_agents (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  qualification text,
  client_id uuid references public.g7_clients(id),
  site text,
  statut text not null default 'actif' check (statut in ('actif', 'sorti')),
  type_contrat text not null default 'cdd' check (type_contrat in ('cdi', 'cdd', 'journalier')),
  debut date,
  fin date,
  salaire_base numeric(14, 0) check (salaire_base >= 0),
  unite_facture text not null default 'jour' check (unite_facture in ('jour', 'heure')),
  prix_facture numeric(14, 0) check (prix_facture >= 0),
  matricule_cnss text,
  telephone text,
  note text,
  cree_le timestamptz not null default now()
);
create index if not exists g7_agents_client on public.g7_agents (client_id);

alter table public.g7_clients add column if not exists contact text;
alter table public.g7_clients add column if not exists contrat_debut date;
alter table public.g7_clients add column if not exists contrat_fin date;
alter table public.g7_clients add column if not exists coefficient numeric(4, 2) not null default 1.2 check (coefficient between 1 and 5);

alter table public.g7_agents enable row level security;
drop policy if exists g7_agents_lire on public.g7_agents;
create policy g7_agents_lire on public.g7_agents for select to authenticated using (public.g7_est_membre());
drop policy if exists g7_agents_ajouter on public.g7_agents;
create policy g7_agents_ajouter on public.g7_agents for insert to authenticated with check (public.g7_peut_ecrire());
drop policy if exists g7_agents_modifier on public.g7_agents;
create policy g7_agents_modifier on public.g7_agents for update to authenticated using (public.g7_peut_ecrire()) with check (public.g7_peut_ecrire());
drop policy if exists g7_agents_supprimer on public.g7_agents;
create policy g7_agents_supprimer on public.g7_agents for delete to authenticated using (public.g7_est_gerant());

revoke all on public.g7_agents from anon;
grant select, insert, update, delete on public.g7_agents to authenticated;
