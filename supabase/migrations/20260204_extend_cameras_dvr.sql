-- Migration: Extend cameras table for DVR/RTSP integration
-- Adds DVR connection details and RTSP streaming configuration

BEGIN;

-- Extend cameras table with DVR/RTSP fields
ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS dvr_ip TEXT,
  ADD COLUMN IF NOT EXISTS dvr_username TEXT,
  ADD COLUMN IF NOT EXISTS dvr_password TEXT,
  ADD COLUMN IF NOT EXISTS channel_number INT,
  ADD COLUMN IF NOT EXISTS rtsp_url TEXT,
  ADD COLUMN IF NOT EXISTS last_tested TIMESTAMP,
  ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'untested'; -- untested, online, offline

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cameras_dvr_ip ON public.cameras(dvr_ip);
CREATE INDEX IF NOT EXISTS idx_cameras_connection_status ON public.cameras(connection_status);

COMMIT;
