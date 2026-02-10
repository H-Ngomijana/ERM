#!/usr/bin/env python3
"""
RLS Fix Script - Apply Row Level Security policies to fix Add Client/Vehicle errors
"""

import os
import sys
from supabase import create_client, Client

# Get Supabase credentials from environment
SUPABASE_URL = "https://cmdahjpbezqxvbhbitnl.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_KEY:
    print("ERROR: SUPABASE_KEY environment variable not set")
    print("Please set it with your Supabase API key")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# SQL to fix RLS policies
fix_rls_sql = """
-- Drop ALL problematic policies first
DROP POLICY IF EXISTS "Staff can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can view clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.clients;

DROP POLICY IF EXISTS "Staff can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Staff can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Staff can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can delete vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can delete vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.vehicles;

-- Ensure RLS is enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
CREATE POLICY "clients_authenticated_all" ON public.clients
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vehicles_authenticated_all" ON public.vehicles
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

SELECT 'RLS policies updated successfully!' as status;
"""

try:
    print("Applying RLS fix policies...")
    response = supabase.rpc('exec_sql', {'sql': fix_rls_sql}).execute()
    print("✅ RLS policies fixed successfully!")
    print(response)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
