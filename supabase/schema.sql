-- Enable extensions
create extension if not exists pgcrypto;

-- Users (app profile) mirrors auth.users by id
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  group_key text,
  display_name text,
  created_at timestamptz not null default now()
);

-- Workouts
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  body_part text not null,
  notes text,
  created_at timestamptz not null default now()
);

-- Sets
create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_name text not null,
  rep_count integer not null check (rep_count > 0),
  weight double precision,
  set_index integer not null
);

-- Photos metadata
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  storage_path text not null,
  public_url text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_workouts_user_date on public.workouts(user_id, date desc);
create index if not exists idx_sets_workout on public.sets(workout_id);
create index if not exists idx_photos_workout on public.photos(workout_id);

-- RLS enablement
alter table public.users add column if not exists group_key text;
alter table public.users enable row level security;
alter table public.workouts enable row level security;
alter table public.sets enable row level security;
alter table public.photos enable row level security;


