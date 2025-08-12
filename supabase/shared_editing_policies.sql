-- 친구들끼리 서로의 운동 기록을 수정할 수 있도록 RLS 정책 업데이트
-- 같은 group_key를 가진 사용자들끼리 모든 CRUD 작업 허용

-- 1. Workouts 테이블: 그룹 멤버들끼리 수정/삭제 가능하게 변경
drop policy if exists "Workouts update own" on public.workouts;
create policy "Workouts update by group" on public.workouts
for update using (
  exists (
    select 1
    from public.users u_owner
    join public.users u_me on u_me.id = auth.uid()
    where u_owner.id = workouts.user_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
) with check (
  exists (
    select 1
    from public.users u_owner
    join public.users u_me on u_me.id = auth.uid()
    where u_owner.id = workouts.user_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
);

drop policy if exists "Workouts delete own" on public.workouts;
create policy "Workouts delete by group" on public.workouts
for delete using (
  exists (
    select 1
    from public.users u_owner
    join public.users u_me on u_me.id = auth.uid()
    where u_owner.id = workouts.user_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
);

-- 2. Sets 테이블: 그룹 멤버들끼리 수정/삭제 가능하게 변경
drop policy if exists "Sets insert via workout" on public.sets;
create policy "Sets insert via workout group" on public.sets
for insert with check (exists (
  select 1 
  from public.workouts w
  join public.users u_owner on u_owner.id = w.user_id
  join public.users u_me on u_me.id = auth.uid()
  where w.id = sets.workout_id
    and coalesce(u_owner.group_key, '') <> ''
    and trim(u_owner.group_key) = trim(u_me.group_key)
));

drop policy if exists "Sets update via workout" on public.sets;
create policy "Sets update via workout group" on public.sets
for update using (exists (
  select 1 
  from public.workouts w
  join public.users u_owner on u_owner.id = w.user_id
  join public.users u_me on u_me.id = auth.uid()
  where w.id = sets.workout_id
    and coalesce(u_owner.group_key, '') <> ''
    and trim(u_owner.group_key) = trim(u_me.group_key)
)) with check (exists (
  select 1 
  from public.workouts w
  join public.users u_owner on u_owner.id = w.user_id
  join public.users u_me on u_me.id = auth.uid()
  where w.id = sets.workout_id
    and coalesce(u_owner.group_key, '') <> ''
    and trim(u_owner.group_key) = trim(u_me.group_key)
));

drop policy if exists "Sets delete via workout" on public.sets;
create policy "Sets delete via workout group" on public.sets
for delete using (exists (
  select 1 
  from public.workouts w
  join public.users u_owner on u_owner.id = w.user_id
  join public.users u_me on u_me.id = auth.uid()
  where w.id = sets.workout_id
    and coalesce(u_owner.group_key, '') <> ''
    and trim(u_owner.group_key) = trim(u_me.group_key)
));

-- 3. Photos 테이블: 그룹 멤버들끼리 수정/삭제 가능하게 변경
drop policy if exists "Photos insert own" on public.photos;
create policy "Photos insert by group" on public.photos
for insert with check (
  -- 운동별 사진의 경우
  (workout_id is not null and exists (
    select 1 
    from public.workouts w
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where w.id = photos.workout_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  ))
  or
  -- 일별 사진의 경우 (그룹 멤버들끼리 서로 추가 가능)
  (workout_id is null and date is not null and exists (
    select 1
    from public.users u_target
    join public.users u_me on u_me.id = auth.uid()
    where u_target.id = photos.user_id
      and coalesce(u_target.group_key, '') <> ''
      and trim(u_target.group_key) = trim(u_me.group_key)
  ))
);

drop policy if exists "Photos update own" on public.photos;
create policy "Photos update by group" on public.photos
for update using (
  -- 운동별 사진의 경우
  (workout_id is not null and exists (
    select 1 
    from public.workouts w
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where w.id = photos.workout_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  ))
  or
  -- 일별 사진의 경우 (그룹 멤버들끼리 서로 수정 가능)
  (workout_id is null and date is not null and exists (
    select 1
    from public.users u_target
    join public.users u_me on u_me.id = auth.uid()
    where u_target.id = photos.user_id
      and coalesce(u_target.group_key, '') <> ''
      and trim(u_target.group_key) = trim(u_me.group_key)
  ))
) with check (
  -- 운동별 사진의 경우
  (workout_id is not null and exists (
    select 1 
    from public.workouts w
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where w.id = photos.workout_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  ))
  or
  -- 일별 사진의 경우 (그룹 멤버들끼리 서로 수정 가능)
  (workout_id is null and date is not null and exists (
    select 1
    from public.users u_target
    join public.users u_me on u_me.id = auth.uid()
    where u_target.id = photos.user_id
      and coalesce(u_target.group_key, '') <> ''
      and trim(u_target.group_key) = trim(u_me.group_key)
  ))
);

drop policy if exists "Photos delete own" on public.photos;
create policy "Photos delete by group" on public.photos
for delete using (
  -- 운동별 사진의 경우
  (workout_id is not null and exists (
    select 1 
    from public.workouts w
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where w.id = photos.workout_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  ))
  or
  -- 일별 사진의 경우 (그룹 멤버들끼리 서로 삭제 가능)
  (workout_id is null and date is not null and exists (
    select 1
    from public.users u_target
    join public.users u_me on u_me.id = auth.uid()
    where u_target.id = photos.user_id
      and coalesce(u_target.group_key, '') <> ''
      and trim(u_target.group_key) = trim(u_me.group_key)
  ))
);

-- 4. Storage 정책: 그룹 멤버들끼리 사진 업로드/삭제 가능하게 변경
drop policy if exists "photos write own" on storage.objects;
create policy "photos write by group" on storage.objects
for insert with check (
  bucket_id = 'workout-photos' and substring(name from 1 for 36) in (
    select u_owner.id::text
    from public.users u_owner
    join public.users u_me on u_me.id = auth.uid()
    where coalesce(u_owner.group_key, '') <> ''
      and u_owner.group_key = u_me.group_key
  )
);

drop policy if exists "photos update own" on storage.objects;
create policy "photos update by group" on storage.objects
for update using (
  bucket_id = 'workout-photos' and substring(name from 1 for 36) in (
    select u_owner.id::text
    from public.users u_owner
    join public.users u_me on u_me.id = auth.uid()
    where coalesce(u_owner.group_key, '') <> ''
      and u_owner.group_key = u_me.group_key
  )
) with check (
  bucket_id = 'workout-photos' and substring(name from 1 for 36) in (
    select u_owner.id::text
    from public.users u_owner
    join public.users u_me on u_me.id = auth.uid()
    where coalesce(u_owner.group_key, '') <> ''
      and u_owner.group_key = u_me.group_key
  )
);

drop policy if exists "photos delete own" on storage.objects;
create policy "photos delete by group" on storage.objects
for delete using (
  bucket_id = 'workout-photos' and substring(name from 1 for 36) in (
    select u_owner.id::text
    from public.users u_owner
    join public.users u_me on u_me.id = auth.uid()
    where coalesce(u_owner.group_key, '') <> ''
      and u_owner.group_key = u_me.group_key
  )
);
