-- 운동 데이터 정규화: exercises 테이블 추가
-- 현재: sets에 exercise_name 중복 저장
-- 개선: exercises 테이블로 분리하여 정규화

-- 1. exercises 테이블 생성
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_name text not null,
  exercise_index integer not null, -- 운동 순서 (1, 2, 3, ...)
  notes text, -- 운동별 메모 (ex: "드롭세트", "슈퍼세트" 등)
  created_at timestamptz not null default now()
);

-- 2. 새로운 sets 테이블 구조 (기존 테이블을 새 이름으로 백업 후 재생성)
-- 기존 sets 백업
create table if not exists public.sets_backup as select * from public.sets;

-- 기존 sets 테이블 드롭 (외래키 제약조건 때문에)
drop table if exists public.sets;

-- 새로운 sets 테이블 생성
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  rep_count integer not null check (rep_count > 0),
  weight double precision check (weight >= 0),
  set_index integer not null, -- 해당 운동 내에서의 세트 순서 (1, 2, 3, ...)
  notes text, -- 세트별 메모 (ex: "실패", "드롭" 등)
  created_at timestamptz not null default now()
);

-- 3. 인덱스 생성
create index if not exists idx_exercises_workout on public.exercises(workout_id, exercise_index);
create index if not exists idx_sets_exercise on public.sets(exercise_id, set_index);

-- 4. 기존 데이터 마이그레이션
-- 기존 sets_backup에서 exercise별로 그룹화하여 exercises 테이블 생성
with exercise_groups as (
  select 
    workout_id,
    exercise_name,
    row_number() over (partition by workout_id order by min(set_index)) as exercise_index
  from public.sets_backup
  group by workout_id, exercise_name
),
inserted_exercises as (
  insert into public.exercises (workout_id, exercise_name, exercise_index)
  select workout_id, exercise_name, exercise_index
  from exercise_groups
  returning id, workout_id, exercise_name
)
-- 새로운 sets 테이블에 데이터 삽입
insert into public.sets (exercise_id, rep_count, weight, set_index)
select 
  ie.id as exercise_id,
  sb.rep_count,
  sb.weight,
  row_number() over (partition by ie.id order by sb.set_index) as set_index
from public.sets_backup sb
join inserted_exercises ie on ie.workout_id = sb.workout_id and ie.exercise_name = sb.exercise_name;

-- 5. RLS 정책 추가
alter table public.exercises enable row level security;

-- exercises 정책들 (기존 것이 있다면 삭제 후 재생성)
drop policy if exists "Exercises select by group" on public.exercises;
create policy "Exercises select by group" on public.exercises
for select using (
  exists (
    select 1
    from public.workouts w
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where w.id = exercises.workout_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
);

drop policy if exists "Exercises insert by group" on public.exercises;
create policy "Exercises insert by group" on public.exercises
for insert with check (
  exists (
    select 1
    from public.workouts w
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where w.id = exercises.workout_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
);

drop policy if exists "Exercises update by group" on public.exercises;
create policy "Exercises update by group" on public.exercises
for update using (
  exists (
    select 1
    from public.workouts w
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where w.id = exercises.workout_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
) with check (
  exists (
    select 1
    from public.workouts w
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where w.id = exercises.workout_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
);

drop policy if exists "Exercises delete by group" on public.exercises;
create policy "Exercises delete by group" on public.exercises
for delete using (
  exists (
    select 1
    from public.workouts w
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where w.id = exercises.workout_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
);

-- 6. 새로운 sets 정책 (exercise_id 기반)
drop policy if exists "Sets select via workout group" on public.sets;
drop policy if exists "Sets insert via workout group" on public.sets;
drop policy if exists "Sets update via workout group" on public.sets;
drop policy if exists "Sets delete via workout group" on public.sets;
drop policy if exists "Sets select via exercise group" on public.sets;
drop policy if exists "Sets insert via exercise group" on public.sets;
drop policy if exists "Sets update via exercise group" on public.sets;
drop policy if exists "Sets delete via exercise group" on public.sets;

-- sets 조회 정책
create policy "Sets select via exercise group" on public.sets
for select using (
  exists (
    select 1
    from public.exercises e
    join public.workouts w on w.id = e.workout_id
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where e.id = sets.exercise_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
);

-- sets 삽입 정책
create policy "Sets insert via exercise group" on public.sets
for insert with check (
  exists (
    select 1
    from public.exercises e
    join public.workouts w on w.id = e.workout_id
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where e.id = sets.exercise_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
);

-- sets 수정 정책
create policy "Sets update via exercise group" on public.sets
for update using (
  exists (
    select 1
    from public.exercises e
    join public.workouts w on w.id = e.workout_id
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where e.id = sets.exercise_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
) with check (
  exists (
    select 1
    from public.exercises e
    join public.workouts w on w.id = e.workout_id
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where e.id = sets.exercise_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
);

-- sets 삭제 정책
create policy "Sets delete via exercise group" on public.sets
for delete using (
  exists (
    select 1
    from public.exercises e
    join public.workouts w on w.id = e.workout_id
    join public.users u_owner on u_owner.id = w.user_id
    join public.users u_me on u_me.id = auth.uid()
    where e.id = sets.exercise_id
      and coalesce(u_owner.group_key, '') <> ''
      and trim(u_owner.group_key) = trim(u_me.group_key)
  )
);

-- 7. 백업 테이블 정리 (필요시 주석 해제)
-- drop table if exists public.sets_backup;
