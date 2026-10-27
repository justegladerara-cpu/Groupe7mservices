-- Groupe7M services : suivi des dépenses, échéances, CNSS et autorisations.
-- Toutes les tables sont préfixées g7_ et protégées : seuls les comptes listés dans g7_membres y ont accès.

-- ---------- Membres ----------
create table if not exists public.g7_membres (
  email text primary key check (email = lower(email)),
  nom text not null,
  role text not null default 'gerant' check (role in ('gerant', 'saisie', 'lecteur')),
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

create or replace function public.g7_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.g7_membres
  where email = lower(coalesce(auth.jwt() ->> 'email', '')) and actif
$$;

create or replace function public.g7_est_membre()
returns boolean language sql stable as $$ select public.g7_role() is not null $$;

create or replace function public.g7_peut_ecrire()
returns boolean language sql stable as $$ select public.g7_role() in ('gerant', 'saisie') $$;

create or replace function public.g7_est_gerant()
returns boolean language sql stable as $$ select public.g7_role() = 'gerant' $$;

-- ---------- Postes de dépense ----------
create table if not exists public.g7_postes (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  groupe text not null default 'autre' check (groupe in ('agents', 'etat', 'bureau', 'terrain', 'protection', 'autre')),
  icone text not null default '•',
  periodicite text not null default 'ponctuelle'
    check (periodicite in ('mensuelle', 'trimestrielle', 'semestrielle', 'annuelle', 'ponctuelle')),
  mois_reference smallint check (mois_reference between 1 and 12),
  jour_echeance smallint not null default 5 check (jour_echeance between 1 and 31),
  decalage_mois smallint not null default 0 check (decalage_mois between 0 and 3),
  montant_habituel numeric(14, 0) check (montant_habituel >= 0),
  beneficiaire text,
  aide text,
  ordre smallint not null default 100,
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

-- ---------- Dépenses (chaque sortie d'argent, avec son reçu) ----------
create table if not exists public.g7_depenses (
  id uuid primary key default gen_random_uuid(),
  poste_id uuid not null references public.g7_postes (id),
  periode date not null check (extract(day from periode) = 1),
  date_paiement date not null default current_date,
  montant numeric(14, 0) not null check (montant > 0),
  mode_paiement text not null default 'especes'
    check (mode_paiement in ('especes', 'virement', 'cheque', 'mobile_money', 'autre')),
  beneficiaire text,
  reference text,
  note text,
  recu_path text,
  cree_par text not null default lower(coalesce(auth.jwt() ->> 'email', 'inconnu')),
  cree_le timestamptz not null default now()
);
create index if not exists g7_depenses_date_idx on public.g7_depenses (date_paiement);
create index if not exists g7_depenses_poste_periode_idx on public.g7_depenses (poste_id, periode);

-- ---------- Échéances (ce qui doit être payé, période par période) ----------
create table if not exists public.g7_echeances (
  id uuid primary key default gen_random_uuid(),
  poste_id uuid not null references public.g7_postes (id) on delete cascade,
  periode date not null check (extract(day from periode) = 1),
  date_limite date not null,
  montant_prevu numeric(14, 0) check (montant_prevu >= 0),
  ignoree boolean not null default false,
  note text,
  unique (poste_id, periode)
);

-- ---------- CNSS : une déclaration par mois ----------
create table if not exists public.g7_cnss (
  periode date primary key check (extract(day from periode) = 1),
  assures integer check (assures >= 0),
  non_immatricules integer not null default 0 check (non_immatricules >= 0),
  brut numeric(14, 0) check (brut >= 0),
  montant_declare numeric(14, 0) check (montant_declare >= 0),
  date_declaration date,
  periode_accuse date check (periode_accuse is null or extract(day from periode_accuse) = 1),
  accuse_path text,
  note text,
  modifie_le timestamptz not null default now()
);

-- ---------- Autorisations et papiers ----------
create table if not exists public.g7_autorisations (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  numero text,
  organisme text,
  date_debut date,
  date_fin date,
  rappel_jours smallint not null default 60 check (rappel_jours between 0 and 365),
  document_path text,
  note text,
  ordre smallint not null default 100,
  cree_le timestamptz not null default now(),
  check (date_fin is null or date_debut is null or date_fin >= date_debut)
);

-- ---------- Sécurité ----------
alter table public.g7_membres enable row level security;
alter table public.g7_postes enable row level security;
alter table public.g7_depenses enable row level security;
alter table public.g7_echeances enable row level security;
alter table public.g7_cnss enable row level security;
alter table public.g7_autorisations enable row level security;

drop policy if exists g7_membres_lire on public.g7_membres;
create policy g7_membres_lire on public.g7_membres for select to authenticated using (public.g7_est_membre());

do $$
declare t text;
begin
  foreach t in array array['g7_postes', 'g7_depenses', 'g7_echeances', 'g7_cnss', 'g7_autorisations'] loop
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

revoke all on public.g7_membres, public.g7_postes, public.g7_depenses, public.g7_echeances, public.g7_cnss, public.g7_autorisations from anon;
grant select on public.g7_membres to authenticated;
grant select, insert, update, delete on public.g7_postes, public.g7_depenses, public.g7_echeances, public.g7_cnss, public.g7_autorisations to authenticated;

-- ---------- Préparer les échéances d'un mois (sans doublon) ----------
create or replace function public.g7_preparer_mois(p_periode date)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_periode date := date_trunc('month', p_periode)::date;
  v_mois int := extract(month from v_periode);
  v_n int;
begin
  if not public.g7_est_membre() then
    raise exception 'Accès réservé à Groupe7M services';
  end if;
  insert into public.g7_echeances (poste_id, periode, date_limite, montant_prevu)
  select p.id, v_periode,
    least(
      (v_periode + make_interval(months => p.decalage_mois))::date + (p.jour_echeance - 1),
      ((v_periode + make_interval(months => p.decalage_mois + 1))::date - 1)
    ),
    p.montant_habituel
  from public.g7_postes p
  where p.actif and (
    p.periodicite = 'mensuelle'
    or (p.periodicite = 'trimestrielle' and ((v_mois - coalesce(p.mois_reference, 1)) % 3 + 3) % 3 = 0)
    or (p.periodicite = 'semestrielle' and ((v_mois - coalesce(p.mois_reference, 1)) % 6 + 6) % 6 = 0)
    or (p.periodicite = 'annuelle' and v_mois = coalesce(p.mois_reference, 1))
  )
  on conflict (poste_id, periode) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.g7_preparer_mois(date) from public, anon;
grant execute on function public.g7_preparer_mois(date) to authenticated;

-- ---------- Documents (reçus, accusés, autorisations) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('g7-documents', 'g7-documents', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists g7_documents_lire on storage.objects;
create policy g7_documents_lire on storage.objects for select to authenticated
  using (bucket_id = 'g7-documents' and public.g7_est_membre());
drop policy if exists g7_documents_ajouter on storage.objects;
create policy g7_documents_ajouter on storage.objects for insert to authenticated
  with check (bucket_id = 'g7-documents' and public.g7_peut_ecrire());
drop policy if exists g7_documents_supprimer on storage.objects;
create policy g7_documents_supprimer on storage.objects for delete to authenticated
  using (bucket_id = 'g7-documents' and public.g7_est_gerant());

-- ---------- Postes de départ (montants à compléter par le gérant) ----------
insert into public.g7_postes (nom, groupe, icone, periodicite, mois_reference, jour_echeance, decalage_mois, beneficiaire, aide, ordre) values
  ('Salaires des agents', 'agents', '👷', 'mensuelle', null, 30, 0, 'Agents', 'Salaires nets versés aux agents.', 10),
  ('Avances sur salaire', 'agents', '💵', 'ponctuelle', null, 1, 0, 'Agents', 'Avances données avant la paie. Elles seront retenues sur le salaire.', 20),
  ('CNSS', 'etat', '🛡️', 'mensuelle', null, 20, 1, 'CNSS', 'Cotisations du mois (24,28 % du brut), à payer le mois suivant.', 30),
  ('TUS', 'etat', '🏛️', 'mensuelle', null, 20, 1, 'Impôts', 'Taxe unique sur les salaires (7,5 % du brut sur la paie de juin).', 40),
  ('IRPP retenu', 'etat', '🧾', 'mensuelle', null, 20, 1, 'Impôts', 'Impôt retenu sur les salaires des agents, à reverser.', 50),
  ('TOL', 'etat', '🏘️', 'mensuelle', null, 20, 1, 'Impôts', 'Taxe d''occupation des locaux retenue sur les salaires.', 60),
  ('Patente et autres impôts', 'etat', '📜', 'ponctuelle', null, 1, 0, 'Impôts', null, 70),
  ('Loyer', 'bureau', '🏢', 'mensuelle', null, 5, 0, null, null, 80),
  ('Électricité', 'bureau', '💡', 'mensuelle', null, 15, 0, 'E2C', null, 90),
  ('Eau', 'bureau', '🚰', 'mensuelle', null, 15, 0, 'LCDE', null, 100),
  ('Internet', 'bureau', '🌐', 'mensuelle', null, 5, 0, null, 'Abonnement internet du bureau.', 110),
  ('Téléphone et crédit', 'bureau', '📱', 'ponctuelle', null, 1, 0, null, null, 120),
  ('Fournitures de bureau', 'bureau', '📎', 'ponctuelle', null, 1, 0, null, null, 130),
  ('Assurances', 'protection', '☂️', 'annuelle', 1, 15, 0, null, 'Primes d''assurance (responsabilité civile, véhicules, agents).', 140),
  ('Transport et carburant', 'terrain', '⛽', 'ponctuelle', null, 1, 0, null, null, 150),
  ('Équipements de sécurité', 'terrain', '🦺', 'ponctuelle', null, 1, 0, null, 'Casques, chaussures, gilets, gants pour les agents.', 160),
  ('Frais bancaires', 'autre', '🏦', 'ponctuelle', null, 1, 0, null, null, 170),
  ('Autres dépenses', 'autre', '📦', 'ponctuelle', null, 1, 0, null, null, 180)
on conflict (nom) do nothing;

insert into public.g7_autorisations (nom, organisme, ordre)
select v.nom, v.organisme, v.ordre from (values
  ('Agrément de mise à disposition de personnel', 'Ministère du Travail', 10),
  ('RCCM', 'Tribunal de commerce', 20),
  ('NIU', 'Impôts', 30),
  ('Patente', 'Impôts', 40),
  ('Attestation de mise à jour CNSS', 'CNSS', 50),
  ('Attestation de non-redevance fiscale', 'Impôts', 60),
  ('Assurance responsabilité civile', 'Assureur', 70),
  ('Bail du bureau', 'Propriétaire', 80)
) as v (nom, organisme, ordre)
where not exists (select 1 from public.g7_autorisations);
