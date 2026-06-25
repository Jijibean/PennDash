-- ============================================================
-- PennDash Supabase Schema
-- Run this in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- ORDERS
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  user_email     text not null,
  amount         numeric not null,
  dining_hall    text not null,
  dorm           text not null,
  details        text,
  delivery_time  text,
  status         text default 'open',          -- open | claimed | delivered
  payment_status text default 'pending',       -- pending | paid | failed
  claimed_by     text,
  delivered_at   timestamptz,
  created_at     timestamptz default now()
);

-- CHATS
create table if not exists chats (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid references orders(id) on delete cascade,
  requester_email  text,
  deliverer_email  text,
  order_amount     numeric,
  dining_hall      text,
  dorm             text,
  created_at       timestamptz default now(),
  status           text default 'active'
);

-- MESSAGES
create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  chat_id      uuid references chats(id) on delete cascade,
  sender_email text,
  content      text,
  created_at   timestamptz default now()
);

-- USERS  (stores Stripe Connect account IDs so they survive server restarts)
create table if not exists users (
  email              text primary key,
  stripe_account_id  text,
  verified_at        timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ============================================================
-- Row-Level Security (RLS)
-- Enable this AFTER you have verified the app works, so you
-- don't lock yourself out during testing.
-- ============================================================

-- Step 1: Enable RLS on each table
-- alter table orders   enable row level security;
-- alter table chats    enable row level security;
-- alter table messages enable row level security;
-- alter table users    enable row level security;

-- Step 2: Add policies
-- (Uncomment when ready. These assume you pass the user's JWT via Authorization header.)

-- Anyone can read open orders; users can only modify their own.
-- create policy "read open orders"    on orders for select using (status = 'open' or user_email = auth.jwt() ->> 'email' or claimed_by = auth.jwt() ->> 'email');
-- create policy "insert own orders"   on orders for insert with check (user_email = auth.jwt() ->> 'email');
-- create policy "update own orders"   on orders for update using (user_email = auth.jwt() ->> 'email' or claimed_by = auth.jwt() ->> 'email');
-- create policy "delete own orders"   on orders for delete using (user_email = auth.jwt() ->> 'email');

-- Users can only see chats they're part of.
-- create policy "read own chats"      on chats for select using (requester_email = auth.jwt() ->> 'email' or deliverer_email = auth.jwt() ->> 'email');
-- create policy "insert own chats"    on chats for insert with check (deliverer_email = auth.jwt() ->> 'email');

-- Users can only see messages in chats they're part of.
-- create policy "read chat messages"  on messages for select using (
--   exists (select 1 from chats where chats.id = messages.chat_id and (chats.requester_email = auth.jwt() ->> 'email' or chats.deliverer_email = auth.jwt() ->> 'email'))
-- );
-- create policy "insert own messages" on messages for insert with check (sender_email = auth.jwt() ->> 'email');
