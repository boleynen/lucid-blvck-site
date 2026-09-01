-- Run this once in Supabase → SQL Editor.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.flash (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  estimated_price text not null default 'On request',
  size text not null default 'On request',
  status text not null default 'Available',
  image_url text not null,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.flash enable row level security;

create policy "Public can read flash" on public.flash
for select to anon, authenticated using (true);

create policy "Admin can add flash" on public.flash
for insert to authenticated with check (
  exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);

create policy "Admin can update flash" on public.flash
for update to authenticated using (
  exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
) with check (
  exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);

create policy "Admin can delete flash" on public.flash
for delete to authenticated using (
  exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('flash-images','flash-images',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=10485760,
allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create policy "Admin can upload flash images" on storage.objects
for insert to authenticated with check (
  bucket_id='flash-images' and
  exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);

create policy "Admin can update flash images" on storage.objects
for update to authenticated using (
  bucket_id='flash-images' and
  exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);

create policy "Admin can delete flash images" on storage.objects
for delete to authenticated using (
  bucket_id='flash-images' and
  exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);

-- After creating your user in Authentication → Users, replace the UUID below
-- and run only that insert separately:
-- insert into public.admin_users(user_id) values('YOUR-USER-UUID');
