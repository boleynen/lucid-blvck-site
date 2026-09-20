-- Lucid Entom shop. Run once in Supabase -> SQL Editor.
create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  dimensions text not null default '',
  price_cents integer not null check (price_cents >= 50),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  stock_quantity integer not null default 1 check (stock_quantity >= 0),
  image_url text not null,
  storage_path text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  stripe_session_id text not null unique,
  customer_email text,
  customer_name text,
  shipping_address jsonb,
  amount_total integer not null,
  currency text not null default 'eur',
  items jsonb not null,
  status text not null default 'new' check (status in ('new','shipped','completed','cancelled')),
  created_at timestamptz not null default now()
);

alter table public.shop_products enable row level security;
alter table public.shop_orders enable row level security;

revoke insert, update, delete on public.shop_products from anon;
revoke insert, update, delete on public.shop_orders from anon, authenticated;

drop policy if exists "Public can read active shop products" on public.shop_products;
create policy "Public can read active shop products" on public.shop_products
for select to anon, authenticated using (active = true);

drop policy if exists "Admin can add shop products" on public.shop_products;
create policy "Admin can add shop products" on public.shop_products
for insert to authenticated with check (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));

drop policy if exists "Admin can update shop products" on public.shop_products;
create policy "Admin can update shop products" on public.shop_products
for update to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())))
with check (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));

drop policy if exists "Admin can delete shop products" on public.shop_products;
create policy "Admin can delete shop products" on public.shop_products
for delete to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));

drop policy if exists "Admin can read shop orders" on public.shop_orders;
create policy "Admin can read shop orders" on public.shop_orders
for select to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('shop-images','shop-images',true,15728640,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=15728640,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Admin can upload shop images" on storage.objects;
create policy "Admin can upload shop images" on storage.objects for insert to authenticated with check (
  bucket_id='shop-images' and exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);
drop policy if exists "Admin can update shop images" on storage.objects;
create policy "Admin can update shop images" on storage.objects for update to authenticated using (
  bucket_id='shop-images' and exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);
drop policy if exists "Admin can delete shop images" on storage.objects;
create policy "Admin can delete shop images" on storage.objects for delete to authenticated using (
  bucket_id='shop-images' and exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);

create or replace function public.process_lucid_paid_order(
  p_event_id text,
  p_session_id text,
  p_items jsonb,
  p_customer_email text,
  p_customer_name text,
  p_shipping_address jsonb,
  p_amount_total integer,
  p_currency text
) returns boolean language plpgsql security definer set search_path = public as $$
declare item jsonb; inserted_id uuid;
begin
  insert into public.shop_orders(stripe_event_id,stripe_session_id,customer_email,customer_name,shipping_address,amount_total,currency,items)
  values(p_event_id,p_session_id,p_customer_email,p_customer_name,p_shipping_address,p_amount_total,p_currency,p_items)
  on conflict(stripe_event_id) do nothing returning id into inserted_id;
  if inserted_id is null then return false; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    update public.shop_products set stock_quantity=stock_quantity-(item->>'quantity')::integer
    where id=(item->>'id')::uuid and active=true and stock_quantity >= (item->>'quantity')::integer;
    if not found then raise exception 'Insufficient stock for item %', item->>'id'; end if;
  end loop;
  return true;
end;
$$;

revoke all on function public.process_lucid_paid_order(text,text,jsonb,text,text,jsonb,integer,text) from public, anon, authenticated;
grant execute on function public.process_lucid_paid_order(text,text,jsonb,text,text,jsonb,integer,text) to service_role;
