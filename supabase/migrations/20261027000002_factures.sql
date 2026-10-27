-- Groupe7M : clients, factures et encaissements, coût de la paie par mois (pour la marge).

create table if not exists public.g7_clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  delai_paiement integer not null default 45 check (delai_paiement between 0 and 365),
  actif boolean not null default true,
  note text,
  cree_le timestamptz not null default now()
);

-- Une facture : son numéro est unique (fini les doublons entre séries), son total vient des lignes quand il y en a.
create table if not exists public.g7_factures (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  client_id uuid not null references public.g7_clients(id),
  periode date not null check (extract(day from periode) = 1),
  date_facture date not null,
  type text not null default 'journalier' check (type in ('journalier', 'maintenance', 'location', 'autre')),
  site text,
  lignes jsonb not null default '[]'::jsonb,
  montant numeric(14, 0) not null check (montant >= 0),
  montant_paye numeric(14, 0) not null default 0 check (montant_paye >= 0),
  date_paiement date,
  document_path text,
  note text,
  cree_le timestamptz not null default now()
);
create index if not exists g7_factures_periode on public.g7_factures (periode);
create index if not exists g7_factures_client on public.g7_factures (client_id);

-- Coût de la paie d'un mois, en totaux (aucune fiche de paie détaillée) et la liste des agents payés.
create table if not exists public.g7_paie_mois (
  periode date primary key check (extract(day from periode) = 1),
  effectif integer,
  brut numeric(14, 0) not null default 0,
  indemnites numeric(14, 0) not null default 0,
  charges numeric(14, 0) not null default 0,
  agents text,
  note text,
  modifie_le timestamptz not null default now()
);

alter table public.g7_clients enable row level security;
alter table public.g7_factures enable row level security;
alter table public.g7_paie_mois enable row level security;

do $$
declare t text;
begin
  foreach t in array array['g7_clients', 'g7_factures', 'g7_paie_mois'] loop
    execute format('drop policy if exists %I on public.%I', t || '_lire', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.g7_est_membre())', t || '_lire', t);
    execute format('drop policy if exists %I on public.%I', t || '_ajouter', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.g7_peut_ecrire())', t || '_ajouter', t);
    execute format('drop policy if exists %I on public.%I', t || '_modifier', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.g7_peut_ecrire()) with check (public.g7_peut_ecrire())', t || '_modifier', t);
    execute format('drop policy if exists %I on public.%I', t || '_supprimer', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.g7_est_gerant())', t || '_supprimer', t);
  end loop;
end $$;

revoke all on public.g7_clients, public.g7_factures, public.g7_paie_mois from anon;
grant select, insert, update, delete on public.g7_clients, public.g7_factures, public.g7_paie_mois to authenticated;

-- Les clients réels sont saisis dans l'application (rien de confidentiel dans le dépôt public).
