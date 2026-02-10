-- Fix RLS Policies for Add Client and Add Vehicle
-- Remove restrictive policies that are blocking inserts

-- ============================================================================
-- STEP 1: Drop ALL problematic policies
-- ============================================================================

-- Clients table
DROP POLICY IF EXISTS "Staff can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can view clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.clients;

-- Vehicles table
DROP POLICY IF EXISTS "Staff can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Staff can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Staff can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can delete vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can delete vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.vehicles;

-- ============================================================================
-- STEP 2: Ensure RLS is ENABLED on tables
-- ============================================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create simple, permissive RLS policies for authenticated users
-- ============================================================================

-- CLIENTS TABLE - Allow any authenticated user to insert, view, update
CREATE POLICY "clients_authenticated_all" ON public.clients
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- VEHICLES TABLE - Allow any authenticated user to insert, view, update
CREATE POLICY "vehicles_authenticated_all" ON public.vehicles
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- VERIFY: Show all active policies
-- ============================================================================

-- Run this query to verify policies are applied:
-- SELECT tablename, policyname, permissive, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('clients', 'vehicles')
-- ORDER BY tablename, policyname;
