# DVR/RTSP Camera Integration - Quick Setup

## ✅ What's Been Built

### 1. Database Schema
- ✅ Extended `cameras` table with DVR/RTSP fields
- Migration file: `supabase/migrations/20260204_extend_cameras_dvr.sql`

### 2. Backend API (Node.js/Express)
- ✅ `POST /api/gate/cameras/generate-rtsp` - Generate RTSP URL from DVR details
- ✅ `POST /api/gate/cameras/test` - Test RTSP connection and capture snapshot
- ✅ `POST /api/gate/cameras` - Register new camera
- ✅ `GET /api/gate/cameras` - List all cameras
- ✅ `GET /api/gate/cameras/:id` - Get single camera
- ✅ `PUT /api/gate/cameras/:id` - Update camera
- ✅ `DELETE /api/gate/cameras/:id` - Delete camera
- ✅ `PUT /api/gate/cameras/:id/status` - Update connection status

File: `server/src/camera_routes.js`

### 3. Frontend UI (React)
- ✅ Full CCTV camera management interface
- ✅ Add camera form with DVR details
- ✅ RTSP URL generation with preview
- ✅ Connection testing with snapshot preview
- ✅ Camera list with status indicators
- ✅ Test, Edit, Delete operations

File: `src/pages/CameraSettings.tsx`

### 4. Utilities
- ✅ Custom hook for camera management: `src/hooks/useCameraManager.ts`
- ✅ CCTV navigation link added to sidebar
- ✅ Route added: `/camera`

---

## 🚀 Quick Start

### Step 1: Apply Database Migration

The migration has been created: `supabase/migrations/20260204_extend_cameras_dvr.sql`

Run it in Supabase:
1. Go to Supabase dashboard
2. SQL Editor → Create New Query
3. Paste migration SQL
4. Run Query

Or use Supabase CLI:
```bash
supabase migration up
```

### Step 2: Ensure Backend is Running

```bash
cd server
npm install  # if needed
npm start
# Should start on http://localhost:4000
```

Check logs for: `listening on port 4000`

### Step 3: Ensure Frontend is Running

In another terminal:
```bash
npm run dev
# Should start on http://localhost:8080
```

### Step 4: Navigate to CCTV Interface

1. Open http://localhost:8080
2. Login
3. Click "CCTV" in left sidebar
4. You're now on the camera management page

---

## 📋 Adding Your First Camera

### Example: Hikvision DVR Setup

**Typical Hikvision DVR Details:**
- DVR IP: `192.168.1.100`
- Username: `admin`
- Password: `12345`
- Channel: `101` (for first camera)

### In the UI:

1. Click "Add New Camera" tab
2. Fill in form:
   - **Camera Name:** "Gate Camera"
   - **DVR IP:** "192.168.1.100"
   - **Username:** "admin"
   - **Password:** "12345"
   - **Channel Number:** "101"
3. Click **"Generate RTSP URL"**
   - Should show: `rtsp://admin:12345@192.168.1.100:554/Streaming/Channels/101`
4. Click **"Test Connection"**
   - If successful: Shows camera snapshot preview ✓
   - If failed: Check IP, username, password
5. Click **"Save Camera"** (only available after successful test)
6. Camera now appears in "Registered Cameras" tab

---

## 🔧 API Usage Examples

### Generate RTSP URL

```bash
curl -X POST http://localhost:4000/api/gate/cameras/generate-rtsp \
  -H "Content-Type: application/json" \
  -d '{
    "dvr_ip": "192.168.1.100",
    "dvr_username": "admin",
    "dvr_password": "12345",
    "channel_number": 101
  }'
```

**Response:**
```json
{
  "ok": true,
  "rtsp_url": "rtsp://admin:12345@192.168.1.100:554/Streaming/Channels/101"
}
```

### Test Connection

```bash
curl -X POST http://localhost:4000/api/gate/cameras/test \
  -H "Content-Type: application/json" \
  -d '{
    "rtsp_url": "rtsp://admin:12345@192.168.1.100:554/Streaming/Channels/101",
    "camera_name": "Gate Camera"
  }'
```

### Register Camera

```bash
curl -X POST http://localhost:4000/api/gate/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gate Camera",
    "dvr_ip": "192.168.1.100",
    "dvr_username": "admin",
    "dvr_password": "12345",
    "channel_number": 101,
    "rtsp_url": "rtsp://admin:12345@192.168.1.100:554/Streaming/Channels/101"
  }'
```

### List All Cameras

```bash
curl http://localhost:4000/api/gate/cameras
```

---

## 🎯 Common DVR Configurations

### Hikvision
- RTSP: `rtsp://user:pass@ip:554/Streaming/Channels/101`
- Default port: 554
- Channels: 101, 102, 103...

### Dahua
- RTSP: `rtsp://user:pass@ip:554/stream/ch1`
- Or: `rtsp://user:pass@ip:554/Streaming/Channels/101`

### Generic/Other
- Try: `rtsp://user:pass@ip:554/h264/ch1/main/av_stream`
- Or: `rtsp://user:pass@ip:554/Streaming/Channels/1`

**Tip:** Check your DVR's manual or web interface RTSP URLs

---

## 🐛 Troubleshooting

### "Connection test failed"

1. **Verify DVR is on network:**
   ```bash
   ping 192.168.1.100  # replace with your DVR IP
   ```

2. **Check credentials in DVR web interface first:**
   - Open `http://192.168.1.100` in browser
   - Try login with same username/password

3. **Verify port 554 is open:**
   ```bash
   telnet 192.168.1.100 554
   ```

4. **Check firewall:**
   - DVR might have firewall rules
   - Try disabling DVR firewall temporarily for testing

### "Invalid RTSP URL"

- Ensure format: `rtsp://username:password@ip:port/path`
- No spaces or special characters (unless URL-encoded)

### Camera appears as "Offline"

- DVR might be offline or unreachable
- Click "Test" button to refresh status
- Check network connectivity

---

## 📁 File Locations

| File | Purpose |
|------|---------|
| `supabase/migrations/20260204_extend_cameras_dvr.sql` | Database schema |
| `server/src/camera_routes.js` | Backend API endpoints |
| `src/pages/CameraSettings.tsx` | Frontend UI page |
| `src/hooks/useCameraManager.ts` | API utilities hook |
| `src/components/layout/DashboardLayout.tsx` | Sidebar with CCTV link |
| `DVR_RTSP_INTEGRATION.md` | Full documentation |

---

## 🔐 Security Notes

1. **Passwords:** Stored encrypted in database
2. **RTSP URLs:** Contain credentials – keep secure
3. **Network:** Local network only – not exposed to internet
4. **API:** Optional API key authentication available
5. **Audit:** All operations logged

---

## ✨ Next Features to Build

1. **Live Video Stream Player**
   - Embed RTSP stream in web interface
   - Real-time video feed from camera

2. **Automatic Health Checks**
   - Periodic connection testing
   - Alert on offline

3. **Snapshot Gallery**
   - Store snapshots linked to vehicle entries
   - Timeline view

4. **Multi-Camera Grid**
   - 2x2 or 3x3 grid layout
   - Watch multiple cameras simultaneously

5. **Recording Integration**
   - Store video segments
   - Playback with vehicle entry timeline

---

## 📞 Support

For detailed API documentation, see: **DVR_RTSP_INTEGRATION.md**

For questions or issues:
1. Check the troubleshooting section
2. Verify network connectivity
3. Review browser console errors
4. Check server logs
5. Check audit logs for operation history

---

**Status:** ✅ Ready to use
**Version:** 1.0
**Last Updated:** Feb 4, 2026
