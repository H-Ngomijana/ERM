-- System Settings Initialization SQL
-- Execute this to populate garage_settings table with all available settings
-- Safe to run multiple times (uses ON CONFLICT)

-- Delete existing settings (if starting fresh - OPTIONAL, comment out to keep existing)
-- DELETE FROM garage_settings;

-- Initialize Garage Settings
INSERT INTO garage_settings (key, value) VALUES
  ('capacity', '50'),
  ('operating_hours', '{"start":"08:00","end":"20:00"}'),
  ('overdue_threshold_hours', '24'),
  ('critical_threshold_hours', '48')
ON CONFLICT (key) DO NOTHING;

-- Initialize ANPR Settings
INSERT INTO garage_settings (key, value) VALUES
  ('anpr_confidence_threshold', '0.85'),
  ('anpr_min_plate_length', '4')
ON CONFLICT (key) DO NOTHING;

-- Initialize Security Settings
INSERT INTO garage_settings (key, value) VALUES
  ('session_timeout_minutes', '30'),
  ('max_failed_login_attempts', '5'),
  ('failed_login_lockout_minutes', '15'),
  ('require_2fa', 'false')
ON CONFLICT (key) DO NOTHING;

-- Initialize Notification Settings
INSERT INTO garage_settings (key, value) VALUES
  ('enable_email_notifications', 'true'),
  ('alert_notification_email', ''),
  ('enable_webhook_notifications', 'false'),
  ('webhook_url', ''),
  ('webhook_secret', '')
ON CONFLICT (key) DO NOTHING;

-- Initialize Backup & Audit Settings
INSERT INTO garage_settings (key, value) VALUES
  ('enable_audit_logging', 'true'),
  ('retention_days', '90'),
  ('auto_backup_enabled', 'true'),
  ('backup_frequency', 'daily')
ON CONFLICT (key) DO NOTHING;

-- Initialize Camera Settings
INSERT INTO garage_settings (key, value) VALUES
  ('motion_detection_sensitivity', '0.7'),
  ('camera_recording_quality', '720p')
ON CONFLICT (key) DO NOTHING;

-- Verify settings were created
SELECT 
  key,
  value,
  created_at,
  updated_at
FROM garage_settings
ORDER BY key
LIMIT 20;

-- Count total settings
SELECT COUNT(*) as total_settings FROM garage_settings;
