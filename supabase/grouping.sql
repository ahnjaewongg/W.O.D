-- Mapping table: email -> group_key
create table if not exists public.group_members (
  email text primary key,
  group_key text not null
);

-- Ensure users table has group_key column
alter table public.users add column if not exists group_key text;

-- Trigger function: assign group_key from mapping if missing
create or replace function public.assign_group_key()
returns trigger
language plpgsql
security definer
as $$
declare
  mapped text;
begin
  if new.group_key is null then
    select gm.group_key into mapped
    from public.group_members gm
    where lower(gm.email) = lower(new.email)
    limit 1;
    if mapped is not null then
      new.group_key := mapped;
    end if;
  end if;
  return new;
end;
$$;

-- Triggers: on insert and on update when group_key is null
drop trigger if exists trg_assign_group_key_insert on public.users;
create trigger trg_assign_group_key_insert
before insert on public.users
for each row execute function public.assign_group_key();

drop trigger if exists trg_assign_group_key_update on public.users;
create trigger trg_assign_group_key_update
before update on public.users
for each row when (new.group_key is null)
execute function public.assign_group_key();

-- Seed 3 friends (EDIT emails and group_key as needed)
insert into public.group_members(email, group_key) values
  ('friend1@example.com','friends-a'),
  ('friend2@example.com','friends-a'),
  ('friend3@example.com','friends-a')
on conflict (email) do update set group_key = excluded.group_key;

-- Backfill existing users from mapping
update public.users u
set group_key = gm.group_key
from public.group_members gm
where lower(u.email) = lower(gm.email)
  and (u.group_key is null or u.group_key <> gm.group_key);

-- RPC: ensure group_key for the current user based on mapping
create or replace function public.ensure_group_key_for_current_user()
returns void
language sql
security definer
as $$
  update public.users u
  set group_key = gm.group_key
  from public.group_members gm
  where u.id = auth.uid()
    and (u.group_key is null or u.group_key = '')
    and lower(u.email) = lower(gm.email);
$$;



