-- 실제 친구들의 이메일로 업데이트하세요
-- 아래 이메일들을 실제 친구들 이메일로 변경한 후 실행

-- 기존 예시 데이터 삭제
delete from public.group_members;

-- 실제 친구 3명의 이메일로 변경하세요
insert into public.group_members(email, group_key) values
  ('첫번째친구@gmail.com','friends-trio'),
  ('두번째친구@gmail.com','friends-trio'), 
  ('세번째친구@gmail.com','friends-trio')
on conflict (email) do update set group_key = excluded.group_key;

-- 기존 사용자들의 그룹키 업데이트
update public.users u
set group_key = gm.group_key
from public.group_members gm
where lower(u.email) = lower(gm.email);
