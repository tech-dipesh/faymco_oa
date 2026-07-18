create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  withdrawable_balance numeric(12,2) not null default 0,
  last_withdrawal_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  brand text not null,
  earning numeric(12,2) not null check (earning > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  advance_paid boolean not null default false,
  advance_amount numeric(12,2),
  advance_paid_at timestamptz,
  reconciled_at timestamptz,
  created_at timestamptz not null default now()
);


-- Adding Indexing to a Db for faster read query

create index if not exists sales_user_idx on sales(user_id);
create index if not exists sales_pending_advance_idx on sales(status, advance_paid);

create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz
);

create index if not exists withdrawals_user_idx on withdrawals(user_id);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  sale_id uuid references sales(id),
  withdrawal_id uuid references withdrawals(id),
  type text not null check (type in ('advance', 'final', 'adjustment', 'recovery')),
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists payouts_user_idx on payouts(user_id);
create index if not exists payouts_sale_idx on payouts(sale_id);
