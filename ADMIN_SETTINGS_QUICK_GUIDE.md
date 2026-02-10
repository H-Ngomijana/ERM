# Admin System Settings - Implementation & Usage Guide

## ✨ What's New

Your Settings section has been completely transformed into a comprehensive admin control panel with:

✅ **6 Settings Categories:**
- 🏢 Garage Configuration (capacity, hours, thresholds)
- 📷 ANPR Settings (plate recognition confidence)
- 🔒 Security Settings (session timeout, 2FA requirements)
- 🔔 Notifications (email & webhook alerts)
- 💾 Backup & Logs (audit logging, data retention)
- 📹 Camera (recording quality, motion detection)

✅ **Admin-Only Access:**
- Only users with `admin` role can modify settings
- Non-admins see "Access Denied" message
- All changes are audit-logged automatically

✅ **System-Wide Application:**
- Changes apply immediately to entire system
- Settings cached for performance
- Real-time validation and feedback

## 🚀 Quick Start

### Step 1: Log in as Admin
```
1. Navigate to login page
2. Sign in with admin account
3. Go to Settings (gear icon in sidebar)
4. You should see the full tabbed interface
```

### Step 2: Initialize Settings
```
1. First time only: Click "Apply Migrations" at bottom
2. This creates the garage_settings table
3. Then refresh the page
```

### Step 3: Configure Basic Settings
```
1. Go to Garage tab
2. Set your garage's Maximum Capacity (e.g., 50 vehicles)
3. Set Operating Hours (e.g., 8:00 AM - 8:00 PM)
4. Set thresholds for yellow/red alerts
5. Click "Save Garage Settings"
```

### Step 4: Verify Integration
```
Dashboard should now:
- Show your configured capacity
- Enforce operating hours
- Display alerts based on thresholds
- Apply security settings
```

## 📋 Available Settings

### Garage Configuration Tab

| Setting | Value | Purpose |
|---------|-------|---------|
| Maximum Capacity | 1-1000 | How many vehicles can be in garage |
| Operating Hours Start | HH:MM | When garage opens |
| Operating Hours End | HH:MM | When garage closes |
| Overdue Threshold | Hours | Yellow alert trigger |
| Critical Threshold | Hours | Red alert trigger |

**Example Configuration:**
- Capacity: 50 vehicles
- Hours: 06:00 - 22:00
- Overdue: 24 hours
- Critical: 48 hours

### ANPR Settings Tab

| Setting | Value | Purpose |
|---------|-------|---------|
| Confidence Threshold | 0.0-1.0 | Min accuracy for plate recognition |
| Min Plate Length | 1-20 | Shortest valid plate |

**Tuning Guide:**
- 0.70 = Very permissive (catch everything)
- 0.85 = Balanced (recommended)
- 0.95 = Very strict (high accuracy only)

### Security Settings Tab

| Setting | Value | Purpose |
|---------|-------|---------|
| Session Timeout | 5-480 min | Auto-logout duration |
| Max Failed Logins | 1-20 | Before account lockout |
| Lockout Duration | 5-120 min | How long to lock account |
| Require 2FA | Yes/No | Force two-factor auth |

**Security Recommendations:**
- Timeout: 30 minutes (default)
- Max attempts: 5
- Lockout: 15 minutes
- 2FA: Enabled

### Notifications Tab

**Email Alerts:**
- Toggle email notifications ON/OFF
- Set email address for critical alerts
- Alerts sent for: overdue vehicles, capacity warnings, system errors

**Webhook Integrations:**
- Toggle webhook notifications ON/OFF
- Enter your webhook URL (must be HTTPS)
- Receive JSON alerts for integration with other systems
- Webhook secret for validation

**Example Webhook Setup:**
```
Webhook URL: https://your-system.com/api/alerts
Webhook Secret: your-secret-key-123

When event occurs, system sends:
POST https://your-system.com/api/alerts
Header: X-Webhook-Secret: your-secret-key-123
Body: { event: "vehicle_overdue", data: {...} }
```

### Backup & Logs Tab

| Setting | Value | Purpose |
|---------|-------|---------|
| Enable Audit Logging | Yes/No | Track all actions |
| Data Retention | 7-3650 days | Keep records for period |
| Auto Backups | Yes/No | Automatic backups |
| Backup Frequency | Daily/Weekly/Monthly | How often to backup |

**Compliance Notes:**
- 30 days = Typical
- 90 days = Recommended
- 180+ days = Enhanced compliance

### Camera Settings Tab

| Setting | Value | Purpose |
|---------|-------|---------|
| Motion Sensitivity | 0.0-1.0 | Detect motion easily? |
| Recording Quality | 360p-1080p | Video resolution |

**Storage Estimates:**
- 360p: ~200 MB/hour
- 480p: ~350 MB/hour
- 720p: ~600 MB/hour
- 1080p: ~1 GB/hour

## 🔧 Using Settings in Your Application

### Example 1: Check if Operating Hours

```typescript
import { useSystemSettings } from '@/hooks/useSystemSettings';

function GateControl() {
  const { isOperatingHours, settings } = useSystemSettings();
  
  if (!isOperatingHours()) {
    return (
      <div className="alert">
        ⛔ Garage is closed ({settings.operatingHoursStart} - {settings.operatingHoursEnd})
      </div>
    );
  }
  
  return <div className="success">✓ Garage is open</div>;
}
```

### Example 2: Validate ANPR Result

```typescript
import { useSystemSettings } from '@/hooks/useSystemSettings';

function ProcessPlateReading(plate, confidence) {
  const { isAnprConfidenceSufficient } = useSystemSettings();
  
  if (isAnprConfidenceSufficient(confidence)) {
    // Record the vehicle
    recordEntry({
      plate,
      source: 'anpr',
      confidence,
      timestamp: new Date()
    });
  } else {
    // Reject as uncertain
    logRejection({
      plate,
      confidence,
      threshold: settings.anpr_confidence_threshold
    });
  }
}
```

### Example 3: Send Alerts

```typescript
import { useSystemSettings } from '@/hooks/useSystemSettings';

async function sendVehicleOverdueAlert(vehicle) {
  const { settings } = useSystemSettings();
  
  const alert = {
    event: 'vehicle_overdue',
    vehicle_id: vehicle.id,
    plate: vehicle.plate,
    hours_parked: calculateHours(vehicle.entry_time),
    threshold: settings.overdueThreshold,
    timestamp: new Date(),
  };
  
  // Send via email
  if (settings.enable_email_notifications) {
    await fetch('/api/alerts/email', {
      method: 'POST',
      body: JSON.stringify({
        to: settings.alert_notification_email,
        alert
      })
    });
  }
  
  // Send via webhook
  if (settings.enable_webhook_notifications) {
    await fetch(settings.webhook_url, {
      method: 'POST',
      headers: {
        'X-Webhook-Secret': settings.webhook_secret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(alert)
    });
  }
}
```

## 🗄️ Database Integration

### Initialize Settings Table

First time setup:

```bash
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy content from SYSTEM_SETTINGS_INIT.sql
4. Click "Run"
5. Settings table is populated with defaults
```

Or from Settings UI:
```
Settings → Click "Apply Migrations"
→ Database schema automatically created
```

### Settings Schema

```sql
Table: garage_settings
Columns:
  - id (UUID, primary key)
  - key (TEXT, unique)
  - value (TEXT)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)

Example rows:
key                      | value
capacity                 | 50
operating_hours          | {"start":"08:00","end":"20:00"}
anpr_confidence_threshold| 0.85
session_timeout_minutes  | 30
enable_email_notifications| true
alert_notification_email | admin@garage.com
```

## 📊 Settings Application Workflow

```
Admin Changes Setting
         ↓
Settings Page Updates Local State
         ↓
"Save [Section] Settings" Clicked
         ↓
POST to Supabase garage_settings table
         ↓
Database Updated
         ↓
"✓ Settings saved successfully" Toast
         ↓
Components Using useSystemSettings Hook
         ↓
Settings Applied to All Components
         ↓
System Behavior Changes Immediately
```

## 🔐 Security

### Admin-Only Access
```typescript
// Protected in Settings.tsx
if (userRole !== 'admin') {
  return <div>Access Denied</div>;
}
```

### Webhook Secret Protection
- Treat webhook secret like a password
- Store securely in browser (not in logs)
- Sent only as header: `X-Webhook-Secret`
- Never log sensitive values

### Audit Trail
- All setting changes logged automatically
- View in Dashboard → Audit Logs
- Track who changed what and when

## ✅ Implementation Checklist

After enabling system settings:

- [ ] Verify you're logged in as admin
- [ ] Check Settings tab appears in sidebar
- [ ] Click through all 6 tabs
- [ ] Make a test change (e.g., capacity)
- [ ] Verify "Saved successfully" message
- [ ] Refresh dashboard
- [ ] Confirm change persisted
- [ ] Check audit log shows change
- [ ] Configure email notifications
- [ ] Test webhook integration (if needed)
- [ ] Set up operating hours
- [ ] Configure ANPR thresholds
- [ ] Enable 2FA requirement
- [ ] Set data retention policy

## 🐛 Troubleshooting

### Settings Tab Missing
**Problem:** Can't see Settings in sidebar
**Solution:**
1. Verify logged in as admin (check Dashboard)
2. Refresh page (Ctrl+R)
3. Check browser console for errors
4. Check user role in database

### Changes Not Saving
**Problem:** Click save but nothing happens
**Solution:**
1. Check "Saved successfully" toast
2. Check browser console for errors
3. Verify admin role
4. Click "Apply Migrations"
5. Refresh and try again

### ANPR Not Using New Threshold
**Problem:** Changed threshold but plates still accepted
**Solution:**
1. Check ANPR service is running
2. Verify value saved: Go to Settings → ANPR tab
3. Restart ANPR service
4. Clear browser cache
5. Test with new reading

### Email Alerts Not Sending
**Problem:** No emails received
**Solution:**
1. Check Email enabled: Settings → Notifications
2. Verify email address is set
3. Check spam folder
4. Review audit logs for errors
5. Check backend email service

## 📚 Additional Resources

| Resource | Location |
|----------|----------|
| Full Settings Documentation | [ADMIN_SYSTEM_SETTINGS.md](ADMIN_SYSTEM_SETTINGS.md) |
| Settings SQL Init | [SYSTEM_SETTINGS_INIT.sql](SYSTEM_SETTINGS_INIT.sql) |
| Settings Hook | [src/hooks/useSystemSettings.ts](src/hooks/useSystemSettings.ts) |
| Settings UI | [src/pages/Settings.tsx](src/pages/Settings.tsx) |

## 🎓 Next Steps

1. **Complete Initial Setup**
   - Configure garage basics
   - Set operating hours
   - Enable notifications

2. **Test Settings**
   - Make changes in Settings
   - Verify applied to system
   - Check audit logs

3. **Production Deployment**
   - Configure for your garage
   - Set security policies
   - Enable backup/audit
   - Monitor first week

4. **Ongoing Maintenance**
   - Review audit logs weekly
   - Adjust thresholds as needed
   - Monitor system performance
   - Update policies quarterly

## 🎉 Summary

You now have:

✅ Complete admin control panel
✅ 6 settings categories covering all aspects
✅ System-wide configuration
✅ Real-time application of changes
✅ Full audit trail
✅ Email & webhook notifications
✅ Security policies
✅ Backup management

All accessible from one unified Settings interface!

---

**Ready to Configure Your System!**
Visit Settings → Start with Garage Configuration tab
