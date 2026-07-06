-- FCM Tokens Migration
-- Run this in Supabase SQL Editor AFTER schema.sql

-- ========================
-- FCM Tokens
-- ========================
create table if not exists fcm_tokens (
  id uuid primary key default uuid_generate_v4(),
  token text unique not null,
  device_label varchar(100),       -- Tên thiết bị mobile (e.g. "iPhone của Nam")
  platform varchar(10) default 'unknown' check (platform in ('android', 'ios', 'web', 'unknown')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists idx_fcm_tokens_token on fcm_tokens(token);

alter table fcm_tokens enable row level security;
create policy "Service role bypass" on fcm_tokens for all using (true) with check (true);
