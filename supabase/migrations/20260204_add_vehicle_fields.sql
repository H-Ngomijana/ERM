-- Add client_gender column to vehicles table
ALTER TABLE public.vehicles ADD COLUMN client_gender TEXT DEFAULT NULL;

-- Add check constraint to ensure only valid values
ALTER TABLE public.vehicles ADD CONSTRAINT valid_client_gender CHECK (client_gender IN ('male', 'female', NULL));
