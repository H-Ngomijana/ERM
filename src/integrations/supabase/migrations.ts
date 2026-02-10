import { supabase } from './client';

/**
 * Apply database migrations programmatically
 * This creates the garage_settings table, client_gender column, and fixes RLS policies
 */
export const applyMigrations = async () => {
  try {
    console.log('Checking database schema and RLS policies...');
    
    // Fix 0: Create garage_settings table if it doesn't exist
    console.log('Creating garage_settings table if needed...');
    const { error: settingsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.garage_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key TEXT NOT NULL UNIQUE,
            value JSONB NOT NULL,
            description TEXT,
            updated_by UUID REFERENCES auth.users(id),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );

        -- Insert default garage settings if table is empty
        INSERT INTO public.garage_settings (key, value, description) VALUES
        ('capacity', '50', 'Maximum number of vehicles'),
        ('operating_hours', '{"start": "08:00", "end": "20:00"}', 'Operating hours'),
        ('overdue_threshold_hours', '24', 'Hours before vehicle is considered overdue'),
        ('critical_threshold_hours', '48', 'Hours before vehicle triggers critical alert')
        ON CONFLICT (key) DO NOTHING;

        -- Enable RLS on garage_settings
        ALTER TABLE public.garage_settings ENABLE ROW LEVEL SECURITY;

        -- Drop old policies if they exist
        DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.garage_settings;
        DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.garage_settings;
        DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.garage_settings;
        DROP POLICY IF EXISTS "garage_settings_authenticated_all" ON public.garage_settings;

        -- Create permissive policy for authenticated users
        CREATE POLICY "garage_settings_authenticated_all" ON public.garage_settings
          FOR ALL
          USING (auth.uid() IS NOT NULL)
          WITH CHECK (auth.uid() IS NOT NULL);
      `
    }).catch(() => {
      return { error: { message: 'RPC not available, using fallback' } };
    });

    if (settingsError?.message.includes('RPC') || settingsError?.message.includes('not found')) {
      console.log('RPC not available for garage_settings creation');
    } else if (!settingsError) {
      console.log('✓ garage_settings table created/verified');
    } else {
      console.warn('Warning creating garage_settings:', settingsError.message);
    }
    
    // Fix 1: Add client_gender column to vehicles table if it doesn't exist
    console.log('Applying schema migrations...');
    const { error: columnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.vehicles 
        ADD COLUMN IF NOT EXISTS client_gender TEXT DEFAULT NULL;
      `
    }).catch(() => {
      return { error: { message: 'RPC not available, using fallback' } };
    });

    if (columnError?.message.includes('RPC') || columnError?.message.includes('not found')) {
      console.log('RPC not available for schema check');
    } else if (!columnError) {
      console.log('✓ Schema migration applied: client_gender column added');
    }

    // Fix 2: Fix RLS policies to allow authenticated users to insert
    console.log('Applying RLS policy fixes...');
    try {
      const { error: rlsError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Drop problematic policies
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
          DROP POLICY IF EXISTS "clients_authenticated_all" ON public.clients;
          CREATE POLICY "clients_authenticated_all" ON public.clients
            FOR ALL
            USING (auth.uid() IS NOT NULL)
            WITH CHECK (auth.uid() IS NOT NULL);

          DROP POLICY IF EXISTS "vehicles_authenticated_all" ON public.vehicles;
          CREATE POLICY "vehicles_authenticated_all" ON public.vehicles
            FOR ALL
            USING (auth.uid() IS NOT NULL)
            WITH CHECK (auth.uid() IS NOT NULL);
        `
      });

      if (rlsError) {
        if (rlsError.message.includes('RPC') || rlsError.message.includes('not found')) {
          console.warn('⚠ RPC exec_sql not available. Please apply RLS fix manually in Supabase SQL Editor');
        } else {
          console.warn('RLS policy update warning:', rlsError.message);
        }
      } else {
        console.log('✓ RLS policies fixed: Authenticated users can now add clients and vehicles');
      }
    } catch (err) {
      console.warn('Could not apply RLS fixes via RPC:', err);
    }

  } catch (err) {
    console.warn('Migration check encountered an issue:', err);
  }
};

/**
 * Auto-migrate database schema on app startup
 * Ensures all required columns exist
 */
export const autoMigrateSchema = async () => {
  try {
    await applyMigrations();
  } catch (err) {
    console.warn('Schema migration failed:', err);
  }
};

