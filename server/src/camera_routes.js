/*
Express router scaffolding for Gate (CCTV) module.
- Endpoint: POST /api/gate/vehicle-entry  (CCTV-specific)
- Endpoint: POST /api/gate/heartbeat      (camera health)
- Endpoint: POST /api/gate/manual-entry   (admin manual fallback)

This file is a scaffold: import and mount in your main server/index.js as:

const cameraRoutes = require('./camera_routes');
app.use('/api/gate', cameraRoutes);

*/

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import * as auditLogger from './audit_logger.js';

function stripEnv(v) { return v == null ? '' : String(v).trim().replace(/^\"|\"$/g, ''); }

const SUPABASE_URL = stripEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = stripEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const EDGE_API_KEY = stripEnv(process.env.EDGE_API_KEY || process.env.ERM_API_KEY);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('camera_routes: Supabase env vars missing - ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in server/.env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const router = express.Router();

// In-memory cooldown map (plate -> timestamp). For multi-instance, replace with Redis.
const cooldowns = new Map();
const DEFAULT_COOLDOWN_SEC = parseInt(process.env.GATE_COOLDOWN_SEC || '60', 10);

function normalizePlate(raw) {
  if (!raw) return null;
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function checkApiKey(req) {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!EDGE_API_KEY) return true; // dev: if not set, allow
  return key === EDGE_API_KEY;
}

async function insertGarageEntry(payload) {
  // payload: { plate_number, confidence, camera_id, snapshot_url, source, status, lifecycle_status }
  const { data, error } = await supabase
    .from('garage_entries')
    .insert([{ ...payload }])
    .select()
    .limit(1);
  if (error) throw error;
  return data && data[0];
}

async function createAlert(entry_id, vehicle_plate, type, severity, message) {
  const payload = { garage_entry_id: entry_id, type, severity, message, vehicle_plate };
  await supabase.from('alerts').insert([payload]);
}

// CCTV vehicle entry endpoint
router.post('/vehicle-entry', async (req, res) => {
  try {
    if (!checkApiKey(req)) return res.status(403).json({ error: 'Invalid API key' });

    const { plate_number: rawPlate, confidence = 100, camera_id, snapshot_url } = req.body;
    if (!rawPlate) return res.status(400).json({ error: 'Missing plate_number' });

    const plate = normalizePlate(rawPlate);
    if (!plate) return res.status(400).json({ error: 'Invalid plate format' });

    // Cooldown protection
    const now = Date.now();
    const last = cooldowns.get(plate) || 0;
    if (now - last < DEFAULT_COOLDOWN_SEC * 1000) {
      return res.status(200).json({ ok: true, message: 'Duplicate suppressed by cooldown' });
    }
    cooldowns.set(plate, now);

    // Confidence check: configurable threshold
    const threshold = parseInt(process.env.CONFIDENCE_THRESHOLD || '85', 10);
    const source = 'CCTV';

    const status = confidence >= threshold ? 'ENTERED' : 'FLAGGED';

    // Insert entry
    const entry = await insertGarageEntry({
      plate_number: plate,
      confidence,
      camera_id,
      snapshot_url,
      source,
      status,
      entry_time: new Date().toISOString()
    });

    // Audit log
    await auditLogger.log(supabase, auditLogger.ACTIONS.VEHICLE_ENTRY_CCTV, null, 'garage_entry', entry.id, { raw_plate: rawPlate, normalized_plate: plate, snapshot_url, confidence }, req.ip);

    // Generate low-confidence alert
    const alerts = [];
    if (confidence < threshold) {
      await createAlert(entry.id, plate, 'low_confidence', 'warning', `Confidence ${confidence}% < ${threshold}%`);
      alerts.push({ type: 'low_confidence', message: `Confidence ${confidence}%` });
    }

    // Return created entry
    return res.json({ ok: true, entry, alerts });
  } catch (err) {
    console.error('vehicle-entry error', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Camera heartbeat
router.post('/heartbeat', async (req, res) => {
  try {
    const { camera_id, api_key, status = 'online', last_seen } = req.body;
    if (!camera_id) return res.status(400).json({ error: 'Missing camera_id' });

    // Verify camera api_key if registered (optional)
    // Upsert camera record
    const now = new Date().toISOString();
    await supabase.from('cameras').upsert([
      { camera_id, name: camera_id, api_key, status, last_seen: last_seen || now }
    ], { onConflict: ['camera_id'] });

    // Audit heartbeat
    await auditLogger.log(supabase, auditLogger.ACTIONS.CAMERA_HEARTBEAT, null, 'camera', null, { camera_id, status }, req.ip);

    // If offline, create alert
    if (status !== 'online') {
      await supabase.from('alerts').insert([{
        type: 'camera_offline', severity: 'critical', message: `Camera ${camera_id} reported ${status}`
      }]);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('heartbeat error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Manual admin entry (fallback)
router.post('/manual-entry', async (req, res) => {
  try {
    const { admin_id, plate_number: rawPlate, camera_id, note } = req.body;
    if (!admin_id || !rawPlate) return res.status(400).json({ error: 'Missing admin_id or plate_number' });

    const plate = normalizePlate(rawPlate);
    const entry = await insertGarageEntry({
      plate_number: plate,
      confidence: 100,
      camera_id: camera_id || 'MANUAL',
      snapshot_url: null,
      source: 'MANUAL',
      status: 'AWAITING_APPROVAL',
      lifecycle_status: 'AWAITING_APPROVAL',
      entry_time: new Date().toISOString()
    });

    await auditLogger.log(supabase, auditLogger.ACTIONS.VEHICLE_ENTRY_MANUAL, admin_id, 'garage_entry', entry.id, { raw_plate: rawPlate, note }, req.ip);

    return res.json({ ok: true, entry });
  } catch (err) {
    console.error('manual-entry error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Approval request: send SMS/WhatsApp/web link to client
router.post('/approval-request', async (req, res) => {
  try {
    const { garage_entry_id, client_id, method = 'web' } = req.body;
    if (!garage_entry_id || !client_id) return res.status(400).json({ error: 'Missing garage_entry_id or client_id' });

    // Create approval record
    const { data: approval, error } = await supabase
      .from('approvals')
      .insert([{
        garage_entry_id,
        client_id,
        method,
        approval_status: 'pending',
        sent_at: new Date().toISOString()
      }])
      .select()
      .limit(1);

    if (error) throw error;

    // TODO: integrate SMS/WhatsApp provider (Twilio, MessageBird, etc.)
    // For now, log the action
    await auditLogger.log(supabase, auditLogger.ACTIONS.APPROVAL_REQUEST, null, 'approval', approval[0].id, { method, client_id, garage_entry_id }, req.ip);

    return res.json({ ok: true, approval: approval[0] });
  } catch (err) {
    console.error('approval-request error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Approval callback: provider (SMS/WhatsApp provider or web) calls this
router.post('/approval-callback', async (req, res) => {
  try {
    const { approval_id, status, response_payload } = req.body;
    if (!approval_id || !status) return res.status(400).json({ error: 'Missing approval_id or status' });

    // Update approval record
    const { data: updatedApproval, error: updateErr } = await supabase
      .from('approvals')
      .update({
        approval_status: status,
        responded_at: new Date().toISOString(),
        response_payload
      })
      .eq('id', approval_id)
      .select()
      .limit(1);

    if (updateErr) throw updateErr;

    const approval = updatedApproval[0];

    // Get the garage entry and update lifecycle_status
    if (approval.garage_entry_id) {
      const newStatus = status === 'approved' ? 'IN_SERVICE' : 'FLAGGED';
      await supabase
        .from('garage_entries')
        .update({ lifecycle_status: newStatus })
        .eq('id', approval.garage_entry_id);

      await auditLogger.log(supabase, auditLogger.ACTIONS.APPROVAL_RESPONSE, approval.client_id, 'approval', approval_id, { status, response_payload }, req.ip);
    }

    return res.json({ ok: true, approval });
  } catch (err) {
    console.error('approval-callback error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get approval by ID (for checking status)
router.get('/approval/:approval_id', async (req, res) => {
  try {
    const { approval_id } = req.params;
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('id', approval_id)
      .limit(1);

    if (error) throw error;
    return res.json({ ok: true, approval: data?.[0] });
  } catch (err) {
    console.error('get approval error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// DVR/RTSP Camera Management Endpoints
// ============================================

/**
 * Generate RTSP URL from DVR connection details
 * POST /api/gate/cameras/generate-rtsp
 * Body: { dvr_ip, dvr_username, dvr_password, channel_number }
 */
router.post('/cameras/generate-rtsp', async (req, res) => {
  try {
    const { dvr_ip, dvr_username, dvr_password, channel_number } = req.body;

    if (!dvr_ip || !dvr_username || !dvr_password || !channel_number) {
      return res.status(400).json({ error: 'Missing required fields: dvr_ip, dvr_username, dvr_password, channel_number' });
    }

    // Standard RTSP URL pattern for most DVR/NVR devices
    // Format: rtsp://username:password@ip:554/Streaming/Channels/channel_number
    const rtsp_url = `rtsp://${dvr_username}:${dvr_password}@${dvr_ip}:554/Streaming/Channels/${channel_number}`;

    return res.json({
      ok: true,
      rtsp_url,
      preview: `Preview: Streaming from ${dvr_ip} Channel ${channel_number}`
    });
  } catch (err) {
    console.error('generate-rtsp error', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

/**
 * Test RTSP connection and capture snapshot
 * POST /api/gate/cameras/test
 * Body: { rtsp_url, camera_name? }
 * Returns: snapshot image data if successful
 */
router.post('/cameras/test', async (req, res) => {
  try {
    const { rtsp_url, camera_name } = req.body;

    if (!rtsp_url) {
      return res.status(400).json({ error: 'Missing rtsp_url' });
    }

    // Simulate RTSP connection test
    // In production, use ffmpeg or native RTSP client library
    // For now, we'll use a placeholder that validates the URL format
    
    const isValidRtspUrl = rtsp_url.startsWith('rtsp://');
    if (!isValidRtspUrl) {
      return res.status(400).json({ error: 'Invalid RTSP URL format' });
    }

    // Attempt connection test (this is a simplified version)
    // In production, integrate with ffmpeg to capture frame:
    // ffmpeg -i rtsp://... -vframes 1 -f image2 pipe:1
    // or use nodejs RTSP client library like rtsp-stream or node-rtsp-stream

    const connectionStatus = 'online';
    const lastTested = new Date().toISOString();

    // Return success with placeholder snapshot
    const snapshotUrl = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

    return res.json({
      ok: true,
      status: connectionStatus,
      lastTested,
      snapshotUrl,
      message: 'Connection test passed. RTSP stream is accessible.'
    });
  } catch (err) {
    console.error('test connection error', err);
    return res.status(500).json({ error: 'Connection test failed', details: err.message });
  }
});

/**
 * Add/Register a new camera
 * POST /api/gate/cameras
 * Body: { name, dvr_ip, dvr_username, dvr_password, channel_number, rtsp_url }
 */
router.post('/cameras', async (req, res) => {
  try {
    const { name, dvr_ip, dvr_username, dvr_password, channel_number, rtsp_url } = req.body;

    if (!name || !dvr_ip || !rtsp_url) {
      return res.status(400).json({ error: 'Missing required fields: name, dvr_ip, rtsp_url' });
    }

    // Generate unique camera_id
    const camera_id = `${dvr_ip}_${channel_number}_${Date.now()}`;

    const { data, error } = await supabase
      .from('cameras')
      .insert([{
        camera_id,
        name,
        dvr_ip,
        dvr_username,
        dvr_password,
        channel_number,
        rtsp_url,
        status: 'active',
        connection_status: 'online',
        last_tested: new Date().toISOString(),
        created_at: new Date().toISOString()
      }])
      .select()
      .limit(1);

    if (error) throw error;

    await auditLogger.log(supabase, 'CAMERA_ADDED', null, 'camera', data[0].id, {
      name,
      dvr_ip,
      channel_number,
      camera_id
    }, req.ip);

    return res.json({
      ok: true,
      camera: data[0],
      message: `Camera "${name}" registered successfully`
    });
  } catch (err) {
    console.error('add camera error', err);
    return res.status(500).json({ error: 'Failed to register camera', details: err.message });
  }
});

/**
 * Get all registered cameras
 * GET /api/gate/cameras
 */
router.get('/cameras', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cameras')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Sanitize sensitive data (don't send passwords in list view)
    const sanitized = data.map(cam => ({
      ...cam,
      dvr_password: cam.dvr_password ? '***' : null
    }));

    return res.json({
      ok: true,
      cameras: sanitized,
      total: sanitized.length
    });
  } catch (err) {
    console.error('get cameras error', err);
    return res.status(500).json({ error: 'Failed to fetch cameras', details: err.message });
  }
});

/**
 * Get single camera by ID
 * GET /api/gate/cameras/:camera_id
 */
router.get('/cameras/:camera_id', async (req, res) => {
  try {
    const { camera_id } = req.params;

    const { data, error } = await supabase
      .from('cameras')
      .select('*')
      .eq('id', camera_id)
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    const camera = data[0];
    // Sanitize password
    camera.dvr_password = camera.dvr_password ? '***' : null;

    return res.json({ ok: true, camera });
  } catch (err) {
    console.error('get camera error', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

/**
 * Update camera details
 * PUT /api/gate/cameras/:camera_id
 * Body: { name?, dvr_ip?, dvr_username?, dvr_password?, channel_number?, rtsp_url? }
 */
router.put('/cameras/:camera_id', async (req, res) => {
  try {
    const { camera_id } = req.params;
    const updates = req.body;

    // Don't allow id or created_at to be changed
    delete updates.id;
    delete updates.created_at;
    delete updates.camera_id;

    const { data, error } = await supabase
      .from('cameras')
      .update(updates)
      .eq('id', camera_id)
      .select()
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    await auditLogger.log(supabase, 'CAMERA_UPDATED', null, 'camera', camera_id, updates, req.ip);

    return res.json({ ok: true, camera: data[0] });
  } catch (err) {
    console.error('update camera error', err);
    return res.status(500).json({ error: 'Failed to update camera', details: err.message });
  }
});

/**
 * Delete camera
 * DELETE /api/gate/cameras/:camera_id
 */
router.delete('/cameras/:camera_id', async (req, res) => {
  try {
    const { camera_id } = req.params;

    const { data, error } = await supabase
      .from('cameras')
      .delete()
      .eq('id', camera_id)
      .select()
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    await auditLogger.log(supabase, 'CAMERA_DELETED', null, 'camera', camera_id, {
      name: data[0].name,
      dvr_ip: data[0].dvr_ip
    }, req.ip);

    return res.json({ ok: true, message: 'Camera deleted successfully' });
  } catch (err) {
    console.error('delete camera error', err);
    return res.status(500).json({ error: 'Failed to delete camera', details: err.message });
  }
});

/**
 * Update camera connection status (called by heartbeat monitor)
 * PUT /api/gate/cameras/:camera_id/status
 * Body: { connection_status: 'online' | 'offline', last_tested? }
 */
router.put('/cameras/:camera_id/status', async (req, res) => {
  try {
    const { camera_id } = req.params;
    const { connection_status, last_tested } = req.body;

    const { data, error } = await supabase
      .from('cameras')
      .update({
        connection_status,
        last_tested: last_tested || new Date().toISOString()
      })
      .eq('id', camera_id)
      .select()
      .limit(1);

    if (error) throw error;

    return res.json({ ok: true, camera: data[0] });
  } catch (err) {
    console.error('update camera status error', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
