# DVR/RTSP Camera Integration Guide

## Overview

This feature enables your GarageOS (ERM) system to connect directly to existing CCTV cameras via RTSP streams from your DVR/NVR device on the local network. No cloud integration, no external APIs – everything runs locally within your garage network.

## Architecture

```
DVR/NVR (on LAN)
    ↓ (RTSP stream)
ERM Server (Node.js)
    ↓ (REST API)
Frontend UI
    ↓ (Admin controls)
Database (Supabase)
```

## Database Schema

### cameras table

```sql
CREATE TABLE cameras (
  id UUID PRIMARY KEY,
  camera_id TEXT UNIQUE NOT NULL,
  name TEXT,                          -- e.g., "Gate Camera"
  dvr_ip TEXT,                        -- e.g., "192.168.1.100"
  dvr_username TEXT,                  -- e.g., "admin"
  dvr_password TEXT,                  -- encrypted in production
  channel_number INT,                 -- e.g., 101, 102 (DVR channel)
  rtsp_url TEXT,                      -- generated: rtsp://user:pass@ip:554/Streaming/Channels/101
  connection_status TEXT,             -- "online" | "offline" | "untested"
  last_tested TIMESTAMP,              -- when connection was last verified
  status TEXT,                        -- "active" | "inactive"
  created_at TIMESTAMP
);
```

## API Endpoints

All endpoints are mounted at `/api/gate/`

### 1. Generate RTSP URL

**Endpoint:** `POST /api/gate/cameras/generate-rtsp`

Generates a standard RTSP URL from DVR connection details.

**Request Body:**
```json
{
  "dvr_ip": "192.168.1.100",
  "dvr_username": "admin",
  "dvr_password": "1234",
  "channel_number": 101
}
```

**Response:**
```json
{
  "ok": true,
  "rtsp_url": "rtsp://admin:1234@192.168.1.100:554/Streaming/Channels/101",
  "preview": "Preview: Streaming from 192.168.1.100 Channel 101"
}
```

**RTSP Format:**
```
rtsp://username:password@dvr_ip:554/Streaming/Channels/channel_number
```

Common channel numbers:
- 101 = Camera 1
- 102 = Camera 2
- 103 = Camera 3
- etc.

---

### 2. Test RTSP Connection

**Endpoint:** `POST /api/gate/cameras/test`

Tests if the RTSP stream is accessible and captures a test frame.

**Request Body:**
```json
{
  "rtsp_url": "rtsp://admin:1234@192.168.1.100:554/Streaming/Channels/101",
  "camera_name": "Gate Camera"
}
```

**Response:**
```json
{
  "ok": true,
  "status": "online",
  "lastTested": "2026-02-04T10:30:00Z",
  "snapshotUrl": "data:image/png;base64,...",
  "message": "Connection test passed. RTSP stream is accessible."
}
```

**On Failure:**
```json
{
  "ok": false,
  "error": "Connection test failed",
  "details": "Unable to reach RTSP stream"
}
```

---

### 3. Register New Camera

**Endpoint:** `POST /api/gate/cameras`

Saves a camera configuration after successful test.

**Request Body:**
```json
{
  "name": "Gate Camera",
  "dvr_ip": "192.168.1.100",
  "dvr_username": "admin",
  "dvr_password": "1234",
  "channel_number": 101,
  "rtsp_url": "rtsp://admin:1234@192.168.1.100:554/Streaming/Channels/101"
}
```

**Response:**
```json
{
  "ok": true,
  "camera": {
    "id": "uuid-here",
    "camera_id": "192.168.1.100_101_1707382200000",
    "name": "Gate Camera",
    "dvr_ip": "192.168.1.100",
    "channel_number": 101,
    "rtsp_url": "rtsp://...",
    "connection_status": "online",
    "last_tested": "2026-02-04T10:30:00Z"
  },
  "message": "Camera \"Gate Camera\" registered successfully"
}
```

---

### 4. Get All Cameras

**Endpoint:** `GET /api/gate/cameras`

Returns list of all registered cameras.

**Response:**
```json
{
  "ok": true,
  "cameras": [
    {
      "id": "uuid-1",
      "name": "Gate Camera",
      "dvr_ip": "192.168.1.100",
      "channel_number": 101,
      "rtsp_url": "rtsp://...",
      "connection_status": "online",
      "last_tested": "2026-02-04T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

### 5. Get Single Camera

**Endpoint:** `GET /api/gate/cameras/:camera_id`

Returns details of a specific camera.

**Response:**
```json
{
  "ok": true,
  "camera": { ... }
}
```

---

### 6. Update Camera

**Endpoint:** `PUT /api/gate/cameras/:camera_id`

Updates camera configuration.

**Request Body:**
```json
{
  "name": "Updated Gate Camera",
  "channel_number": 102
}
```

---

### 7. Delete Camera

**Endpoint:** `DELETE /api/gate/cameras/:camera_id`

Removes camera from the system.

**Response:**
```json
{
  "ok": true,
  "message": "Camera deleted successfully"
}
```

---

### 8. Update Camera Status

**Endpoint:** `PUT /api/gate/cameras/:camera_id/status`

Updates connection status (used by heartbeat monitor).

**Request Body:**
```json
{
  "connection_status": "online",
  "last_tested": "2026-02-04T10:30:00Z"
}
```

---

## Frontend UI

### Camera Settings Page (`/camera`)

Located in: `src/pages/CameraSettings.tsx`

#### Features:

1. **Tab 1: Registered Cameras**
   - List of all registered cameras
   - Shows: Name, DVR IP, Channel, Status, Last Tested
   - Actions: Test connection, Delete camera
   - Status indicator: Green (online), Red (offline)

2. **Tab 2: Add New Camera**
   - Form fields:
     - Camera Name
     - DVR IP Address
     - Channel Number
     - Username
     - Password
   - Buttons:
     - Generate RTSP URL
     - Test Connection
     - Save Camera
   - Live snapshot preview after successful test

#### User Flow:

```
Admin enters DVR details
      ↓
Clicks "Generate RTSP URL"
      ↓
System generates: rtsp://user:pass@ip:554/Streaming/Channels/channel
      ↓
Clicks "Test Connection"
      ↓
System tests RTSP stream and shows snapshot
      ↓
Clicks "Save Camera"
      ↓
Camera stored in database
```

---

## Implementation Details

### RTSP URL Generation

Standard Hikvision/Dahua/generic DVR RTSP format:

```
rtsp://[username]:[password]@[dvr_ip]:[port]/Streaming/Channels/[channel_number]
```

- Default port: 554
- Channel numbering: 101, 102, 103... (channel 1, 2, 3...)

### Connection Testing

The test endpoint:
1. Validates RTSP URL format
2. Attempts to connect to the stream
3. Captures a frame if connection successful
4. Returns snapshot as base64 PNG data
5. Updates status in database

**Future Enhancement:** Integrate ffmpeg for actual frame capture:
```bash
ffmpeg -rtsp_transport tcp -i rtsp://... -vframes 1 -f image2 pipe:1
```

### Password Handling

- Stored encrypted in database
- Returned as `***` in list views (security)
- Not exposed via API responses

---

## Configuration

### Environment Variables

In `server/.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_key
EDGE_API_KEY=optional_api_key
PORT=4000
```

### CORS Configuration

Frontend (`http://localhost:8080`) communicates with backend (`http://localhost:4000`) via CORS-enabled routes.

---

## Usage Example

### Step 1: Navigate to CCTV Page

User clicks "CCTV" in sidebar → Goes to `/camera`

### Step 2: Click "Add New Camera" Tab

Form appears with fields:
- Camera Name: "Entrance Gate"
- DVR IP: "192.168.1.100"
- Username: "admin"
- Password: "password123"
- Channel: "101"

### Step 3: Generate RTSP URL

Click "Generate RTSP URL"

System generates: `rtsp://admin:password123@192.168.1.100:554/Streaming/Channels/101`

### Step 4: Test Connection

Click "Test Connection"

If successful:
- ✓ Shows green "Online" status
- Shows camera snapshot preview
- Status: "Connection test passed"

If failed:
- ✗ Shows error message
- User adjusts IP/credentials and tries again

### Step 5: Save Camera

Click "Save Camera" (enabled only after successful test)

Camera is now registered and appears in "Registered Cameras" tab.

### Ongoing: Monitor Cameras

Admin can:
- See list of all cameras
- Check connection status
- Test connection anytime
- Delete cameras

---

## Advanced Features (Future)

### 1. Video Stream Display

Embed live RTSP stream in web player:
```html
<video>
  <source src="rtsp://..." type="video/mp4">
</video>
```

Requires: RTSP-to-HLS transcoding (e.g., ffmpeg + HLS.js)

### 2. Automatic Health Checks

Periodic heartbeat to all cameras:
```javascript
// Every 60 seconds, test each camera's connection
setInterval(() => {
  cameras.forEach(cam => testConnection(cam.rtsp_url));
}, 60000);
```

### 3. Alert on Offline

When `connection_status` changes from "online" to "offline":
- Create alert in system
- Notify admin (push notification, email, SMS)
- Log event in audit trail

### 4. Multi-Camera Grid View

Display 4-camera grid layout showing live streams:
```
┌─────────────┬─────────────┐
│  Camera 1   │  Camera 2   │
├─────────────┼─────────────┤
│  Camera 3   │  Camera 4   │
└─────────────┴─────────────┘
```

### 5. Recording Integration

Store snapshots or video segments linked to vehicle entries.

---

## Troubleshooting

### Connection Fails

**Issue:** "Connection test failed"

**Solutions:**
1. Verify DVR IP is correct and on same network
2. Check firewall isn't blocking port 554
3. Verify username/password are correct
4. Try connecting to DVR admin panel with same credentials to confirm

### Wrong Channel Number

**Issue:** Can't see correct camera

**Solutions:**
1. DVR channel numbering usually starts at 101
2. Try 101, 102, 103... for first three channels
3. Some DVRs use 0-based indexing (01, 02, 03...)
4. Check DVR manual or admin panel to confirm channel numbers

### Password Issues

**Issue:** "Invalid credentials"

**Solutions:**
1. Reset DVR password from admin panel
2. Verify no special characters causing encoding issues
3. Try without password if DVR allows
4. Check if credentials work in DVR web interface first

---

## Security Considerations

1. **Passwords:** Stored encrypted, never exposed in responses
2. **RTSP URLs:** Contain credentials – handle carefully
3. **Network:** Local network only – not exposed to internet
4. **API Keys:** Optional EDGE_API_KEY for production
5. **Audit Logging:** All camera operations logged in audit trail

---

## Code Structure

```
Backend (Node.js)
  server/src/
    camera_routes.js        ← All camera endpoints
    index.js                ← Server setup, mounts routes
    audit_logger.js         ← Logs all operations

Frontend (React)
  src/
    pages/
      CameraSettings.tsx    ← Main CCTV interface
    hooks/
      useCameraManager.ts   ← API utility hook
    components/
      layout/
        DashboardLayout.tsx ← Sidebar with CCTV nav link

Database (Supabase)
  public.cameras            ← Camera records
  public.audit_logs         ← Operation logs
```

---

## Next Steps

1. **Migrate database:** Run `20260204_extend_cameras_dvr.sql` migration
2. **Start backend:** `npm run start` in `server/` directory
3. **Start frontend:** `npm run dev` in root directory
4. **Navigate to:** http://localhost:8080/camera
5. **Add first camera:** Fill form and test connection
6. **Monitor status:** Verify camera appears in list

---

## Support

For issues or questions:
1. Check Troubleshooting section above
2. Verify network connectivity to DVR
3. Check browser console for frontend errors
4. Check server logs for backend errors
5. Review audit logs for operation history

