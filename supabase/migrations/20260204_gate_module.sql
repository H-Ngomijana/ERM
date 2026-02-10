-- Migration: Gate Module
-- Adds cameras table, approvals table, source/lifecycle fields, and indexes

BEGIN;

-- cameras table
CREATE TABLE IF NOT EXISTS public.cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id TEXT UNIQUE NOT NULL,
  name TEXT,
  api_key TEXT,
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- approvals table
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_entry_id UUID REFERENCES public.garage_entries(id),
  client_id UUID REFERENCES public.clients(id),
  method TEXT, -- sms, whatsapp, web
  approval_status TEXT, -- pending, approved, rejected
  sent_at TIMESTAMP,
  responded_at TIMESTAMP,
  response_payload JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Add source and lifecycle_status to garage_entries
ALTER TABLE public.garage_entries
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT DEFAULT 'ENTERED';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cameras_status ON public.cameras(status);
CREATE INDEX IF NOT EXISTS idx_garage_entries_plate_status ON public.garage_entries(plate_number, lifecycle_status);

COMMIT;
