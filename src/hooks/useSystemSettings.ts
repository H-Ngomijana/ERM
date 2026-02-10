/**
 * useSystemSettings Hook
 * Manages system-wide settings throughout the application
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemSettingsConfig {
  // ANPR Settings
  anpr_confidence_threshold: number;
  anpr_min_plate_length: number;
  
  // Security Settings
  session_timeout_minutes: number;
  max_failed_login_attempts: number;
  failed_login_lockout_minutes: number;
  require_2fa: boolean;
  
  // Notification Settings
  enable_email_notifications: boolean;
  alert_notification_email: string;
  enable_webhook_notifications: boolean;
  webhook_url: string;
  webhook_secret: string;
  
  // Backup & Audit Settings
  enable_audit_logging: boolean;
  retention_days: number;
  auto_backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  
  // Camera Settings
  motion_detection_sensitivity: number;
  camera_recording_quality: string;
  
  // Garage Settings
  capacity: number;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  overdueThreshold: number;
  criticalThreshold: number;
}

const DEFAULT_SETTINGS: SystemSettingsConfig = {
  anpr_confidence_threshold: 0.85,
  anpr_min_plate_length: 4,
  session_timeout_minutes: 30,
  max_failed_login_attempts: 5,
  failed_login_lockout_minutes: 15,
  require_2fa: false,
  enable_email_notifications: true,
  alert_notification_email: '',
  enable_webhook_notifications: false,
  webhook_url: '',
  webhook_secret: '',
  enable_audit_logging: true,
  retention_days: 90,
  auto_backup_enabled: true,
  backup_frequency: 'daily',
  motion_detection_sensitivity: 0.7,
  camera_recording_quality: '720p',
  capacity: 50,
  operatingHoursStart: '08:00',
  operatingHoursEnd: '20:00',
  overdueThreshold: 24,
  criticalThreshold: 48,
};

/**
 * Hook to manage system settings
 * @returns Object with settings and methods to retrieve/update them
 */
export const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettingsConfig>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all settings from database
   */
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('garage_settings')
        .select('*');

      if (fetchError) {
        console.warn('Error fetching settings:', fetchError.message);
        setSettings(DEFAULT_SETTINGS);
        return;
      }

      if (data && data.length > 0) {
        const settingsMap: Record<string, any> = {};
        data.forEach((item) => {
          try {
            const value = typeof item.value === 'string' 
              ? isNaN(parseFloat(item.value)) 
                ? item.value 
                : parseFloat(item.value)
              : item.value;
            settingsMap[item.key] = value;
          } catch {
            settingsMap[item.key] = item.value;
          }
        });

        // Handle operating hours special case
        const operatingHours = settingsMap.operating_hours
          ? (typeof settingsMap.operating_hours === 'string' 
              ? JSON.parse(settingsMap.operating_hours) 
              : settingsMap.operating_hours)
          : { start: '08:00', end: '20:00' };

        setSettings({
          ...DEFAULT_SETTINGS,
          // ANPR
          anpr_confidence_threshold: parseFloat(settingsMap.anpr_confidence_threshold) || DEFAULT_SETTINGS.anpr_confidence_threshold,
          anpr_min_plate_length: parseInt(settingsMap.anpr_min_plate_length) || DEFAULT_SETTINGS.anpr_min_plate_length,
          // Security
          session_timeout_minutes: parseInt(settingsMap.session_timeout_minutes) || DEFAULT_SETTINGS.session_timeout_minutes,
          max_failed_login_attempts: parseInt(settingsMap.max_failed_login_attempts) || DEFAULT_SETTINGS.max_failed_login_attempts,
          failed_login_lockout_minutes: parseInt(settingsMap.failed_login_lockout_minutes) || DEFAULT_SETTINGS.failed_login_lockout_minutes,
          require_2fa: settingsMap.require_2fa === 'true' || settingsMap.require_2fa === true,
          // Notifications
          enable_email_notifications: settingsMap.enable_email_notifications !== 'false' && settingsMap.enable_email_notifications !== false,
          alert_notification_email: settingsMap.alert_notification_email || '',
          enable_webhook_notifications: settingsMap.enable_webhook_notifications === 'true' || settingsMap.enable_webhook_notifications === true,
          webhook_url: settingsMap.webhook_url || '',
          webhook_secret: settingsMap.webhook_secret || '',
          // Backup & Audit
          enable_audit_logging: settingsMap.enable_audit_logging !== 'false' && settingsMap.enable_audit_logging !== false,
          retention_days: parseInt(settingsMap.retention_days) || DEFAULT_SETTINGS.retention_days,
          auto_backup_enabled: settingsMap.auto_backup_enabled !== 'false' && settingsMap.auto_backup_enabled !== false,
          backup_frequency: settingsMap.backup_frequency || 'daily',
          // Camera
          motion_detection_sensitivity: parseFloat(settingsMap.motion_detection_sensitivity) || DEFAULT_SETTINGS.motion_detection_sensitivity,
          camera_recording_quality: settingsMap.camera_recording_quality || '720p',
          // Garage
          capacity: parseInt(settingsMap.capacity) || DEFAULT_SETTINGS.capacity,
          operatingHoursStart: operatingHours.start || '08:00',
          operatingHoursEnd: operatingHours.end || '20:00',
          overdueThreshold: parseInt(settingsMap.overdue_threshold_hours) || DEFAULT_SETTINGS.overdueThreshold,
          criticalThreshold: parseInt(settingsMap.critical_threshold_hours) || DEFAULT_SETTINGS.criticalThreshold,
        });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to fetch settings');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get a specific setting value
   */
  const getSetting = useCallback((key: keyof SystemSettingsConfig) => {
    return settings[key];
  }, [settings]);

  /**
   * Check if operating hours are within range
   */
  const isOperatingHours = useCallback((date: Date = new Date()) => {
    const time = date.getHours().toString().padStart(2, '0') + ':' + 
                 date.getMinutes().toString().padStart(2, '0');
    return time >= settings.operatingHoursStart && time <= settings.operatingHoursEnd;
  }, [settings.operatingHoursStart, settings.operatingHoursEnd]);

  /**
   * Check if ANPR confidence is sufficient
   */
  const isAnprConfidenceSufficient = useCallback((confidence: number) => {
    return confidence >= settings.anpr_confidence_threshold;
  }, [settings.anpr_confidence_threshold]);

  /**
   * Format operating hours for display
   */
  const getOperatingHoursDisplay = useCallback(() => {
    return `${settings.operatingHoursStart} - ${settings.operatingHoursEnd}`;
  }, [settings.operatingHoursStart, settings.operatingHoursEnd]);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    fetchSettings,
    getSetting,
    isOperatingHours,
    isAnprConfidenceSufficient,
    getOperatingHoursDisplay,
  };
};

export default useSystemSettings;
