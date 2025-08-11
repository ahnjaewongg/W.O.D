-- Create private storage bucket for photos
insert into storage.buckets (id, name, public)
values ('workout-photos', 'workout-photos', false)
on conflict (id) do nothing;

-- Storage RLS policies to restrict objects by first path segment = auth.uid()
-- Name convention: {user_id}/{workout_id}/{uuid}.jpg

drop policy if exists "photos read own" on storage.objects;
create policy "photos read own" on storage.objects
for select using (
  bucket_id = 'workout-photos' and substring(name from 1 for 36) = auth.uid()::text
);

-- Allow fixed friends to read each other's photos
drop policy if exists "photos read by group" on storage.objects;
create policy "photos read by group" on storage.objects
for select using (
  bucket_id = 'workout-photos' and substring(name from 1 for 36) in (
    select u_owner.id::text
    from public.users u_owner
    join public.users u_me on u_me.id = auth.uid()
    where coalesce(u_owner.group_key, '') <> ''
      and u_owner.group_key = u_me.group_key
  )
);

drop policy if exists "photos write own" on storage.objects;
create policy "photos write own" on storage.objects
for insert with check (
  bucket_id = 'workout-photos' and substring(name from 1 for 36) = auth.uid()::text
);

drop policy if exists "photos update own" on storage.objects;
create policy "photos update own" on storage.objects
for update using (
  bucket_id = 'workout-photos' and substring(name from 1 for 36) = auth.uid()::text
) with check (
  bucket_id = 'workout-photos' and substring(name from 1 for 36) = auth.uid()::text
);

drop policy if exists "photos delete own" on storage.objects;
create policy "photos delete own" on storage.objects
for delete using (
  bucket_id = 'workout-photos' and substring(name from 1 for 36) = auth.uid()::text
);


