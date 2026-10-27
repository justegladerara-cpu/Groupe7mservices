-- Groupe7M : bulletins de paie (et factures de prestataires) rangés par agent et par mois.
-- Sert au coût réel de chaque agent, comparé à ce qui est facturé au client.

alter table public.g7_agents add column if not exists statut_emploi text not null default 'salarie' check (statut_emploi in ('salarie', 'prestataire'));
alter table public.g7_agents add column if not exists categorie text;

create table if not exists public.g7_bulletins (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.g7_agents(id) on delete cascade,
  periode date not null check (extract(day from periode) = 1),
  statut_emploi text not null default 'salarie' check (statut_emploi in ('salarie', 'prestataire')),
  unite text not null default 'jour' check (unite in ('jour', 'heure', 'mois')),
  nombre numeric(10, 2),
  taux numeric(14, 2),
  brut numeric(14, 0) not null default 0,
  indemnites numeric(14, 0) not null default 0,
  charges_patron numeric(14, 0) not null default 0,
  retenues numeric(14, 0) not null default 0,
  avance numeric(14, 0) not null default 0,
  net numeric(14, 0),
  cout numeric(14, 0) not null default 0, -- salarié : brut + indemnités + charges patronales ; prestataire : total de sa facture
  note text,
  cree_le timestamptz not null default now(),
  unique (agent_id, periode, unite)
);
create index if not exists g7_bulletins_periode on public.g7_bulletins (periode);

alter table public.g7_bulletins enable row level security;
drop policy if exists g7_bulletins_lire on public.g7_bulletins;
create policy g7_bulletins_lire on public.g7_bulletins for select to authenticated using (public.g7_est_membre());
drop policy if exists g7_bulletins_ajouter on public.g7_bulletins;
create policy g7_bulletins_ajouter on public.g7_bulletins for insert to authenticated with check (public.g7_peut_ecrire());
drop policy if exists g7_bulletins_modifier on public.g7_bulletins;
create policy g7_bulletins_modifier on public.g7_bulletins for update to authenticated using (public.g7_peut_ecrire()) with check (public.g7_peut_ecrire());
drop policy if exists g7_bulletins_supprimer on public.g7_bulletins;
create policy g7_bulletins_supprimer on public.g7_bulletins for delete to authenticated using (public.g7_est_gerant());

revoke all on public.g7_bulletins from anon;
grant select, insert, update, delete on public.g7_bulletins to authenticated;
