# System Settings - Admin Control Panel

## Overview

The enhanced Settings section provides administrators with complete control over system-wide configuration, security policies, and operational parameters. All non-admin users are blocked from accessing this section.

## Access Control

✅ **Admin Only** - Only users with `admin` role can:
- View all settings
- Modify system configurations
- Apply database migrations

🚫 **Non-Admins** - See access denied message with explanation

## Settings Sections

### 1. 🏢 Garage Configuration

Core operational settings for the garage facility.

| Setting | Type | Range | Description |
|---------|------|-------|-------------|
| Maximum Capacity | Number | 1-1000 | Total vehicles the garage can hold |
| Operating Hours Start | Time | HH:MM | Garage opens at this time |
| Operating Hours End | Time | HH:MM | Garage closes at this time |
| Overdue Threshold | Hours | 1-168 | Yellow alert trigger (hours parked) |
| Critical Threshold | Hours | 1-336 | Red alert trigger (hours parked) |

**Usage:**
```typescript
import { useSystemSettings } from '@/hooks/useSystemSettings';

function Dashboard() {
  const { settings, isOperatingHours } = useSystemSettings();
  
  // Check if currently operating
  const isOpen = isOperatingHours();
  
  // Use thresholds for alerts
  const capacity = settings.capacity;
  const overdueHours = settings.overdueThreshold;
}
```

### 2. 📷 ANPR Settings

Automatic Number Plate Recognition configuration.

| Setting | Type | Range | Description |
|---------|------|-------|-------------|
| Confidence Threshold | Decimal | 0.0-1.0 | Minimum confidence to record plate |
| Minimum Plate Length | Number | 1-20 | Minimum characters for valid plate |

**Impact:**
- **Higher confidence** = More accurate, may miss some plates
- **Lower confidence** = Catches more plates, may have false positives
- **Longer min length** = Fewer false positives, may miss short plates

**Recommendation:** Start with confidence `0.85` and adjust based on accuracy needs

**Usage:**
```typescript
const { isAnprConfidenceSufficient } = useSystemSettings();

// Validate ANPR result
if (isAnprConfidenceSufficient(detectedPlateConfidence)) {
  // Record the plate
  recordVehicle(plate);
} else {
  // Likely false positive
  logRejection(plate);
}
```

### 3. 🔒 Security Settings

Authentication and access control policies applied system-wide.

| Setting | Type | Impact | Description |
|---------|------|--------|-------------|
| Session Timeout | Minutes | 5-480 | Auto-logout after inactivity |
| Max Failed Logins | Count | 1-20 | Failed attempts before lockout |
| Lockout Duration | Minutes | 5-120 | How long to lock out user |
| Require 2FA | Boolean | - | Force two-factor authentication |

**Security Best Practices:**
- ✅ Set session timeout to 30 min (default)
- ✅ Max failed attempts to 5 (default)
- ✅ Enable 2FA for admin accounts
- ✅ Review lockout duration monthly

**Implementation:** Implemented in AuthContext and login flow

### 4. 🔔 Notifications Settings

Configure how the system sends alerts and notifications.

#### Email Notifications
- **Enable Email Alerts** - Toggle email notifications on/off
- **Alert Email Address** - Where critical alerts are sent
- **Examples:** Overdue vehicles, capacity warnings, system errors

#### Webhook Notifications
- **Enable Webhooks** - Integration with external systems
- **Webhook URL** - HTTPS endpoint to receive notifications
- **Webhook Secret** - For validating webhook authenticity

**Example Webhook Payload:**
```json
{
  "event": "vehicle_overdue",
  "timestamp": "2026-02-06T10:30:00Z",
  "data": {
    "vehicle_id": "abc123",
    "plate": "ABC123",
    "hours_parked": 28,
    "threshold": 24
  }
}
```

**Usage:**
```typescript
// When sending notifications
if (systemSettings.enable_email_notifications) {
  sendEmailAlert(
    systemSettings.alert_notification_email,
    "Vehicle Overdue",
    vehicleDetails
  );
}

if (systemSettings.enable_webhook_notifications) {
  fetch(systemSettings.webhook_url, {
    method: 'POST',
    headers: { 'X-Webhook-Secret': systemSettings.webhook_secret },
    body: JSON.stringify(event)
  });
}
```

### 5. 💾 Backup & Audit Settings

Data retention and logging configuration.

| Setting | Type | Impact | Description |
|---------|------|--------|-------------|
| Enable Audit Logging | Boolean | Storage | Track all user actions |
| Data Retention | Days | Storage | Keep records for N days |
| Auto Backups | Boolean | Uptime | Automatic daily/weekly/monthly |
| Backup Frequency | Enum | Uptime | How often to backup |

**Retention Policy:**
- **7 days** - Minimal (testing only)
- **30 days** - Standard (typical garage usage)
- **90 days** - Comprehensive (recommended)
- **365 days** - Full history (compliance/audit)

**Audit Logging Tracks:**
- ✅ User logins/logouts
- ✅ Settings changes
- ✅ Vehicle entries/exits
- ✅ Manual entry creation
- ✅ Permission changes

**Access Audit Logs:**
Navigate to `Dashboard → Audit Logs` to view all recorded actions.

### 6. 📹 Camera & Recording Settings

Video recording and motion detection parameters.

| Setting | Type | Range | Description |
|---------|------|-------|-------------|
| Motion Sensitivity | Decimal | 0.0-1.0 | Responsiveness to motion |
| Recording Quality | Enum | - | Video resolution & bitrate |

**Motion Sensitivity:**
- **0.0-0.3** = Very sensitive (detects every movement)
- **0.5-0.7** = Balanced (recommended)
- **0.8-1.0** = Low sensitivity (only major movements)

**Storage Impact by Quality:**
| Quality | Per Hour | Per Day | Per Month |
|---------|----------|---------|-----------|
| 360p | ~200MB | ~4.8GB | ~144GB |
| 480p | ~350MB | ~8.4GB | ~252GB |
| 720p | ~600MB | ~14.4GB | ~432GB |
| 1080p | ~1GB | ~24GB | ~720GB |

## Settings Workflow

### 1. Access Settings
```
1. Login as admin user
2. Navigate to Settings (gear icon in sidebar)
3. Should see full settings interface
4. Non-admins see "Access Denied" message
```

### 2. Change a Setting
```
1. Click on desired tab (Garage, ANPR, Security, etc.)
2. Modify values
3. See live validation feedback
4. Click "Save [Section] Settings"
5. See confirmation: "✓ Settings saved successfully"
```

### 3. Apply to Entire System
```
System settings are applied automatically:
- ANPR confidence → Used for plate recognition
- Session timeout → Applied on next login
- Operating hours → Affects availability
- Notifications → Active immediately
- Security policies → Enforced immediately
```

## Integration Points

### Using Settings in Components

#### Example 1: Check Operating Hours
```typescript
import { useSystemSettings } from '@/hooks/useSystemSettings';

function GateControl() {
  const { isOperatingHours } = useSystemSettings();
  
  if (!isOperatingHours()) {
    return <div>Garage is closed</div>;
  }
  
  return <div>Garage is open</div>;
}
```

#### Example 2: Validate ANPR Results
```typescript
function AnprValidator() {
  const { isAnprConfidenceSufficient } = useSystemSettings();
  
  async function processPlate(plate, confidence) {
    if (isAnprConfidenceSufficient(confidence)) {
      await recordEntry(plate);
    } else {
      await logRejection(plate, confidence);
    }
  }
}
```

#### Example 3: Send Notifications
```typescript
function AlertManager() {
  const { settings } = useSystemSettings();
  
  async function sendVehicleAlert(vehicleId) {
    // Send email
    if (settings.enable_email_notifications) {
      await sendEmail(settings.alert_notification_email, alert);
    }
    
    // Send webhook
    if (settings.enable_webhook_notifications) {
      await fetch(settings.webhook_url, {
        method: 'POST',
        body: JSON.stringify(alert)
      });
    }
  }
}
```

### Settings Storage

All settings are stored in the `garage_settings` database table:

```sql
-- Structure
id          | UUID (primary key)
key         | TEXT (setting name)
value       | TEXT (setting value)
created_at  | TIMESTAMP
updated_at  | TIMESTAMP

-- Examples
| key | value |
|----|-------|
| capacity | 50 |
| operating_hours | {"start":"08:00","end":"20:00"} |
| anpr_confidence_threshold | 0.85 |
| session_timeout_minutes | 30 |
| enable_2fa | false |
```

## Administrative Workflows

### Workflow: Increase Capacity
```
1. Go to Settings → Garage tab
2. Change "Maximum Capacity" from 50 to 75
3. Click "Save Garage Settings"
4. "✓ Settings saved successfully"

Impact:
- Dashboard immediately shows new capacity
- Capacity alerts recalculated
- Existing entries unaffected
```

### Workflow: Tighten ANPR Recognition
```
1. Go to Settings → ANPR tab
2. Increase "Confidence Threshold" from 0.85 to 0.92
3. Increase "Minimum Plate Length" from 4 to 5
4. Click "Save ANPR Settings"

Impact:
- Only high-confidence plates recorded
- False positives reduced
- Some valid plates may be missed
```

### Workflow: Enable Email Alerts
```
1. Go to Settings → Notifications tab
2. Check "Enable Email Notifications"
3. Enter "alerts@mygarage.com"
4. Click "Save Notification Settings"

Result:
- Overdue vehicle alerts sent to email
- System errors reported
- Gateway issues notified
```

### Workflow: Enforce 2FA Security
```
1. Go to Settings → Security tab
2. Check "Require Two-Factor Authentication"
3. Click "Save Security Settings"

Impact:
- All users must enable 2FA at next login
- SMS/authenticator app required
- Additional security layer applied
```

## Database Integration

### Adding New Settings

To add a new system-wide setting:

```typescript
// 1. Add to SystemSettingsConfig interface
export interface SystemSettingsConfig {
  // ... existing settings ...
  my_new_setting: string;  // Add new field
}

// 2. Add default value
const DEFAULT_SETTINGS: SystemSettingsConfig = {
  // ... existing defaults ...
  my_new_setting: 'default_value',  // Add default
};

// 3. Add UI input in Settings.tsx
<div className="space-y-2">
  <Label htmlFor="my-setting">My New Setting</Label>
  <Input
    id="my-setting"
    value={systemSettings.my_new_setting}
    onChange={(e) =>
      setSystemSettings({ ...systemSettings, my_new_setting: e.target.value })
    }
  />
</div>

// 4. Use hook to access it
const { settings } = useSystemSettings();
const value = settings.my_new_setting;
```

## Troubleshooting

### Issue: Settings not saving
**Solution:**
1. Check admin role: `useAuth()` should return `admin`
2. Check database connection: Click "Apply Migrations"
3. Check browser console for errors
4. Refresh page and try again

### Issue: ANPR settings not affecting recognition
**Solution:**
1. Verify camera service is running
2. Check ANPR service logs
3. Restart ANPR service
4. Clear old cache

### Issue: Email notifications not sending
**Solution:**
1. Verify email is enabled: Settings → Notifications
2. Check "Alert Email Address" is correct
3. Verify email service configuration in backend
4. Check email spam folder

### Issue: Non-admin seeing settings page
**Solution:**
1. Verify user role in database: `SELECT role FROM profiles WHERE id = ...`
2. Update role: `UPDATE profiles SET role = 'admin' WHERE id = ...`
3. Have user re-login

## Security Considerations

⚠️ **Important:**
- Keep webhook secret secure (treat like password)
- Regularly review audit logs
- Enable 2FA for all admins
- Use strong passwords
- Audit access quarterly
- Backup database regularly

## Performance Impact

**Settings loading:**
- Initial load: ~200ms
- Cached for duration: Session lifetime
- Refresh: Auto-reload on settings change

**High-frequency checks:**
- `isOperatingHours()` = Lightweight (time comparison)
- `isAnprConfidenceSufficient()` = Lightweight (number comparison)
- Use in loops without concern

## API Reference

```typescript
// useSystemSettings Hook

const {
  // State
  settings,          // Current settings object
  isLoading,         // Boolean: loading state
  error,             // Error message or null
  
  // Methods
  fetchSettings,     // Refresh from database
  getSetting,        // Get single setting value
  isOperatingHours,  // Check if currently operating
  isAnprConfidenceSufficient,  // Validate ANPR confidence
  getOperatingHoursDisplay,    // Format hours for UI
} = useSystemSettings();
```

## Next Steps

After deploying settings:

1. ✅ Configure basic settings (capacity, hours)
2. ✅ Set up email notifications
3. ✅ Enable audit logging
4. ✅ Configure backups
5. ✅ Test all functionality
6. ✅ Review audit logs regularly
7. ✅ Monitor system alerts
8. ✅ Maintain documentation

## Support

For issues or questions:
1. Check this documentation
2. Review Settings page help text
3. Check browser console for errors
4. Contact system administrator
5. Review audit logs for context

---

**Admin Settings Complete** ✓
**All system-wide configuration now available through unified Settings interface**
