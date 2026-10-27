-- Run in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  phone text not null,
  email text,
  ticket_type text not null check (ticket_type in ('advance_regular','advance_couple','gate_regular','gate_couple')),
  quantity integer not null check (quantity between 1 and 10),
  unit_price integer not null check (unit_price in (350,600,400,700)),
  total_amount integer not null check (total_amount > 0),
  payment_status text not null default 'pending_payment' check (payment_status in ('pending_payment','payment_submitted','paid','rejected')),
  transaction_code text unique,
  payment_submitted_at timestamptz,
  verified_at timestamptz,
  verified_by text,
  admin_note text,
  created_at timestamptz not null default now()
);

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists bookings_payment_status_idx on public.bookings (payment_status);

-- API uses the server-only service role key. Do not expose that key to the browser.
-- Keep RLS enabled so the public anon key cannot read or modify customer records.
alter table public.bookings enable row level security;
