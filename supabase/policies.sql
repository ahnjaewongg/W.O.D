-- Users policies
drop policy if exists "Users select own" on public.users;
create policy "Users select own" on public.users
for select using (id = auth.uid());

drop policy if exists "Users insert self" on public.users;
create policy "Users insert self" on public.users
for insert with check (id = auth.uid());

drop policy if exists "Users update self" on public.users;
create policy "Users update self" on public.users
for update using (id = auth.uid()) with check (id = auth.uid());

-- Workouts policies
drop policy if exists "Workouts select own" on public.workouts;
create policy "Workouts select own" on public.workouts
for select using (user_id = auth.uid());

-- Allow 3 fixed friends to see each other's workouts
drop policy if exists "Workouts select friends" on public.workouts;
create policy "Workouts select friends" on public.workouts
for select using (
  auth.email() in ('friend1@example.com','friend2@example.com','friend3@example.com')
  and user_id in (
    select id from public.users where email in ('friend1@example.com','friend2@example.com','friend3@example.com')
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
drop policy if exists "Sets select via workout" on public.sets;
create policy "Sets select via workout" on public.sets
for select using (exists (
  select 1 from public.workouts w where w.id = sets.workout_id and (
    w.user_id = auth.uid() or (
      auth.email() in ('friend1@example.com','friend2@example.com','friend3@example.com') and
      w.user_id in (select id from public.users where email in ('friend1@example.com','friend2@example.com','friend3@example.com'))
    )
  )
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
drop policy if exists "Photos select own" on public.photos;
create policy "Photos select own" on public.photos
for select using (
  (
    user_id = auth.uid() and exists (
      select 1 from public.workouts w where w.id = photos.workout_id and w.user_id = auth.uid()
    )
  ) or (
    auth.email() in ('friend1@example.com','friend2@example.com','friend3@example.com') and exists (
      select 1 from public.workouts w
      where w.id = photos.workout_id and w.user_id in (
        select id from public.users where email in ('friend1@example.com','friend2@example.com','friend3@example.com')
      )
    )
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


