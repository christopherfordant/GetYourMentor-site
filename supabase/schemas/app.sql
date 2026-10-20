-- Persistance MVP du parcours de réservation GetYourMentor.
-- Script de référence pour la préproduction : il est autonome et ne doit pas
-- être précédé du schéma mémoire supabase/schemas/memory.sql.

create table if not exists public.gym_coaches (
  id text primary key,
  name text not null,
  sport text not null check (sport in ('football', 'basketball', 'fitness', 'sports-de-combat')),
  specialty text not null default '',
  city text not null default '',
  rating numeric(3, 2) not null default 0 check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  price_from numeric(10, 2) not null default 0 check (price_from >= 0),
  verified boolean not null default false,
  description text not null default '',
  disciplines text not null default '',
  diplomas text not null default '',
  session_types text not null default '',
  availability text not null default '',
  gender text check (gender is null or gender in ('homme', 'femme')),
  practice text check (practice is null or practice in ('interieur', 'exterieur')),
  level text check (level is null or level in ('debutant', 'intermediaire', 'confirme')),
  session_format text check (session_format is null or session_format in ('presentiel', 'visio')),
  availability_tags jsonb not null default '[]'::jsonb check (jsonb_typeof(availability_tags) = 'array'),
  photo_url text not null default '',
  bank_account_last4 text not null default '',
  phone text,
  phone_verified_at timestamptz,
  identity_file_name text,
  identity_storage_path text,
  diploma_file_name text,
  diploma_storage_path text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'approved', 'rejected')),
  verification_note text,
  verified_at timestamptz,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  service_radius_km numeric(5, 2) not null default 10 check (service_radius_km > 0 and service_radius_km <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gym_coaches enable row level security;
alter table public.gym_coaches add column if not exists availability text not null default '';
alter table public.gym_coaches add column if not exists gender text;
alter table public.gym_coaches add column if not exists practice text;
alter table public.gym_coaches add column if not exists level text;
alter table public.gym_coaches add column if not exists session_format text;
alter table public.gym_coaches add column if not exists availability_tags jsonb not null default '[]'::jsonb;
alter table public.gym_coaches add column if not exists latitude numeric(9, 6);
alter table public.gym_coaches add column if not exists longitude numeric(9, 6);
alter table public.gym_coaches add column if not exists service_radius_km numeric(5, 2) not null default 10;
alter table public.gym_coaches add column if not exists phone text;
alter table public.gym_coaches add column if not exists phone_verified_at timestamptz;
alter table public.gym_coaches add column if not exists identity_file_name text;
alter table public.gym_coaches add column if not exists identity_storage_path text;
alter table public.gym_coaches add column if not exists diploma_file_name text;
alter table public.gym_coaches add column if not exists diploma_storage_path text;
alter table public.gym_coaches add column if not exists verification_status text not null default 'pending';
alter table public.gym_coaches add column if not exists verification_note text;
alter table public.gym_coaches add column if not exists verified_at timestamptz;

create index if not exists gym_coaches_sport_city_idx on public.gym_coaches (sport, city);
create index if not exists gym_coaches_verified_idx on public.gym_coaches (verified);
create index if not exists gym_coaches_location_idx on public.gym_coaches (latitude, longitude) where latitude is not null and longitude is not null;
create index if not exists gym_coaches_verification_status_idx on public.gym_coaches (verification_status);
create index if not exists gym_coaches_filters_idx on public.gym_coaches (gender, practice, level, session_format);

/*
  Aucun profil de démonstration ne doit être injecté par le schéma de
  préproduction. Le bloc historique ci-dessous est conservé comme référence,
  mais volontairement désactivé ; les coachs réels doivent être créés et
  vérifiés via le back-office.

*/

create table if not exists public.gym_reservations (
  id text primary key,
  owner_email text,
  coach_id text not null,
  coach_name text not null,
  sport text not null check (sport in ('football', 'basketball', 'fitness', 'sports-de-combat')),
  city text not null,
  service text not null,
  duration text not null,
  price numeric(10, 2) not null check (price >= 0),
  slots jsonb not null check (jsonb_typeof(slots) = 'array'),
  status text not null default 'requested' check (status in ('requested', 'accepted', 'rejected', 'cancelled', 'paid')),
  reservation_code text unique,
  accepted_at timestamptz,
  appointment_at timestamptz,
  cancelled_at timestamptz,
  refund_percent numeric(5, 2) default 0 check (refund_percent between 0 and 100),
  refund_amount numeric(10, 2) default 0 check (refund_amount >= 0),
  stripe_payment_intent_id text,
  stripe_refund_id text,
  refund_status text not null default 'not_required' check (refund_status in ('not_required', 'pending', 'succeeded')),
  created_at timestamptz not null default now()
);

create index if not exists gym_reservations_coach_id_idx on public.gym_reservations (coach_id);
create index if not exists gym_reservations_status_idx on public.gym_reservations (status);
create index if not exists gym_reservations_created_at_idx on public.gym_reservations (created_at desc);

alter table public.gym_reservations enable row level security;

-- Compatibilité avec une table créée par une version précédente du script.
alter table public.gym_reservations add column if not exists appointment_at timestamptz;
alter table public.gym_reservations add column if not exists owner_email text;
alter table public.gym_reservations add column if not exists cancelled_at timestamptz;
alter table public.gym_reservations add column if not exists refund_percent numeric(5, 2) default 0;
alter table public.gym_reservations add column if not exists refund_amount numeric(10, 2) default 0;
alter table public.gym_reservations add column if not exists stripe_payment_intent_id text;
alter table public.gym_reservations add column if not exists stripe_refund_id text;
alter table public.gym_reservations add column if not exists refund_status text not null default 'not_required';

-- Claim atomique des créneaux : la clé unique empêche deux réservations actives
-- de prendre simultanément le même créneau pour un même coach.
create table if not exists public.gym_reservation_slot_claims (
  reservation_id text not null references public.gym_reservations(id) on delete cascade,
  coach_id text not null,
  slot text not null,
  created_at timestamptz not null default now(),
  primary key (coach_id, slot),
  unique (reservation_id, slot)
);

alter table public.gym_reservation_slot_claims enable row level security;
create index if not exists gym_reservation_slot_claims_reservation_idx on public.gym_reservation_slot_claims (reservation_id);

-- Reprise non destructive des demandes déjà existantes lors de la migration.
insert into public.gym_reservation_slot_claims (reservation_id, coach_id, slot)
select r.id, r.coach_id, jsonb_array_elements_text(r.slots)
from public.gym_reservations r
where r.status in ('requested', 'accepted', 'paid')
on conflict (coach_id, slot) do nothing;

create table if not exists public.gym_reviews (
  id text primary key,
  reservation_id text not null unique references public.gym_reservations(id) on delete cascade,
  author_email text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

alter table public.gym_reviews enable row level security;

create table if not exists public.gym_messages (
  id text primary key,
  sender_email text not null,
  recipient_name text not null,
  reservation_id text references public.gym_reservations(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.gym_messages enable row level security;

create table if not exists public.gym_club_leads (
  id text primary key,
  club_name text not null,
  manager_name text not null,
  email text not null,
  phone text,
  address_label text,
  iban_last4 text check (iban_last4 is null or char_length(iban_last4) = 4),
  logo_file_name text,
  identity_file_name text,
  logo_storage_path text,
  identity_storage_path text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  status text not null default 'pending' check (status in ('pending', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.gym_club_leads enable row level security;
alter table public.gym_club_leads add column if not exists logo_storage_path text;
alter table public.gym_club_leads add column if not exists identity_storage_path text;
alter table public.gym_club_leads add column if not exists address_label text;
alter table public.gym_club_leads add column if not exists latitude numeric(9, 6);
alter table public.gym_club_leads add column if not exists longitude numeric(9, 6);
create index if not exists gym_club_leads_status_idx on public.gym_club_leads (status);
create index if not exists gym_club_leads_created_at_idx on public.gym_club_leads (created_at desc);

-- Documents de club privés : aucun accès public. Les uploads et URLs signées
-- passent par le serveur avec SUPABASE_SERVICE_ROLE_KEY ; l’endpoint admin
-- vérifie le rôle avant de délivrer une URL temporaire.
insert into storage.buckets (id, name, public)
values ('club-documents', 'club-documents', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('coach-documents', 'coach-documents', false)
on conflict (id) do update set public = false;
