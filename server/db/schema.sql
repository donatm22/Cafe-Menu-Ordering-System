create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'admin' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cafe_tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  table_code text not null unique,
  seating_capacity integer not null default 0,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete restrict,
  name text not null,
  description text,
  image_url text,
  price_cents integer not null check (price_cents >= 0),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references cafe_tables(id) on delete restrict,
  order_number text not null unique,
  customer_name text,
  notes text,
  status text not null default 'new' check (
    status in ('new', 'preparing', 'ready', 'served', 'cancelled')
  ),
  payment_method text not null default 'cash' check (payment_method in ('cash')),
  payment_status text not null default 'pending' check (
    payment_status in ('pending', 'paid')
  ),
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete restrict,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  price_cents integer not null check (price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_items_category_id on menu_items(category_id);
create index if not exists idx_menu_items_is_available on menu_items(is_available);
create index if not exists idx_orders_table_id on orders(table_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_order_items_order_id on order_items(order_id);

drop trigger if exists trg_admin_users_updated_at on admin_users;
create trigger trg_admin_users_updated_at
before update on admin_users
for each row
execute procedure set_updated_at();

drop trigger if exists trg_categories_updated_at on categories;
create trigger trg_categories_updated_at
before update on categories
for each row
execute procedure set_updated_at();

drop trigger if exists trg_cafe_tables_updated_at on cafe_tables;
create trigger trg_cafe_tables_updated_at
before update on cafe_tables
for each row
execute procedure set_updated_at();

drop trigger if exists trg_menu_items_updated_at on menu_items;
create trigger trg_menu_items_updated_at
before update on menu_items
for each row
execute procedure set_updated_at();

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
before update on orders
for each row
execute procedure set_updated_at();
