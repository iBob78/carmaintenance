-- ============================================================================
-- AutoCarnet — schéma initial PostgreSQL (Supabase)
-- Migration 0001 : tables du modèle de données + Row Level Security (RLS).
-- À appliquer avec `supabase db push` ou via le SQL Editor de votre projet.
-- Aucune donnée réelle n'est incluse.
-- ============================================================================

-- Extensions -----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Profils (données personnelles du propriétaire) ------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nom text not null default '',
  email text not null default '',
  telephone text,
  adresse text,
  created_at timestamptz not null default now()
);

-- Véhicules ------------------------------------------------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  marque text not null,
  modele text not null,
  generation text,
  finition text,
  annee int not null check (annee between 1900 and 2100),
  premiere_immatriculation date,
  motorisation text,
  code_moteur text,
  cylindree_cm3 int,
  carburant text not null check (carburant in ('essence','diesel','hybride','electrique','gpl','ethanol','autre')),
  transmission text check (transmission in ('manuelle','automatique','semi_automatique')),
  vin text check (vin is null or char_length(vin) = 17),
  immatriculation text,
  date_acquisition date,
  kilometrage_actuel int not null default 0 check (kilometrage_actuel >= 0),
  couleur text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_owner_idx on public.vehicles (owner_id);

-- Relevés kilométriques ------------------------------------------------------
create table public.odometer_readings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  date date not null,
  valeur_km int not null check (valeur_km >= 0),
  source text not null default 'utilisateur'
    check (source in ('utilisateur','facture','professionnel','controle')),
  source_information text not null default 'declare'
    check (source_information in ('declare','documente','verifie')),
  document_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create index odometer_readings_vehicle_idx on public.odometer_readings (vehicle_id, date);

-- Opérations planifiées / intervalles ---------------------------------------
create table public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  categorie text not null,
  libelle text not null,
  description text,
  intervalle_km int,
  intervalle_mois int,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create index maintenance_tasks_vehicle_idx on public.maintenance_tasks (vehicle_id);

-- Interventions (carnet d'entretien) -----------------------------------------
create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  date date not null,
  kilometrage int not null check (kilometrage >= 0),
  categorie text not null,
  titre text not null,
  description text,
  statut text not null default 'effectue'
    check (statut in ('effectue','prevu','annule','non_realise')),
  realisateur text not null default 'proprietaire'
    check (realisateur in ('proprietaire','garage','professionnel')),
  garage text,
  cout_total numeric(10,2) check (cout_total is null or cout_total >= 0),
  notes text,
  source_information text not null default 'declare'
    check (source_information in ('declare','documente','verifie')),
  document_id uuid,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_records_vehicle_idx on public.service_records (vehicle_id, date);

-- Lignes d'intervention (pièces, consommables, main-d'œuvre) -----------------
create table public.service_record_items (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records (id) on delete cascade,
  kind text not null check (kind in ('piece','consommable','main_oeuvre','prestation','autre')),
  libelle text not null,
  reference text,
  marque text,
  quantite numeric(10,2) not null default 1,
  prix_unitaire numeric(10,2),
  prix_total numeric(10,2)
);

create index service_record_items_record_idx on public.service_record_items (service_record_id);

-- Pannes, tests et réparations ----------------------------------------------
create table public.faults_and_tests (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  symptomes text not null,
  circonstances text,
  codes_defaut text,
  hypothese text,
  tests_realises text,
  resultat text,
  pieces_remplacees text,
  date_signalement date not null,
  date_resolution date,
  statut text not null default 'ouvert'
    check (statut in ('ouvert','resolu','reapparu','resolution_non_confirmee')),
  service_record_id uuid references public.service_records (id) on delete set null,
  source_information text not null default 'declare'
    check (source_information in ('declare','documente','verifie')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index faults_vehicle_idx on public.faults_and_tests (vehicle_id);

-- Achats de pièces ----------------------------------------------------------
create table public.parts_and_purchases (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  date date not null,
  libelle text not null,
  reference text,
  marque text,
  quantite numeric(10,2) not null default 1,
  prix_total numeric(10,2) not null,
  fournisseur text,
  document_id uuid,
  service_record_id uuid references public.service_records (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- Documents (stockage privé Supabase Storage) --------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  service_record_id uuid references public.service_records (id) on delete set null,
  filename text not null,
  mime_type text not null,
  taille_octets bigint not null default 0,
  date_document date not null,
  kind text not null default 'autre' check (kind in ('facture','photo','pv_controle','autre')),
  storage_path text,
  sha256 text,
  created_at timestamptz not null default now()
);

create index documents_vehicle_idx on public.documents (vehicle_id);

-- Dépenses ------------------------------------------------------------------
create table public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  date date not null,
  categorie text not null
    check (categorie in ('pieces','consommables','main_oeuvre','prestations','assurance','controle_technique','carburant','autre')),
  libelle text not null,
  montant numeric(10,2) not null check (montant >= 0),
  remboursement numeric(10,2) check (remboursement is null or remboursement >= 0),
  remboursement_date date,
  inconnu boolean not null default false,
  link text not null default 'aucun' check (link in ('aucun','service_record','purchase')),
  service_record_id uuid references public.service_records (id) on delete set null,
  purchase_id uuid references public.parts_and_purchases (id) on delete set null,
  document_id uuid references public.documents (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index expenses_vehicle_idx on public.expense_entries (vehicle_id, date);

-- Rappels -------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  categorie text not null,
  libelle text not null,
  declencheur text not null default 'km' check (declencheur in ('km','date','km_et_date')),
  seuil_km int,
  date_cible date,
  statut text not null default 'a_faire' check (statut in ('a_faire','en_retard','fait','annule')),
  fait_service_record_id uuid references public.service_records (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Traçabilité des exports de rapports ---------------------------------------
-- Conserve un instantané des données et des options pour la reproductibilité.
-- Le PDF lui-même n'est jamais archivé.
create table public.report_exports (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  options jsonb not null,
  snapshot jsonb not null,
  anomalies jsonb not null default '[]'::jsonb,
  pdf_sha256 text,
  pdf_taille_octets bigint,
  generated_by uuid references public.profiles (id)
);

create index report_exports_vehicle_idx on public.report_exports (vehicle_id, created_at desc);

-- ============================================================================
-- Row Level Security : chaque utilisateur ne voit que ses propres données.
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.odometer_readings enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.service_records enable row level security;
alter table public.service_record_items enable row level security;
alter table public.faults_and_tests enable row level security;
alter table public.parts_and_purchases enable row level security;
alter table public.documents enable row level security;
alter table public.expense_entries enable row level security;
alter table public.reminders enable row level security;
alter table public.report_exports enable row level security;

-- Helper : l'utilisateur est-il propriétaire du véhicule ?
create or replace function public.owns_vehicle(p_vehicle_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  );
$$;

-- profiles
create policy "profil : lecture personnelle" on public.profiles
  for select using (auth.uid() = id);
create policy "profil : insertion personnelle" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profil : mise à jour personnelle" on public.profiles
  for update using (auth.uid() = id);

-- vehicles
create policy "vehicules : CRUD personnel" on public.vehicles
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- odometer_readings
create policy "reles : via proprietaire" on public.odometer_readings
  for all using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

-- maintenance_tasks
create policy "taches : via proprietaire" on public.maintenance_tasks
  for all using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

-- service_records
create policy "interventions : via proprietaire" on public.service_records
  for all using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

-- service_record_items
create policy "lignes : via intervention" on public.service_record_items
  for all using (
    exists (select 1 from public.service_records s where s.id = service_record_id and public.owns_vehicle(s.vehicle_id))
  ) with check (
    exists (select 1 from public.service_records s where s.id = service_record_id and public.owns_vehicle(s.vehicle_id))
  );

-- faults_and_tests
create policy "pannes : via proprietaire" on public.faults_and_tests
  for all using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

-- parts_and_purchases
create policy "achats : via proprietaire" on public.parts_and_purchases
  for all using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

-- documents
create policy "documents : via proprietaire" on public.documents
  for all using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

-- expense_entries
create policy "depenses : via proprietaire" on public.expense_entries
  for all using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

-- reminders
create policy "rappels : via proprietaire" on public.reminders
  for all using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

-- report_exports
create policy "exports : via proprietaire" on public.report_exports
  for all using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

-- ============================================================================
-- Bucket Storage privé pour les justificatifs.
-- (À exécuter dans le SQL Editor — les policies Storage suivent les mêmes règles.)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents storage : lecture proprietaire" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "documents storage : ecriture proprietaire" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "documents storage : suppression proprietaire" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- RGPD : fonction d'effacement complet d'un compte (à appeler depuis une
-- edge function authentifiée). Supprime en cascade toutes les données
-- personnelles et fichiers associés.
-- ============================================================================
create or replace function public.delete_user_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.profiles where id = auth.uid();
end;
$$;
