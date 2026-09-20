-- Run after setup.sql and shop-setup.sql. Safe to run again.
-- Existing cover images and access restrictions are preserved.
begin;

-- Also supports projects whose tattoo-gallery setup was done outside this repo.
create table if not exists public.tattoo_gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  placement text not null default '',
  image_url text not null,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.tattoo_gallery enable row level security;
grant select on public.tattoo_gallery to anon, authenticated;
grant insert, update, delete on public.tattoo_gallery to authenticated;
revoke insert, update, delete on public.tattoo_gallery from anon;

drop policy if exists "Public can read tattoo projects" on public.tattoo_gallery;
create policy "Public can read tattoo projects" on public.tattoo_gallery
for select to anon, authenticated using (true);
drop policy if exists "Admin can manage tattoo projects" on public.tattoo_gallery;
create policy "Admin can manage tattoo projects" on public.tattoo_gallery
for all to authenticated
using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())))
with check (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));

alter table public.tattoo_gallery add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.shop_products add column if not exists images jsonb not null default '[]'::jsonb;

update public.tattoo_gallery set images = jsonb_build_array(jsonb_build_object('image_url', image_url, 'storage_path', storage_path))
where images = '[]'::jsonb;
update public.shop_products set images = jsonb_build_array(jsonb_build_object('image_url', image_url, 'storage_path', storage_path))
where images = '[]'::jsonb;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tattoo-images','tattoo-images',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

drop policy if exists "Admin can upload tattoo project photos" on storage.objects;
create policy "Admin can upload tattoo project photos" on storage.objects
for insert to authenticated with check (
  bucket_id='tattoo-images' and exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);
drop policy if exists "Admin can delete tattoo project photos" on storage.objects;
create policy "Admin can delete tattoo project photos" on storage.objects
for delete to authenticated using (
  bucket_id='tattoo-images' and exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);

notify pgrst, 'reload schema';
commit;
