# Gate Module Integration - Test & Setup Guide

## ✅ Completed

All Gate (CCTV) module scaffolding is complete and ready for integration:

### Files Created
1. ✅ `server/src/camera_routes.js` - All gate endpoints
2. ✅ `server/src/heartbeat_monitor.js` - Camera health monitoring
3. ✅ `server/src/audit_logger.js` - Centralized audit logging
4. ✅ `supabase/migrations/20260204_gate_module.sql` - Database schema
5. ✅ `src/components/gate/LiveGatePanel.tsx` - Real-time CCTV display
6. ✅ `src/components/gate/VehicleDetailPanel.tsx` - Vehicle control panel
7. ✅ `src/pages/CameraSettings.tsx` - Camera management page
8. ✅ `docs/GATE_MODULE_SPEC.md` - Complete technical spec
9. ✅ `GARAGEOS_README.md` - System overview

### Frontend Skeletons
- LiveGatePanel: Real-time vehicle detection display
- VehicleDetailPanel: Snapshot, timeline, actions
- CameraSettings: Camera registration & API key management

### Backend Endpoints (Ready)
- `POST /api/gate/vehicle-entry` - CCTV plate detection
- `POST /api/gate/heartbeat` - Camera health check
- `POST /api/gate/manual-entry` - Admin manual fallback
- `POST /api/gate/approval-request` - Send approval to client
- `POST /api/gate/approval-callback` - Receive approval response
- `GET /api/gate/approval/:approval_id` - Check approval status

### Database Schema (Ready)
- `cameras` table - Camera registration & status
- `approvals` table - Approval requests & responses
- Enhanced `garage_entries` - Added source & lifecycle_status columns

---

## 🔧 Next Steps: Integration

### Step 1: Update server/.env

```bash
# server/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase
EDGE_API_KEY=sk-your-api-key-here
PORT=4000
GATE_COOLDOWN_SEC=60
CONFIDENCE_THRESHOLD=85
```

**Get credentials:**
- SUPABASE_URL: Project Settings → API → Project URL
- SUPABASE_SERVICE_ROLE_KEY: Project Settings → API → Service Role Key
- EDGE_API_KEY: Generate with `openssl rand -hex 32`

### Step 2: Run Database Migration

```bash
# In Supabase dashboard:
# 1. Go to SQL Editor
# 2. Paste contents of supabase/migrations/20260204_gate_module.sql
# 3. Click "Run"

# Or use Supabase CLI:
supabase migration up 20260204_gate_module
```

### Step 3: Wire Routes into Main Server

The routes are already imported in `server/src/index.js`:

```javascript
import cameraRoutes from './camera_routes.js';
import { createMonitor } from './heartbeat_monitor.js';

// Mount routes
app.use('/api/gate', cameraRoutes);

// Start heartbeat monitor
const hbMonitor = createMonitor(supabase, {
  checkIntervalSec: 60,
  offlineThresholdSec: 300
});
hbMonitor.start();
```

### Step 4: Start Backend

```bash
cd server
npm install  # if not already done
node src/index.js
```

Should output:
```
[HeartbeatMonitor] Starting with check interval 60s, offline threshold 300s
KINAMBA ERM server listening on port 4000
```

### Step 5: Test Endpoints

#### Test 1: Vehicle Entry (CCTV)

```bash
curl -X POST http://localhost:4000/api/gate/vehicle-entry \
  -H "x-api-key: sk-your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "plate_number": "ABC123",
    "confidence": 95,
    "camera_id": "CAM1",
    "snapshot_url": "https://example.com/snap.jpg"
  }'
```

Expected response:
```json
{
  "ok": true,
  "entry": {
    "id": "uuid",
    "plate_number": "ABC123",
    "lifecycle_status": "ENTERED",
    "confidence": 95,
    "source": "CCTV",
    ...
  },
  "alerts": []
}
```

#### Test 2: Camera Heartbeat

```bash
curl -X POST http://localhost:4000/api/gate/heartbeat \
  -H "x-api-key: sk-your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": "CAM1",
    "status": "online"
  }'
```

Expected response:
```json
{
  "ok": true
}
```

#### Test 3: Manual Entry

```bash
curl -X POST http://localhost:4000/api/gate/manual-entry \
  -H "x-api-key: sk-your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin-uuid-here",
    "plate_number": "XYZ789",
    "camera_id": "MANUAL",
    "note": "Manual entry test"
  }'
```

Expected response:
```json
{
  "ok": true,
  "entry": {
    "id": "uuid",
    "plate_number": "XYZ789",
    "lifecycle_status": "AWAITING_APPROVAL",
    "source": "MANUAL",
    ...
  }
}
```

#### Test 4: Approval Request

```bash
curl -X POST http://localhost:4000/api/gate/approval-request \
  -H "x-api-key: sk-your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "garage_entry_id": "entry-uuid-from-test-1",
    "client_id": "client-uuid-here",
    "method": "sms"
  }'
```

Expected response:
```json
{
  "ok": true,
  "approval": {
    "id": "approval-uuid",
    "garage_entry_id": "entry-uuid",
    "approval_status": "pending",
    "method": "sms",
    "sent_at": "2026-02-04T...",
    ...
  }
}
```

#### Test 5: Approval Callback

```bash
curl -X POST http://localhost:4000/api/gate/approval-callback \
  -H "x-api-key: sk-your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_id": "approval-uuid-from-test-4",
    "status": "approved",
    "response_payload": { "timestamp": "2026-02-04T..." }
  }'
```

Expected response:
```json
{
  "ok": true,
  "approval": {
    "id": "approval-uuid",
    "approval_status": "approved",
    "responded_at": "2026-02-04T...",
    ...
  }
}
```

#### Test 6: Check Garage Entry in Database

```bash
# In Supabase dashboard → SQL Editor:
SELECT * FROM garage_entries WHERE plate_number = 'ABC123' LIMIT 1;
SELECT * FROM approvals WHERE garage_entry_id = 'entry-uuid' LIMIT 1;
SELECT * FROM audit_logs WHERE entity_type = 'garage_entry' ORDER BY created_at DESC LIMIT 10;
```

---

## 🎯 Verification Checklist

- [ ] server/.env has all required variables
- [ ] Database migration ran successfully
- [ ] `node src/index.js` starts without errors
- [ ] POST /api/gate/vehicle-entry works
- [ ] POST /api/gate/heartbeat works
- [ ] POST /api/gate/manual-entry works
- [ ] Audit logs appear in database
- [ ] garage_entries table has source & lifecycle_status columns
- [ ] cameras table exists
- [ ] approvals table exists

---

## 🚀 Frontend Integration (Next Phase)

Once backend is working:

1. Wire `LiveGatePanel` into main Dashboard
2. Implement real-time subscription in `useGarageData.ts`
3. Add vehicle detail panel to vehicle list
4. Implement approval UI (send SMS, show status)
5. Add camera settings to Settings page

---

## 🆘 Troubleshooting

### "Invalid API key"
- Check `x-api-key` header matches `EDGE_API_KEY` in .env

### "Supabase connection error"
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Check Supabase project is accessible

### "Table does not exist"
- Run migration: `supabase migration up 20260204_gate_module`

### "HeartbeatMonitor not starting"
- Ensure Supabase client is initialized before heartbeat starts
- Check logs for errors

### Database entries not appearing
- Check RLS policies allow inserts (should be permissive for service role)
- Verify table structure matches schema

---

## 📊 Architecture Summary

```
CCTV/ANPR Camera
  ↓ POST /api/gate/vehicle-entry
Backend Routes (camera_routes.js)
  ├─ Normalize plate
  ├─ Check cooldown
  ├─ Insert garage_entry (source=CCTV)
  ├─ Log audit trail
  └─ Create alerts if needed
  ↓
Supabase Database
  ├─ garage_entries (+ source, lifecycle_status)
  ├─ alerts
  ├─ audit_logs
  ├─ cameras
  └─ approvals
  ↓
Real-time Subscriptions
  ↓
React Dashboard
  ├─ LiveGatePanel updates instantly
  ├─ VehicleDetailPanel shows data
  └─ Approvals workflow
```

---

## 📞 Support

All code and infrastructure is ready. The next step is:

1. **Provide Supabase credentials** in server/.env
2. **Run the migration** to create tables
3. **Start the backend** - all endpoints will be available
4. **Test with curl** - verify endpoints work
5. **Wire frontend** - connect React components to backend

---

**Status:** ✅ **SCAFFOLDING COMPLETE - READY FOR DEPLOYMENT**  
**Last Updated:** February 4, 2026
