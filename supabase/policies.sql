-- Ensure required columns exist before policies (idempotent)
alter table public.users add column if not exists group_key text;

-- Users policies
drop policy if exists "Users select own" on public.users;
drop policy if exists "Users select same group" on public.users;
drop policy if exists "Users select authenticated" on public.users;

create policy "Users select authenticated" on public.users
for select using (auth.role() = 'authenticated');

drop policy if exists "Users insert self" on public.users;
create policy "Users insert self" on public.users
for insert with check (id = auth.uid());

drop policy if exists "Users update self" on public.users;
create policy "Users update self" on public.users
for update using (id = auth.uid()) with check (id = auth.uid());

-- Workouts: same group_key can see each other
drop policy if exists "Workouts select by group" on public.workouts;
create policy "Workouts select by group" on public.workouts
for select using (
  exists (
    select 1
    from public.users u_owner
    join public.users u_me on u_me.id = auth.uid()
    where u_owner.id = workouts.user_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
);

drop policy if exists "Workouts insert own" on public.workouts;
create policy "Workouts insert own" on public.workouts
for insert with check (user_id = auth.uid());

drop policy if exists "Workouts update own" on public.workouts;
create policy "Workouts update own" on public.workouts
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Workouts delete own" on public.workouts;
create policy "Workouts delete own" on public.workouts
for delete using (user_id = auth.uid());

-- Sets policies (via parent workout)
drop policy if exists "Sets select via workout group" on public.sets;
create policy "Sets select via workout group" on public.sets
for select using (exists (
  select 1
  from public.workouts w
  join public.users u_owner on u_owner.id = w.user_id
  join public.users u_me on u_me.id = auth.uid()
  where w.id = sets.workout_id
    and coalesce(u_owner.group_key, '') <> ''
    and trim(u_owner.group_key) = trim(u_me.group_key)
));

drop policy if exists "Sets insert via workout" on public.sets;
create policy "Sets insert via workout" on public.sets
for insert with check (exists (
  select 1 from public.workouts w where w.id = sets.workout_id and w.user_id = auth.uid()
));

drop policy if exists "Sets update via workout" on public.sets;
create policy "Sets update via workout" on public.sets
for update using (exists (
  select 1 from public.workouts w where w.id = sets.workout_id and w.user_id = auth.uid()
)) with check (exists (
  select 1 from public.workouts w where w.id = sets.workout_id and w.user_id = auth.uid()
));

drop policy if exists "Sets delete via workout" on public.sets;
create policy "Sets delete via workout" on public.sets
for delete using (exists (
  select 1 from public.workouts w where w.id = sets.workout_id and w.user_id = auth.uid()
));

-- Photos policies (must match both user and parent workout)
drop policy if exists "Photos select by group" on public.photos;
create policy "Photos select by group" on public.photos
for select using (
  exists (
    select 1
    from public.workouts w
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where w.id = photos.workout_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
);

drop policy if exists "Photos insert own" on public.photos;
create policy "Photos insert own" on public.photos
for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.workouts w where w.id = photos.workout_id and w.user_id = auth.uid()
  )
);

drop policy if exists "Photos update own" on public.photos;
create policy "Photos update own" on public.photos
for update using (
  user_id = auth.uid()
  and exists (
    select 1 from public.workouts w where w.id = photos.workout_id and w.user_id = auth.uid()
  )
) with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.workouts w where w.id = photos.workout_id and w.user_id = auth.uid()
  )
);

drop policy if exists "Photos delete own" on public.photos;
create policy "Photos delete own" on public.photos
for delete using (
  user_id = auth.uid()
  and exists (
    select 1 from public.workouts w where w.id = photos.workout_id and w.user_id = auth.uid()
  )
);

-- storage.objects: 친구들끼리 읽기 허용
drop policy if exists "photos read friends" on storage.objects;
create policy "photos read friends" on storage.objects
for select using (
  bucket_id = 'workout-photos' and substring(name from 1 for 36) in (
    select id::text from public.users where lower(email) in (lower('friend1@example.com'), lower('friend2@example.com'), lower('friend3@example.com'))
  )
);


