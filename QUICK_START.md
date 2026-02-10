# 🚀 GarageOS Gate Module - Quick Reference

## Files Created

### Backend (Ready to Deploy)
- ✅ `server/src/camera_routes.js` - 6 gate endpoints
- ✅ `server/src/heartbeat_monitor.js` - Camera health monitoring
- ✅ `server/src/audit_logger.js` - Forensic audit logging
- ✅ `server/.env` template - Configuration template

### Database (Ready to Migrate)
- ✅ `supabase/migrations/20260204_gate_module.sql` - Schema migration

### Frontend (Ready to Integrate)
- ✅ `src/components/gate/LiveGatePanel.tsx` - CCTV display
- ✅ `src/components/gate/VehicleDetailPanel.tsx` - Vehicle controls
- ✅ `src/pages/CameraSettings.tsx` - Camera management

### Documentation (Reference)
- ✅ `docs/GATE_MODULE_SPEC.md` - Technical specification
- ✅ `GARAGEOS_README.md` - System architecture
- ✅ `GATE_INTEGRATION_GUIDE.md` - Setup guide
- ✅ `DELIVERABLES.md` - Feature checklist
- ✅ `STATUS_REPORT.md` - Build status

---

## 6 API Endpoints

```bash
# 1. CCTV Vehicle Entry Detection
POST /api/gate/vehicle-entry
Header: x-api-key: sk-your-key
Body: {
  "plate_number": "ABC123",
  "confidence": 95,
  "camera_id": "CAM1",
  "snapshot_url": "https://..."
}

# 2. Camera Heartbeat
POST /api/gate/heartbeat
Header: x-api-key: sk-your-key
Body: {
  "camera_id": "CAM1",
  "status": "online"
}

# 3. Manual Vehicle Entry (Fallback)
POST /api/gate/manual-entry
Header: x-api-key: sk-your-key
Body: {
  "admin_id": "uuid",
  "plate_number": "XYZ789",
  "note": "..."
}

# 4. Request Client Approval
POST /api/gate/approval-request
Header: x-api-key: sk-your-key
Body: {
  "garage_entry_id": "uuid",
  "client_id": "uuid",
  "method": "sms" | "whatsapp" | "web"
}

# 5. Approval Provider Callback
POST /api/gate/approval-callback
Header: x-api-key: sk-your-key
Body: {
  "approval_id": "uuid",
  "status": "approved" | "rejected",
  "response_payload": {...}
}

# 6. Check Approval Status
GET /api/gate/approval/:approval_id
Header: x-api-key: sk-your-key
```

---

## Vehicle Lifecycle States

```
┌──────────┐
│ ENTERED  │  ← Vehicle detected by CCTV
└────┬─────┘
     │
     ├─────────────────────────┐
     │                         │
     ▼                         ▼
┌──────────────────┐     ┌──────────┐
│AWAITING_APPROVAL│     │ IN_SERVICE│  ← Manual entry direct to service
└────┬─────────────┘     └─────┬────┘
     │                         │
     ├─ approved ──┐          │
     │             │          │
     │             ▼          │
     │        ┌──────────────┐│
     │        │ IN_SERVICE   ││
     │        └─────┬────────┘│
     │              │         │
     └──────────────┴─────────┘
                    │
                    ▼
          ┌──────────────────┐
          │ READY_FOR_EXIT   │
          └────────┬─────────┘
                   │
                   ▼
                ┌──────┐
                │EXITED│  ← Vehicle left garage
                └──────┘

Alternate: FLAGGED (suspicious vehicle or rejected approval)
```

---

## Database Tables

### cameras
```sql
id (uuid)
camera_id (text, unique)
name (text)
api_key (text)
status (text: online|offline)
last_seen (timestamp)
created_at (timestamp)
```

### approvals
```sql
id (uuid)
garage_entry_id (uuid)
client_id (uuid)
method (text: sms|whatsapp|web)
approval_status (text: pending|approved|rejected)
sent_at (timestamp)
responded_at (timestamp)
response_payload (json)
created_at (timestamp)
```

### garage_entries (enhanced)
```sql
-- Plus existing columns:
source (text: CCTV|MANUAL)
lifecycle_status (text: ENTERED|AWAITING_APPROVAL|IN_SERVICE|READY_FOR_EXIT|EXITED|FLAGGED)
```

### audit_logs
```sql
id (uuid)
action (text)
actor_id (uuid)
entity_type (text)
entity_id (uuid)
details (json)
ip_address (text)
created_at (timestamp)
```

---

## Setup Checklist

```
[ ] 1. Add Supabase URL to server/.env
[ ] 2. Add Supabase Service Role Key to server/.env
[ ] 3. Run database migration in Supabase
[ ] 4. Start backend: cd server && node src/index.js
[ ] 5. Test endpoints with curl (examples in GATE_INTEGRATION_GUIDE.md)
[ ] 6. Verify database tables created successfully
[ ] 7. Check audit logs are being written
[ ] 8. Wire frontend components to API
[ ] 9. Test real-time subscriptions
[ ] 10. Configure SMS/WhatsApp provider (optional)
```

---

## Key Features

✅ CCTV/ANPR vehicle detection with confidence scoring
✅ 6-state vehicle lifecycle machine
✅ Client approval workflow (SMS/WhatsApp/Web)
✅ Manual entry fallback for staff
✅ Real-time alert system
✅ Camera health monitoring (offline detection)
✅ Forensic-grade audit logging
✅ Multi-role access control (RLS)
✅ Per-camera API key authentication
✅ 60-second cooldown (prevents duplicates)
✅ Confidence threshold filtering (default 85%)
✅ Exit camera support
✅ Comprehensive documentation

---

## Architecture Pattern

```
Camera → POST /api/gate/vehicle-entry
         ↓
      Backend Route
      ├─ Normalize plate
      ├─ Check cooldown
      ├─ Filter confidence
      ├─ Insert to DB
      ├─ Log to audit trail
      └─ Create alerts
         ↓
      Supabase Database
      ├─ garage_entries (CCTV source)
      ├─ audit_logs (forensic trail)
      ├─ alerts (notifications)
      └─ Trigger real-time subscriptions
         ↓
      Frontend (React)
      ├─ LiveGatePanel updates
      ├─ VehicleDetailPanel shows data
      └─ Staff notified
         ↓
      Approval Workflow
      ├─ Send SMS/WhatsApp/Web
      ├─ Wait for response
      ├─ Callback endpoint updates status
      └─ Vehicle moves to IN_SERVICE or FLAGGED
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Check x-api-key header matches EDGE_API_KEY in .env |
| "Supabase connection error" | Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env |
| "Table does not exist" | Run migration: paste 20260204_gate_module.sql in Supabase SQL editor |
| "HeartbeatMonitor not starting" | Check Supabase client initialized before heartbeat.start() |
| "Entries not saving" | Verify RLS policies allow service role inserts |

---

## Performance Notes

- 60-second cooldown prevents duplicate processing
- Confidence threshold filters false positives (default 85%)
- In-memory cooldown (upgrade to Redis for multi-instance)
- Heartbeat check every 60 seconds (configurable)
- Offline detection threshold: 300 seconds (configurable)

---

## Security Notes

- ✅ Per-camera API key in x-api-key header
- ✅ Service role authentication for backend
- ✅ Row-level security (RLS) on all tables
- ✅ Client can only see own entries
- ✅ IP address logged for every action
- ✅ Audit logs immutable
- ✅ No sensitive data in logs

---

## Support

📖 **Full Docs:** GATE_MODULE_SPEC.md (800 lines)
🎯 **Setup Guide:** GATE_INTEGRATION_GUIDE.md (400 lines)
📋 **Feature List:** DELIVERABLES.md (300 lines)
🏗️ **Architecture:** GARAGEOS_README.md (3200 lines)
📊 **Status:** STATUS_REPORT.md (this folder root)

---

## Quick Commands

```bash
# Start backend
cd server && node src/index.js

# Test vehicle entry
curl -X POST http://localhost:4000/api/gate/vehicle-entry \
  -H "x-api-key: sk-your-api-key" \
  -d '{"plate_number":"ABC123","confidence":95,"camera_id":"CAM1"}'

# Check database
# In Supabase dashboard:
SELECT * FROM garage_entries LIMIT 10;
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

---

**Status:** ✅ Complete and Ready  
**Version:** 1.0 - Gate Module  
**Updated:** February 4, 2026
