import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Settings as SettingsIcon, 
  Save, 
  Loader2, 
  Database,
  Bell,
  Camera,
  Lock,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { applyMigrations } from '@/integrations/supabase/migrations';

interface GarageSettings {
  capacity: number;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  overdueThreshold: number;
  criticalThreshold: number;
}

interface SystemSettings {
  anpr_confidence_threshold: number;
  anpr_min_plate_length: number;
  session_timeout_minutes: number;
  max_failed_login_attempts: number;
  failed_login_lockout_minutes: number;
  enable_email_notifications: boolean;
  alert_notification_email: string;
  enable_webhook_notifications: boolean;
  webhook_url: string;
  webhook_secret: string;
  enable_audit_logging: boolean;
  retention_days: number;
  require_2fa: boolean;
  auto_backup_enabled: boolean;
  backup_frequency: string;
  motion_detection_sensitivity: number;
  camera_recording_quality: string;
}

const Settings = () => {
  const [activeTab, setActiveTab] = useState<'garage' | 'anpr' | 'security' | 'notifications' | 'backup' | 'camera'>('garage');
  const [garageSettings, setGarageSettings] = useState<GarageSettings>({
    capacity: 50,
    operatingHoursStart: '08:00',
    operatingHoursEnd: '20:00',
    overdueThreshold: 24,
    criticalThreshold: 48,
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    anpr_confidence_threshold: 0.85,
    anpr_min_plate_length: 4,
    session_timeout_minutes: 30,
    max_failed_login_attempts: 5,
    failed_login_lockout_minutes: 15,
    enable_email_notifications: true,
    alert_notification_email: '',
    enable_webhook_notifications: false,
    webhook_url: '',
    webhook_secret: '',
    enable_audit_logging: true,
    retention_days: 90,
    require_2fa: false,
    auto_backup_enabled: true,
    backup_frequency: 'daily',
    motion_detection_sensitivity: 0.7,
    camera_recording_quality: '720p',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('garage_settings').select('*');

      if (error) {
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          console.warn('garage_settings table not found, attempting to create...');
          setTableError('garage_settings table needs to be created');
          await applyMigrations();
          setTimeout(async () => {
            const { data: retryData, error: retryError } = await supabase.from('garage_settings').select('*');
            if (retryError) {
              console.error('Failed to create garage_settings:', retryError.message);
              setTableError('Failed to create garage_settings table. Click "Apply Migrations" above.');
              setIsLoading(false);
              return;
            }
            if (retryData) {
              processSettings(retryData);
              setTableError(null);
            }
          }, 1000);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: error.message });
          setIsLoading(false);
        }
      } else if (data) {
        processSettings(data);
        setTableError(null);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setIsLoading(false);
    }
  };

  const processSettings = (data: any[]) => {
    const settingsMap: Record<string, any> = {};
    data.forEach((s) => {
      try {
        settingsMap[s.key] = typeof s.value === 'string' ? (
          isNaN(parseFloat(s.value)) ? s.value : parseFloat(s.value)
        ) : s.value;
      } catch {
        settingsMap[s.key] = s.value;
      }
    });

    const operatingHours = settingsMap.operating_hours
      ? (typeof settingsMap.operating_hours === 'string' 
          ? JSON.parse(settingsMap.operating_hours) 
          : settingsMap.operating_hours)
      : { start: '08:00', end: '20:00' };

    setGarageSettings({
      capacity: parseInt(settingsMap.capacity) || 50,
      operatingHoursStart: operatingHours.start || '08:00',
      operatingHoursEnd: operatingHours.end || '20:00',
      overdueThreshold: parseInt(settingsMap.overdue_threshold_hours) || 24,
      criticalThreshold: parseInt(settingsMap.critical_threshold_hours) || 48,
    });

    setSystemSettings(prev => ({
      ...prev,
      anpr_confidence_threshold: parseFloat(settingsMap.anpr_confidence_threshold) || 0.85,
      anpr_min_plate_length: parseInt(settingsMap.anpr_min_plate_length) || 4,
      session_timeout_minutes: parseInt(settingsMap.session_timeout_minutes) || 30,
      max_failed_login_attempts: parseInt(settingsMap.max_failed_login_attempts) || 5,
      failed_login_lockout_minutes: parseInt(settingsMap.failed_login_lockout_minutes) || 15,
      enable_email_notifications: settingsMap.enable_email_notifications !== false,
      alert_notification_email: settingsMap.alert_notification_email || '',
      enable_webhook_notifications: settingsMap.enable_webhook_notifications || false,
      webhook_url: settingsMap.webhook_url || '',
      enable_audit_logging: settingsMap.enable_audit_logging !== false,
      retention_days: parseInt(settingsMap.retention_days) || 90,
      require_2fa: settingsMap.require_2fa || false,
      auto_backup_enabled: settingsMap.auto_backup_enabled !== false,
      backup_frequency: settingsMap.backup_frequency || 'daily',
      motion_detection_sensitivity: parseFloat(settingsMap.motion_detection_sensitivity) || 0.7,
      camera_recording_quality: settingsMap.camera_recording_quality || '720p',
    }));

    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveGarageSettings = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    const updates = [
      { key: 'capacity', value: garageSettings.capacity.toString() },
      {
        key: 'operating_hours',
        value: JSON.stringify({ start: garageSettings.operatingHoursStart, end: garageSettings.operatingHoursEnd }),
      },
      { key: 'overdue_threshold_hours', value: garageSettings.overdueThreshold.toString() },
      { key: 'critical_threshold_hours', value: garageSettings.criticalThreshold.toString() },
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from('garage_settings')
        .update({ value: update.value })
        .eq('key', update.key);

      if (error) {
        setSaveStatus({ type: 'error', message: `Failed to save ${update.key}` });
        setIsSaving(false);
        return;
      }
    }

    setSaveStatus({ type: 'success', message: 'Garage settings saved successfully' });
    setIsSaving(false);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSaveSystemSettings = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    const updates = [
      { key: 'anpr_confidence_threshold', value: systemSettings.anpr_confidence_threshold.toString() },
      { key: 'anpr_min_plate_length', value: systemSettings.anpr_min_plate_length.toString() },
      { key: 'session_timeout_minutes', value: systemSettings.session_timeout_minutes.toString() },
      { key: 'max_failed_login_attempts', value: systemSettings.max_failed_login_attempts.toString() },
      { key: 'failed_login_lockout_minutes', value: systemSettings.failed_login_lockout_minutes.toString() },
      { key: 'enable_email_notifications', value: systemSettings.enable_email_notifications.toString() },
      { key: 'alert_notification_email', value: systemSettings.alert_notification_email },
      { key: 'enable_webhook_notifications', value: systemSettings.enable_webhook_notifications.toString() },
      { key: 'webhook_url', value: systemSettings.webhook_url },
      { key: 'webhook_secret', value: systemSettings.webhook_secret },
      { key: 'enable_audit_logging', value: systemSettings.enable_audit_logging.toString() },
      { key: 'retention_days', value: systemSettings.retention_days.toString() },
      { key: 'require_2fa', value: systemSettings.require_2fa.toString() },
      { key: 'auto_backup_enabled', value: systemSettings.auto_backup_enabled.toString() },
      { key: 'backup_frequency', value: systemSettings.backup_frequency },
      { key: 'motion_detection_sensitivity', value: systemSettings.motion_detection_sensitivity.toString() },
      { key: 'camera_recording_quality', value: systemSettings.camera_recording_quality },
    ];

    let errorCount = 0;
    for (const update of updates) {
      const { error } = await supabase
        .from('garage_settings')
        .update({ value: update.value })
        .eq('key', update.key);

      if (error) {
        errorCount++;
      }
    }

    if (errorCount > 0) {
      setSaveStatus({ type: 'error', message: `Failed to save ${errorCount} settings` });
    } else {
      setSaveStatus({ type: 'success', message: 'System settings saved successfully' });
    }

    setIsSaving(false);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleApplyMigrations = async () => {
    setIsMigrating(true);
    await applyMigrations();
    setIsMigrating(false);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(true);
    setTableError(null);
    await fetchSettings();
    toast({
      title: 'Migration Check Complete',
      description: 'Database schema has been checked and applied.',
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            System Settings
          </h1>
          <p className="text-muted-foreground">Manage system-wide configuration and policies</p>
        </div>

        {/* Status Messages */}
        {saveStatus && (
          <div className={`p-4 rounded-lg border flex items-center gap-2 ${
            saveStatus.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {saveStatus.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{saveStatus.message}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b overflow-x-auto pb-2">
          {[
            { id: 'garage', label: 'Garage', icon: '🏢' },
            { id: 'anpr', label: 'ANPR', icon: '📷' },
            { id: 'security', label: 'Security', icon: '🔒' },
            { id: 'notifications', label: 'Notifications', icon: '🔔' },
            { id: 'backup', label: 'Backup & Logs', icon: '💾' },
            { id: 'camera', label: 'Camera', icon: '📹' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Garage Settings Tab */}
        {activeTab === 'garage' && (
          <Card>
            <CardHeader>
              <CardTitle>Garage Configuration</CardTitle>
              <CardDescription>Configure garage capacity and operating hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="capacity">Maximum Capacity (vehicles)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  max="1000"
                  value={garageSettings.capacity}
                  onChange={(e) =>
                    setGarageSettings({ ...garageSettings, capacity: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">Maximum number of vehicles the garage can hold</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Operating Hours Start</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={garageSettings.operatingHoursStart}
                    onChange={(e) =>
                      setGarageSettings({ ...garageSettings, operatingHoursStart: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Operating Hours End</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={garageSettings.operatingHoursEnd}
                    onChange={(e) => setGarageSettings({ ...garageSettings, operatingHoursEnd: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="overdue">Overdue Threshold (hours)</Label>
                  <Input
                    id="overdue"
                    type="number"
                    min="1"
                    max="168"
                    value={garageSettings.overdueThreshold}
                    onChange={(e) =>
                      setGarageSettings({ ...garageSettings, overdueThreshold: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Yellow alert after this time</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="critical">Critical Threshold (hours)</Label>
                  <Input
                    id="critical"
                    type="number"
                    min="1"
                    max="336"
                    value={garageSettings.criticalThreshold}
                    onChange={(e) =>
                      setGarageSettings({ ...garageSettings, criticalThreshold: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Red alert after this time</p>
                </div>
              </div>

              <Button onClick={handleSaveGarageSettings} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Garage Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ANPR Settings Tab */}
        {activeTab === 'anpr' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                ANPR Settings
              </CardTitle>
              <CardDescription>Configure Automatic Number Plate Recognition parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="anpr-confidence">Confidence Threshold (0.0 - 1.0)</Label>
                <Input
                  id="anpr-confidence"
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={systemSettings.anpr_confidence_threshold}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, anpr_confidence_threshold: parseFloat(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Only recognize plates with confidence above this threshold. Higher = more accurate but may miss plates
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="anpr-min-length">Minimum Plate Length (characters)</Label>
                <Input
                  id="anpr-min-length"
                  type="number"
                  min="1"
                  max="20"
                  value={systemSettings.anpr_min_plate_length}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, anpr_min_plate_length: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">Minimum characters for a valid license plate</p>
              </div>

              <Button onClick={() => handleSaveSystemSettings()} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save ANPR Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Security Settings Tab */}
        {activeTab === 'security' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Configure authentication and access control policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  min="5"
                  max="480"
                  value={systemSettings.session_timeout_minutes}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, session_timeout_minutes: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">Automatically log out users after this period of inactivity</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-failed">Max Failed Login Attempts</Label>
                  <Input
                    id="max-failed"
                    type="number"
                    min="1"
                    max="20"
                    value={systemSettings.max_failed_login_attempts}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, max_failed_login_attempts: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockout-time">Lockout Duration (minutes)</Label>
                  <Input
                    id="lockout-time"
                    type="number"
                    min="5"
                    max="120"
                    value={systemSettings.failed_login_lockout_minutes}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, failed_login_lockout_minutes: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.require_2fa}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, require_2fa: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="font-medium">Require Two-Factor Authentication</span>
                </label>
                <p className="text-xs text-muted-foreground ml-6">All users must set up 2FA for their accounts</p>
              </div>

              <Button onClick={() => handleSaveSystemSettings()} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Security Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Notifications Settings Tab */}
        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure how the system sends alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.enable_email_notifications}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, enable_email_notifications: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="font-medium">Enable Email Notifications</span>
                </label>
              </div>

              {systemSettings.enable_email_notifications && (
                <div className="space-y-2">
                  <Label htmlFor="alert-email">Alert Notification Email</Label>
                  <Input
                    id="alert-email"
                    type="email"
                    value={systemSettings.alert_notification_email}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, alert_notification_email: e.target.value })
                    }
                    placeholder="alerts@garage.com"
                  />
                  <p className="text-xs text-muted-foreground">Email address to receive system alerts</p>
                </div>
              )}

              <div className="border-t pt-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.enable_webhook_notifications}
                      onChange={(e) =>
                        setSystemSettings({ ...systemSettings, enable_webhook_notifications: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="font-medium">Enable Webhook Notifications</span>
                  </label>
                </div>

                {systemSettings.enable_webhook_notifications && (
                  <>
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="webhook-url">Webhook URL</Label>
                      <Input
                        id="webhook-url"
                        type="url"
                        value={systemSettings.webhook_url}
                        onChange={(e) =>
                          setSystemSettings({ ...systemSettings, webhook_url: e.target.value })
                        }
                        placeholder="https://example.com/webhook"
                      />
                    </div>

                    <div className="space-y-2 mt-4">
                      <Label htmlFor="webhook-secret">Webhook Secret</Label>
                      <div className="flex gap-2">
                        <Input
                          id="webhook-secret"
                          type={showWebhookSecret ? "text" : "password"}
                          value={systemSettings.webhook_secret}
                          onChange={(e) =>
                            setSystemSettings({ ...systemSettings, webhook_secret: e.target.value })
                          }
                          placeholder="Your webhook secret"
                        />
                        <Button
                          onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                          variant="outline"
                          className="px-3"
                        >
                          {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Button onClick={() => handleSaveSystemSettings()} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Notification Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Backup & Logs Settings Tab */}
        {activeTab === 'backup' && (
          <Card>
            <CardHeader>
              <CardTitle>Backup & Audit Settings</CardTitle>
              <CardDescription>Configure data retention and backup policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.enable_audit_logging}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, enable_audit_logging: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="font-medium">Enable Audit Logging</span>
                </label>
                <p className="text-xs text-muted-foreground ml-6">Track all user actions and system changes</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retention">Data Retention Period (days)</Label>
                <Input
                  id="retention"
                  type="number"
                  min="7"
                  max="3650"
                  value={systemSettings.retention_days}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, retention_days: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">Keep audit logs and old records for this many days</p>
              </div>

              <div className="border-t pt-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.auto_backup_enabled}
                      onChange={(e) =>
                        setSystemSettings({ ...systemSettings, auto_backup_enabled: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="font-medium">Enable Automatic Backups</span>
                  </label>
                </div>

                {systemSettings.auto_backup_enabled && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="backup-freq">Backup Frequency</Label>
                    <select
                      id="backup-freq"
                      value={systemSettings.backup_frequency}
                      onChange={(e) =>
                        setSystemSettings({ ...systemSettings, backup_frequency: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>

              <Button onClick={() => handleSaveSystemSettings()} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Backup Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Camera Settings Tab */}
        {activeTab === 'camera' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera & Recording Settings
              </CardTitle>
              <CardDescription>Configure camera recording and detection parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="motion-sensitivity">Motion Detection Sensitivity (0.0 - 1.0)</Label>
                <Input
                  id="motion-sensitivity"
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={systemSettings.motion_detection_sensitivity}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, motion_detection_sensitivity: parseFloat(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Higher values = more sensitive to motion. Range: 0 (least) to 1 (most)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recording-quality">Recording Quality</Label>
                <select
                  id="recording-quality"
                  value={systemSettings.camera_recording_quality}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, camera_recording_quality: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="360p">360p (Low - More storage)</option>
                  <option value="480p">480p (Standard)</option>
                  <option value="720p">720p (HD - Recommended)</option>
                  <option value="1080p">1080p (Full HD - Best Quality)</option>
                </select>
                <p className="text-xs text-muted-foreground">Higher quality requires more storage space</p>
              </div>

              <Button onClick={() => handleSaveSystemSettings()} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Camera Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Database Migrations Card */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Database className="h-5 w-5" />
              Database Maintenance
            </CardTitle>
            <CardDescription className="text-amber-800">
              Apply pending database schema updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tableError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm flex gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{tableError}</span>
              </div>
            )}
            <p className="text-sm text-amber-900">
              Ensures all required tables and columns are present in your database.
            </p>
            <Button onClick={handleApplyMigrations} disabled={isMigrating} variant="outline" className="w-full">
              {isMigrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Apply Migrations
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
