-- MVP schema: no RLS (à durcir en prod)

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 75,
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_e164 text unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_tokens (
  employee_id uuid references public.employees(id) on delete cascade,
  token text primary key,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.bindings (
  employee_id uuid references public.employees(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  primary key (employee_id, location_id)
);

do $$ begin
  if not exists (select 1 from pg_type where typname = 'checkin_type') then
    create type checkin_type as enum ('IN','OUT');
  end if;
end $$;

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  kind checkin_type not null,
  lat double precision not null,
  lng double precision not null,
  distance_m double precision not null,
  photo_path text not null,
  created_at timestamptz not null default now(),
  meta jsonb default '{}'::jsonb
);
