-- 현재 로그인한 사용자 확인
SELECT auth.uid() as current_user_id, auth.email() as current_email;

-- users 테이블에 레코드가 있는지 확인
SELECT * FROM public.users WHERE id = auth.uid();

-- 없다면 수동으로 생성 (아래 명령어 실행)
-- INSERT INTO public.users (id, email, display_name, group_key)
-- VALUES (
--   auth.uid(), 
--   auth.email(), 
--   split_part(auth.email(), '@', 1),
--   'friends-a'  -- 또는 해당하는 그룹키
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   email = EXCLUDED.email,
--   display_name = EXCLUDED.display_name;

-- group_members 테이블 확인
SELECT * FROM public.group_members WHERE email = auth.email();
