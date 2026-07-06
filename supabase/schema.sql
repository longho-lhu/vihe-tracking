-- Vehicle Tracking App - Supabase Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ========================
-- Users / Accounts
-- ========================
create table if not exists accounts (
  id uuid primary key default uuid_generate_v4(),
  username varchar(100) unique not null,
  password_hash text not null,
  display_name varchar(200),
  role varchar(20) not null default 'admin' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

-- ========================
-- Devices
-- ========================
create type device_status as enum ('moving', 'waiting', 'sleeping', 'offline');

create table if not exists devices (
  id uuid primary key default uuid_generate_v4(),
  mac_address varchar(17) unique not null,
  license_plate varchar(20),
  vehicle_type varchar(50),
  owner_id uuid references accounts(id) on delete set null,
  mqtt_topic varchar(200) unique not null,
  status device_status not null default 'offline',
  last_seen timestamptz,
  last_lat float8,
  last_lng float8,
  last_speed float4 default 0,
  is_configured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========================
-- Location History
-- ========================
create table if not exists location_history (
  id uuid primary key default uuid_generate_v4(),
  device_id uuid not null references devices(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  positions jsonb not null default '[]',
  duration_seconds integer not null default 60,
  start_lat float8,
  start_lng float8,
  end_lat float8,
  end_lng float8
);

create index if not exists idx_location_history_device_time 
  on location_history(device_id, recorded_at desc);

-- ========================
-- Notifications
-- ========================
create type notification_type as enum ('new_device', 'status_change', 'offline_alert', 'info');

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  type notification_type not null default 'info',
  device_id uuid references devices(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_read_time 
  on notifications(is_read, created_at desc);

-- ========================
-- Trigger: auto-update updated_at
-- ========================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger devices_updated_at
  before update on devices
  for each row execute function update_updated_at_column();

-- ========================
-- Row Level Security (RLS)
-- ========================
-- Note: We use server-side auth with service_role key so RLS is permissive here
-- but enable it for future granular control

alter table accounts enable row level security;
alter table devices enable row level security;
alter table location_history enable row level security;
alter table notifications enable row level security;

-- Allow all operations via service_role (server-side)
create policy "Service role bypass" on accounts for all using (true) with check (true);
create policy "Service role bypass" on devices for all using (true) with check (true);
create policy "Service role bypass" on location_history for all using (true) with check (true);
create policy "Service role bypass" on notifications for all using (true) with check (true);
