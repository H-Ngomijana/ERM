import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createMonitor } from './heartbeat_monitor.js';

// Load server/.env relative to this file (works regardless of process.cwd())
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
// Debug: show where we loaded env from and key presence
// eslint-disable-next-line no-console
console.log('Loaded server env from:', path.resolve(__dirname, '..', '.env'));
// eslint-disable-next-line no-console
console.log('SUPABASE_URL env present?', !!process.env.SUPABASE_URL);

// cameraRoutes will be dynamically imported after env is loaded
let cameraRoutes;

// Dynamically import camera routes after dotenv has run so env vars are present
const cameraModule = await import('./camera_routes.js');
cameraRoutes = cameraModule.default || cameraModule;

const PORT = process.env.PORT || 4000;
function stripEnv(v) { return v == null ? '' : String(v).trim().replace(/^\"|\"$/g, ''); }

const EDGE_API_KEY = stripEnv(process.env.EDGE_API_KEY);
const SUPABASE_URL = stripEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = stripEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase configuration in environment. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in server/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

// Simple API key middleware for camera/edge services
app.use((req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!EDGE_API_KEY) return next(); // If not set, allow (dev)
  if (!key || key !== EDGE_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Mount Gate (CCTV) module routes
app.use('/api/gate', cameraRoutes);

// Start heartbeat monitor for camera health checks
const hbMonitor = createMonitor(supabase, {
  checkIntervalSec: 60,
  offlineThresholdSec: 300 // 5 minutes
});
hbMonitor.start();

// POST /api/camera/vehicle-entry
app.post('/api/camera/vehicle-entry', async (req, res) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress;
    const body = req.body || {};
    const { plate_number, timestamp, camera_id, image_url, confidence } = body;

    // Validation
    if (!plate_number || String(plate_number).trim() === '') {
      return res.status(400).json({ error: 'plate_number required' });
    }
    const conf = Number(confidence || 0);
    if (isNaN(conf) || conf < 0) {
      return res.status(400).json({ error: 'confidence numeric required' });
    }
    if (conf < 85) {
      // Low confidence - reject
      await supabase.from('audit_logs').insert({
        action: 'VEHICLE_ENTRY_LOW_CONFIDENCE',
        actor_id: null,
        entity_type: 'camera_event',
        details: { plate_number, confidence: conf, camera_id },
        ip_address: ip
      });
      return res.status(422).json({ error: 'Low confidence', confidence: conf });
    }

    const eventTime = timestamp ? new Date(timestamp) : new Date();

    // Rule checks
    // 1. Duplicate (already inside)
    const { data: existingInside } = await supabase
      .from('garage_entries')
      .select('id')
      .eq('plate_number', plate_number)
      .eq('status', 'inside')
      .limit(1);

    // 2. Capacity
    const { data: capacityRow } = await supabase
      .from('garage_settings')
      .select('value')
      .eq('key', 'capacity')
      .maybeSingle();
    let capacity = 0;
    if (capacityRow && capacityRow.value) {
      try { capacity = parseInt(capacityRow.value); } catch (e) { capacity = Number(capacityRow.value) || 0; }
    }
    const { count: insideCount } = await supabase
      .from('garage_entries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'inside');

    // 3. Operating hours
    const { data: hoursRow } = await supabase
      .from('garage_settings')
      .select('value')
      .eq('key', 'operating_hours')
      .maybeSingle();
    let afterHours = false;
    if (hoursRow && hoursRow.value) {
      try {
        const v = typeof hoursRow.value === 'string' ? JSON.parse(hoursRow.value) : hoursRow.value;
        const start = v.start || '00:00';
        const end = v.end || '23:59';
        const hh = eventTime.getHours();
        const mm = eventTime.getMinutes();
        const nowMinutes = hh * 60 + mm;
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        const startMinutes = sH * 60 + sM;
        const endMinutes = eH * 60 + eM;
        if (!(nowMinutes >= startMinutes && nowMinutes <= endMinutes)) afterHours = true;
      } catch (e) {
        // ignore
      }
    }

    const alerts = [];

    if (existingInside && existingInside.length) {
      alerts.push({ type: 'duplicate_entry', severity: 'critical', message: `Duplicate plate ${plate_number} already inside` });
    }

    if (capacity > 0 && typeof insideCount === 'number' && insideCount >= capacity) {
      alerts.push({ type: 'capacity_warning', severity: 'warning', message: `Garage capacity exceeded (${insideCount}/${capacity})` });
    }

    if (afterHours) {
      alerts.push({ type: 'after_hours', severity: 'warning', message: `Entry detected after operating hours for ${plate_number}` });
    }

    // Insert garage entry record
    const entryPayload = {
      plate_number,
      entry_time: eventTime.toISOString(),
      camera_id: camera_id || null,
      status: 'inside',
      snapshot_url: image_url || null,
      notes: JSON.stringify({ confidence: conf }),
      created_by: null,
      created_at: new Date().toISOString(),
      source: 'cctv'
    };

    const { data: insertedEntry, error: insertErr } = await supabase
      .from('garage_entries')
      .insert(entryPayload)
      .select()
      .single();

    if (insertErr) {
      console.error('Insert entry error', insertErr);
      await supabase.from('audit_logs').insert({ action: 'VEHICLE_ENTRY_FAILED', details: { plate_number, error: insertErr.message }, ip_address: ip });
      return res.status(500).json({ error: 'Failed to insert entry' });
    }

    // Insert audit log
    await supabase.from('audit_logs').insert({
      action: 'VEHICLE_ENTRY',
      actor_id: null,
      entity_type: 'garage_entry',
      entity_id: insertedEntry.id,
      details: { plate_number, camera_id, confidence: conf },
      ip_address: ip
    });

    // Create alerts if any
    for (const a of alerts) {
      await supabase.from('alerts').insert({
        garage_entry_id: insertedEntry.id,
        vehicle_id: null,
        type: a.type,
        severity: a.severity === 'critical' ? 'critical' : 'warning',
        message: a.message,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    // TODO: Trigger notifications / real-time push (frontend subscribes to DB changes)

    return res.json({ ok: true, entry: insertedEntry, alerts });
  } catch (err) {
    console.error('Error handling vehicle-entry', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/fix-rls
// Apply RLS policy fixes (admin only)
app.post('/api/admin/fix-rls', async (req, res) => {
  try {
    console.log('Applying RLS policy fixes...');
    
    const sql = `
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
      CREATE POLICY IF NOT EXISTS "clients_authenticated_all" ON public.clients
        FOR ALL
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL);

      CREATE POLICY IF NOT EXISTS "vehicles_authenticated_all" ON public.vehicles
        FOR ALL
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL);
    `;

    // Execute using supabase.rpc (service role key has privileges)
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('RLS fix error:', error);
      return res.status(500).json({ error: 'Failed to apply RLS fixes', details: error.message });
    }
    
    console.log('✓ RLS policies fixed successfully');
    return res.json({ 
      ok: true, 
      message: 'RLS policies fixed. Authenticated users can now add clients and vehicles.'
    });
  } catch (err) {
    console.error('Error applying RLS fixes:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`KINAMBA ERM server listening on port ${PORT}`);
});
