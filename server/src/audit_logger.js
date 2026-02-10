/*
Audit Logging Helper
Centralized audit logging for all manual actions and system events.

Usage:
  import { log, ACTIONS } from './audit_logger.js';
  log(supabase, ACTIONS.VEHICLE_ENTRY_CCTV, admin_id, 'entity_type', entity_id, { details });
*/

export async function log(supabase, action, actor_id, entity_type, entity_id, details = {}, ip_address = null) {
  if (!supabase) {
    console.warn('[AuditLogger] Supabase client not provided');
    return null;
  }

  try {
    const payload = {
      action,
      actor_id,
      entity_type,
      entity_id,
      details,
      ip_address,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert([payload])
      .select()
      .limit(1);

    if (error) {
      console.error('[AuditLogger] Insert error:', error);
      return null;
    }

    console.log(`[AuditLogger] Logged: ${action} by ${actor_id || 'system'}`);
    return data?.[0];
  } catch (err) {
    console.error('[AuditLogger] Exception:', err);
    return null;
  }
}

// Predefined actions for consistency
export const ACTIONS = {
  VEHICLE_ENTRY_CCTV: 'VEHICLE_ENTRY_CCTV',
  VEHICLE_ENTRY_MANUAL: 'MANUAL_ENTRY',
  VEHICLE_EXIT: 'VEHICLE_EXIT',
  APPROVAL_REQUEST: 'APPROVAL_REQUEST_SENT',
  APPROVAL_RESPONSE: 'APPROVAL_RESPONDED',
  PLATE_CORRECTION: 'PLATE_CORRECTION',
  STATUS_CHANGE: 'LIFECYCLE_STATUS_CHANGED',
  CAMERA_HEARTBEAT: 'CAMERA_HEARTBEAT',
  CAMERA_OFFLINE: 'CAMERA_OFFLINE',
  CAMERA_ONLINE: 'CAMERA_ONLINE',
  MANUAL_OVERRIDE: 'MANUAL_OVERRIDE'
};
