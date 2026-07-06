-- Migration: Add new fields for updated MQTT payload format
-- Run this in Supabase SQL Editor

-- Add new telemetry columns to devices table
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS last_alt float4 DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pos_source varchar(10) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS gps_status varchar(10) DEFAULT 'NO_FIX',
  ADD COLUMN IF NOT EXISTS sim_status varchar(20) DEFAULT 'NOT_READY',
  ADD COLUMN IF NOT EXISTS network_status varchar(20) DEFAULT 'NOT_ATTACHED',
  ADD COLUMN IF NOT EXISTS device_time timestamptz;

-- Add pos_source to location_history positions for richer history
-- (positions JSONB will include pos_source per point naturally)
-- No schema change needed for location_history
