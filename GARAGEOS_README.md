# 🏢 KINAMBA GarageOS

**Not a dashboard. Not a camera app.**  
**A Garage Operating System (GarageOS) with ERM + CCTV Intelligence.**

---

## 🎯 What Is GarageOS?

A complete operating system for modern garages:

- **CCTV Integration** - Real-time plate detection via ANPR cameras
- **Event Recognition Management (ERM)** - Intelligent rules engine
- **Lifecycle Management** - Track vehicles from entry to exit with approval workflows
- **Client Approval System** - SMS/WhatsApp/Web approvals
- **Camera Health Monitoring** - Heartbeat detection and offline alerts
- **Audit Trail** - Forensic-grade logging for legal disputes
- **Multi-role Access** - Super Admin, Garage Admin, Staff, Clients

---

## 🚀 Core Features

### ✅ 1. Live Gate (CCTV) Module
Real-time vehicle detection with ANPR service.
- Receive plate + snapshot from ANPR camera
- Show live gate panel on dashboard
- Create vehicle entry automatically
- Confidence check + pending review
- 60-second duplicate suppression
- Normalize plate format
- Source tag = CCTV or MANUAL

**Status:** ✅ Scaffolded and ready for integration

### ✅ 2. Vehicle Lifecycle States
Every vehicle flows through a state machine:
- `ENTERED` - Detected by CCTV
- `AWAITING_APPROVAL` - Pending admin/client review
- `IN_SERVICE` - Approved and in garage
- `READY_FOR_EXIT` - Awaiting exit scan
- `EXITED` - Left the garage
- `FLAGGED` - Alert or manual review required

**Status:** ✅ Database schema ready

### ✅ 3. Client Approval System
From vehicle panel, admin can:
- Send payment approval request
- Client receives SMS / WhatsApp / Web link
- Client approves or rejects
- Status updates live on dashboard

**Status:** ✅ Endpoints scaffolded (`/api/gate/approval-*`)

### ✅ 4. Manual Fallback Mode
Admin can:
- Add vehicle manually
- Correct misread plate
- Mark entry / exit manually
- Override cooldown rules

All stored with `source = MANUAL` and `admin_id`.

**Status:** ✅ Endpoint created (`/api/gate/manual-entry`)

### ✅ 5. Alert & Risk Engine (ERM Brain)
System auto-alerts when:
- Duplicate plate entry
- Unknown vehicle
- After-hours entry
- Vehicle stayed too long
- Camera offline
- Plate confidence low

**Status:** ✅ Architecture defined, scaffold in progress

### ✅ 6. Vehicle Detail Control Panel
When clicking a vehicle:
- Show snapshot image
- Entry time and duration
- Client info
- Status timeline
- Actions (approve, service, exit, correct plate)

**Status:** ✅ Frontend skeleton created

### ✅ 7. History & Evidence Storage
For every visit store:
- Plate (normalized + raw)
- Snapshots (linked to entry)
- Times (entry/exit)
- Source (CCTV/MANUAL)
- Admin actions (corrections, approvals)
- Client approvals

Searchable by plate, date, client.  
**Legal proof for disputes.**

**Status:** ✅ Database schema ready

### ✅ 8. Camera Management (Settings Page)
Admin can:
- Add camera and set API key
- Name camera (Gate 1, Gate 2, etc.)
- See camera online/offline status
- Set confidence threshold
- Monitor heartbeat

**Status:** ✅ Frontend skeleton created

### ✅ 9. Roles & Security
Roles:
- **Super Admin** - Full system access
- **Garage Admin** - Manage vehicles, approvals, cameras
- **Staff** - View only
- **Client** - Approve/reject payment via link

Security:
- JWT authentication (Supabase auth)
- API key per camera
- Rate limiting (60 req/min default)
- IP logging in audit logs

**Status:** ✅ Auth system exists (needs role-based gates)

### ✅ 10. Reports & Metrics
Daily / weekly reports:
- Vehicles today
- Average stay duration
- Approvals pending
- Peak hours
- Unknown vehicles count

Export CSV/PDF.

**Status:** 🔄 Scaffolding in progress

### ✅ 11. Notification System
Real-time notifications for:
- New entry
- Approval received
- Risk alert
- Camera offline

**Status:** 🔄 Uses Supabase real-time, needs UI

### ✅ 12. Exit Camera Ready (Future-Proof)
System must support second camera for exit detection using same logic.

**Status:** ✅ Architecture allows it

### ✅ 13. Audit Logs (Forensic)
Log every action:
- Admin actions (manual entry, plate correction, approval)
- Camera events (heartbeat, offline, detection)
- Status changes
- Client responses

**Status:** ✅ Centralized audit logger created

### ✅ 14. Garage Settings
- Garage capacity
- Working hours
- Cooldown time
- Alert thresholds

**Status:** ✅ Database table ready

---

## 📁 Project Structure

```
server/
├── src/
│   ├── index.js                  # Main server (mount camera_routes here)
│   ├── camera_routes.js          # CCTV module endpoints ✅ NEW
│   ├── audit_logger.js           # Centralized audit logging ✅ NEW
│   ├── heartbeat_monitor.js      # Camera health monitor ✅ NEW
│   └── ...
├── edge_anpr/
│   └── anpr_service.py           # Python ANPR service
└── package.json

src/
├── pages/
│   ├── Dashboard.tsx             # Main dashboard
│   ├── CameraSettings.tsx        # Camera management ✅ NEW
│   └── ...
├── components/
│   ├── gate/
│   │   ├── LiveGatePanel.tsx     # Real-time detections ✅ NEW
│   │   └── VehicleDetailPanel.tsx # Vehicle control panel ✅ NEW
│   └── ...
└── hooks/
    └── useGarageData.ts          # Real-time data fetching

supabase/
└── migrations/
    ├── 20260204_gate_module.sql  # Cameras, approvals tables ✅ NEW
    └── ...

docs/
└── GATE_MODULE_SPEC.md           # Complete spec ✅ NEW
```

---

## 🔌 Integration Checklist

### Phase 1: Backend Wiring (In Progress)

- [ ] Import `camera_routes.js` in `server/src/index.js`
  ```javascript
  const cameraRoutes = require('./src/camera_routes');
  app.use('/api/gate', cameraRoutes);
  ```

- [ ] Import heartbeat monitor in `server/src/index.js`
  ```javascript
  const { createMonitor } = require('./src/heartbeat_monitor');
  const hbMonitor = createMonitor(supabase, { checkIntervalSec: 60 });
  hbMonitor.start();
  ```

- [ ] Run migration: `20260204_gate_module.sql`

- [ ] Test endpoints:
  ```bash
  # Vehicle entry (CCTV)
  curl -X POST http://localhost:4000/api/gate/vehicle-entry \
    -H "x-api-key: sk-..." \
    -d '{"plate_number":"ABC123","confidence":95,"camera_id":"CAM1"}'

  # Camera heartbeat
  curl -X POST http://localhost:4000/api/gate/heartbeat \
    -H "x-api-key: sk-..." \
    -d '{"camera_id":"CAM1","status":"online"}'

  # Manual entry
  curl -X POST http://localhost:4000/api/gate/manual-entry \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d '{"admin_id":"admin-uuid","plate_number":"XYZ789","note":"Manual add"}'
  ```

### Phase 2: Frontend Integration (Next)

- [ ] Wire `LiveGatePanel` into main dashboard
- [ ] Wire `VehicleDetailPanel` into vehicle list
- [ ] Add `CameraSettings` page to Settings section
- [ ] Implement real-time subscriptions in `useGarageData.ts`
- [ ] Add approval UI (Send SMS, Show approval status)

### Phase 3: Approval Provider Integration (Next)

- [ ] Choose provider: Twilio, MessageBird, AWS SNS
- [ ] Implement SMS/WhatsApp sender in `camera_routes.js`
- [ ] Set up callback webhook receiver
- [ ] Test end-to-end approval flow

### Phase 4: Reports & Analytics (Future)

- [ ] Add reporting page
- [ ] Query and aggregate data
- [ ] Export CSV/PDF

---

## 🛠️ Setup Instructions

### 1. Apply Migration

```bash
cd supabase
supabase migration up 20260204_gate_module
```

Or manually run SQL in Supabase dashboard.

### 2. Wire Backend Routes

Edit `server/src/index.js`:

```javascript
const cameraRoutes = require('./src/camera_routes');
app.use('/api/gate', cameraRoutes);

// Start heartbeat monitor
const { createMonitor } = require('./src/heartbeat_monitor');
const hbMonitor = createMonitor(supabase, { 
  checkIntervalSec: 60, 
  offlineThresholdSec: 300 
});
hbMonitor.start();
```

### 3. Restart Backend

```bash
npm start
```

### 4. Test Endpoints

Use curl examples above or import into Postman.

### 5. Configure Environment

```bash
# server/.env
GATE_COOLDOWN_SEC=60          # Duplicate suppression window
CONFIDENCE_THRESHOLD=85       # Minimum ANPR confidence
APPROVAL_SMS_PROVIDER=twilio  # Or messageBird, sns
APPROVAL_SMS_API_KEY=...
APPROVAL_SMS_FROM=+1234567890
```

---

## 📊 Data Models

### garage_entries (Enhanced)
```sql
id, plate_number, confidence, camera_id, snapshot_url,
source (CCTV|MANUAL), status (inside|in_service|etc),
lifecycle_status (ENTERED|AWAITING_APPROVAL|IN_SERVICE|...),
entry_time, exit_time, created_at
```

### cameras (NEW)
```sql
id, camera_id (unique), name, api_key, status (online|offline),
last_seen, created_at
```

### approvals (NEW)
```sql
id, garage_entry_id, client_id, method (sms|whatsapp|web),
approval_status (pending|approved|rejected),
sent_at, responded_at, response_payload, created_at
```

### audit_logs (Enhanced)
```sql
id, action, actor_id, entity_type, entity_id, details (JSON),
ip_address, created_at
```

---

## 🎓 How It Works: Full Flow

### Scenario: Vehicle ABC123 Arrives

```
1. CCTV camera detects plate "ABC123" at confidence 96%
   ↓
2. Camera POSTs to /api/gate/vehicle-entry
   ↓
3. Backend:
   - Normalizes plate to "ABC123"
   - Checks cooldown (not seen in 60s) ✓
   - Checks confidence (96% > 85%) ✓
   - Creates garage_entry: status=inside, lifecycle_status=ENTERED
   - Logs action in audit_logs
   - Returns entry + any alerts
   ↓
4. Supabase broadcasts change (real-time subscription)
   ↓
5. Frontend updates:
   - Shows new vehicle in LiveGatePanel
   - Updates occupancy counter
   - New entry appears in vehicle list
   ↓
6. Admin clicks vehicle → VehicleDetailPanel opens
   - Shows snapshot
   - Shows "Entry Time: 10:42 AM"
   - Shows action buttons: Approve, Service, Exit
   ↓
7. Admin clicks "Approve" → /api/gate/approval-request
   - Creates approval record (pending)
   - Sends SMS/WhatsApp to client (via provider webhook)
   ↓
8. Client receives link: "https://kinamba.app/approve?token=xyz"
   - Clicks approve
   - Provider POSTs to /api/gate/approval-callback
   - Updates approval record: status=approved
   - Updates garage_entry: lifecycle_status=IN_SERVICE
   ↓
9. Frontend updates instantly:
   - "Approval Received ✓"
   - Status changes to "IN_SERVICE"
   ↓
10. Exit camera detects ABC123 leaving
    - POSTs to /api/gate/vehicle-entry (via second camera or manual)
    - Backend creates new entry with exit_time
    - Updates lifecycle_status=EXITED
    ↓
11. Audit trail shows:
    - VEHICLE_ENTRY_CCTV (camera, timestamp, confidence)
    - APPROVAL_REQUEST_SENT (admin, client, method)
    - APPROVAL_RESPONDED (client, approved, timestamp)
    - VEHICLE_EXIT (exit camera or admin)
```

---

## 🔒 Security & Compliance

- ✅ All admin actions logged with IP address and timestamp
- ✅ Snapshots stored and linked to entries for evidence
- ✅ Audit trail immutable (append-only)
- ✅ Role-based access control (to be enforced)
- ✅ API key + JWT authentication
- ✅ Rate limiting to prevent abuse

---

## 📈 Next Priorities

### Phase 1 (This Sprint)
- [ ] Wire backend routes into main server
- [ ] Test all endpoints with curl/Postman
- [ ] Verify database inserts and real-time

### Phase 2 (Next Sprint)
- [ ] Integrate SMS provider (Twilio)
- [ ] Wire frontend components
- [ ] Test approval flow end-to-end

### Phase 3 (Future)
- [ ] Reports & analytics page
- [ ] Multi-camera dashboard heatmap
- [ ] Vehicle color/make detection
- [ ] Mobile app notifications

---

## 📚 Documentation

- [GATE_MODULE_SPEC.md](docs/GATE_MODULE_SPEC.md) - Complete technical specification
- [ANPR_ERM_INTEGRATION.md](ANPR_ERM_INTEGRATION.md) - Backend architecture
- [API_REFERENCE.md](API_REFERENCE.md) - API endpoint reference
- [CONFIGURATION_REFERENCE.md](CONFIGURATION_REFERENCE.md) - Environment variables

---

## 🆘 Troubleshooting

### "Cannot POST /api/gate/vehicle-entry"
→ Did you mount `cameraRoutes` in `server/src/index.js`?

### "Invalid API key"
→ Verify `EDGE_API_KEY` env var and header match

### "Supabase connection error"
→ Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### "Camera offline alert keeps firing"
→ Verify camera is POSTing to `/api/gate/heartbeat` regularly

---

## 📞 Support

For issues, check:
1. Backend logs: `npm start` output
2. Browser console: F12
3. Supabase dashboard: Check table data
4. Audit logs: Review for error trails

---

**Status:** ✅ **ARCHITECTURE COMPLETE**  
**Next:** Wire backend routes and test endpoints  
**Version:** 1.0 - GarageOS MVP  
**Last Updated:** February 4, 2026
