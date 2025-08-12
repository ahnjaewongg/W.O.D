-- 일별 대표 사진을 위한 스키마 확장
-- 기존 photos 테이블에 date 컬럼 추가하고 workout_id를 nullable로 변경

-- workout_id를 nullable로 변경
alter table public.photos alter column workout_id drop not null;

-- date 컬럼 추가 (일별 사진용)
alter table public.photos add column if not exists date date;

-- 일별 사진과 운동별 사진을 구분하는 체크 제약 조건
-- workout_id가 있으면 운동별 사진, date가 있으면 일별 사진
alter table public.photos add constraint photos_type_check 
  check (
    (workout_id is not null and date is null) or 
    (workout_id is null and date is not null)
  );

-- 일별 사진 인덱스 추가
create index if not exists idx_photos_user_date on public.photos(user_id, date desc) where date is not null;

-- 사용자당 하루에 최대 10장 제한 (선택사항)
-- create unique index if not exists idx_photos_daily_limit on public.photos(user_id, date, id) where date is not null;

-- RLS 정책 업데이트 (기존 정책들이 date 컬럼을 고려하도록)
-- 기존 정책들은 workout_id 기반이므로 일별 사진을 위한 새 정책 추가

-- 일별 사진 읽기 정책 (자신의 사진)
drop policy if exists "daily_photos read own" on public.photos;
create policy "daily_photos read own" on public.photos
for select using (
  date is not null and user_id = auth.uid()
);

-- 일별 사진 읽기 정책 (그룹 멤버)
drop policy if exists "daily_photos read by group" on public.photos;
create policy "daily_photos read by group" on public.photos
for select using (
  date is not null and user_id in (
    select u_owner.id
    from public.users u_owner
    join public.users u_me on u_me.id = auth.uid()
    where coalesce(u_owner.group_key, '') <> ''
      and u_owner.group_key = u_me.group_key
  )
);

-- 일별 사진 쓰기 정책
drop policy if exists "daily_photos write own" on public.photos;
create policy "daily_photos write own" on public.photos
for insert with check (
  date is not null and user_id = auth.uid()
);

-- 일별 사진 업데이트 정책
drop policy if exists "daily_photos update own" on public.photos;
create policy "daily_photos update own" on public.photos
for update using (
  date is not null and user_id = auth.uid()
) with check (
  date is not null and user_id = auth.uid()
);

-- 일별 사진 삭제 정책
drop policy if exists "daily_photos delete own" on public.photos;
create policy "daily_photos delete own" on public.photos
for delete using (
  date is not null and user_id = auth.uid()
);
