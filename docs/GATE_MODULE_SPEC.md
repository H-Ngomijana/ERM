# Gate (CCTV) Module - Specification

Purpose: Real-time vehicle detection, lifecycle management, approvals, and camera management.

## Key Features

- Live Gate panel: shows real-time CCTV detections with snapshots
- Automatic entry creation with `source = 'CCTV'`
- Confidence check and pending review flow
- 60s duplicate suppression (cooldown)
- Normalize plates (uppercase, remove non-alphanum)
- Store snapshot URL with each entry
- Camera heartbeat endpoint and camera status management
- Lifecycle states: ENTERED, AWAITING_APPROVAL, IN_SERVICE, READY_FOR_EXIT, EXITED, FLAGGED
- Admin manual fallback (source = MANUAL)
- Approval system (SMS/WhatsApp/Web link) with records
- Alerts generated for duplicates, low confidence, offline cameras, after-hours, long stay
- Audit logs for all admin and camera events
- Roles and security: Super Admin, Garage Admin, Staff
- API key per camera and JWT for admin
- Rate limiting and IP logging

---

## Database Additions (migration included)

- `cameras` table: camera_id, name, api_key, status, last_seen
- `approvals` table: tracks approval requests and responses
- `garage_entries`: add `source` and `lifecycle_status` columns

---

## API Endpoints (new)

1. POST `/api/gate/vehicle-entry`
   - Body: `{ plate_number, confidence, camera_id, snapshot_url }`
   - Auth: `x-api-key` camera key or EDGE_API_KEY
   - Behavior: normalize plate, cooldown, insert entry with `source=CCTV`, set lifecycle_status = ENTERED or FLAGGED if low confidence

2. POST `/api/gate/heartbeat`
   - Body: `{ camera_id, api_key, status }`
   - Auth: camera api_key optional
   - Behavior: upsert camera last_seen and status, create alert if offline

3. POST `/api/gate/manual-entry`
   - Body: `{ admin_id, plate_number, camera_id, note }`
   - Auth: JWT (admin)
   - Behavior: create entry with `source=MANUAL`, lifecycle_status = AWAITING_APPROVAL

4. POST `/api/gate/approval-request`
   - Body: `{ garage_entry_id, client_id, method }`
   - Behavior: send SMS/WhatsApp/web link, create approvals row

5. POST `/api/gate/approval-callback`
   - Provider calls this with approval result; updates `approvals` row and updates `garage_entries.lifecycle_status`

6. GET `/api/gate/cameras`
   - Returns camera list and status

7. POST `/api/gate/cameras` (admin)
   - Add camera, generates api_key

---

## Lifecycle State Transitions (rules)

- On CCTV entry accepted → `ENTERED`
- If confidence < threshold → `FLAGGED` and `AWAITING_APPROVAL` for manual review
- Manual add → `AWAITING_APPROVAL`
- Admin approves → `IN_SERVICE` or `READY_FOR_EXIT` depending on flow
- When vehicle marked ready to leave → `READY_FOR_EXIT`
- When exit camera sees plate or admin marks exit → `EXITED`
- System flags long-stay (duration > configured limit) → `FLAGGED`

---

## Approval Flow

1. Admin triggers approval request or system auto-sends for unknown/flagged plates
2. Create `approvals` row with `approval_status = pending` and `sent_at`
3. Send message with secure link `/approve?token=...` to client via SMS/WhatsApp
4. Client clicks and approves/rejects → provider calls `/api/gate/approval-callback`
5. Update `approvals` row with `responded_at` and `approval_status`
6. Update `garage_entries.lifecycle_status` → `IN_SERVICE` if approved, `FLAGGED` if rejected
7. Log everything in `audit_logs`

---

## Camera Heartbeat

- Edge service must POST to `/api/gate/heartbeat` every N seconds (configurable)
- Server updates `cameras.last_seen`
- If `last_seen` exceeds threshold (configurable), mark camera `offline` and create alert

---

## Security

- Camera API key: `cameras.api_key` must be used in `x-api-key` for camera endpoints
- Admin authentication: JWT (Supabase auth or internal)
- Rate limit camera endpoints: 60 req/min by default
- IP logging in `audit_logs.details` for forensic trail

---

## Frontend Integration

- `LiveGatePanel` subscribes to `garage_entries` realtime inserts filtered by `source = 'CCTV'`
- Clicking an event opens `VehicleDetailPanel` with snapshot and actions
- CameraSettings page lists cameras, allows add/regenerate keys, set thresholds
- Approval actions trigger API calls to `/api/gate/approval-request`
- Manual fallback available on each vehicle in detail panel

---

## Next Steps for Implementation

- Wire `server/src/camera_routes.js` into `server/src/index.js`
- Add Redis-backed cooldown for multi-instance environments
- Implement real SMS/WhatsApp provider integration (Twilio/MessageBird)
- Add unit tests for lifecycle transitions
- Add role-based guards for admin endpoints

---

*Spec created on Feb 4, 2026.*
