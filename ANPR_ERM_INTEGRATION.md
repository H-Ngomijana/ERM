# KINAMBA CCTV/ANPR → ERM → Alerts Integration

Complete full-stack implementation for automatic vehicle entry detection and real-time garage management.

## 🏗️ System Architecture

```
CCTV Camera (ANPR-capable or + Edge Service)
    ↓ RTSP/HTTP
Edge ANPR Service (Python)
    ↓ POST /api/camera/vehicle-entry
ERM Backend API (Node.js)
    ↓ Rules Engine + Database
Supabase Database
    ├→ garage_entries
    ├→ audit_logs
    ├→ alerts
    └→ garage_settings
    ↓ Real-time Subscriptions
Admin Dashboard (React)
    └→ Live vehicle status + alerts
```

---

## 📋 API Endpoint

### `POST /api/camera/vehicle-entry`

Receives vehicle entry events from camera/ANPR system.

**URL:** `{ERM_API_URL}/api/camera/vehicle-entry`

**Authentication:** 
- Header: `x-api-key: {EDGE_API_KEY}`
- Or query param: `?api_key={EDGE_API_KEY}`

**Request Body:**
```json
{
  "plate_number": "ABC123",
  "timestamp": "2026-02-03T10:42:11Z",
  "camera_id": "CAM1",
  "image_url": "https://cdn.example.com/snapshot.jpg",
  "confidence": 95
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plate_number` | string | ✅ | Vehicle license plate (uppercase) |
| `timestamp` | ISO 8601 | ❌ | Event time (defaults to server time) |
| `camera_id` | string | ❌ | Camera identifier for tracking |
| `image_url` | string | ❌ | Snapshot/evidence URL |
| `confidence` | number (0-100) | ❌ | OCR confidence score |

**Response (Success - 200):**
```json
{
  "ok": true,
  "entry": {
    "id": "uuid-here",
    "plate_number": "ABC123",
    "entry_time": "2026-02-03T10:42:11Z",
    "status": "inside",
    "camera_id": "CAM1",
    "snapshot_url": "https://cdn.example.com/snapshot.jpg",
    "created_at": "2026-02-03T10:42:11Z"
  },
  "alerts": [
    {
      "type": "after_hours",
      "severity": "warning",
      "message": "Entry detected after operating hours for ABC123"
    }
  ]
}
```

**Response (Validation Failure - 400/422):**
```json
{
  "error": "Low confidence",
  "confidence": 78
}
```

---

## 🔍 ERM Rules Engine

### Rules Applied on Every Entry

| Rule | Condition | Action | Alert Type |
|------|-----------|--------|-----------|
| **Confidence** | < 85% | Reject entry | - |
| **Duplicate** | Plate already inside | Log anomaly | `duplicate_entry` |
| **Capacity** | Occupancy >= limit | Log warning | `capacity_warning` |
| **Hours** | Outside operating hours | Log entry | `after_hours` |
| **Unknown** | Plate not linked to client | Flag | `unknown_plate` |

### Processing Flow

```
1. Validate plate & confidence
   ↓
2. Check if already inside (duplicate)
   ↓
3. Check garage capacity
   ↓
4. Check operating hours
   ↓
5. Insert garage_entry record
   ↓
6. Create audit log
   ↓
7. Generate alerts (if triggered)
   ↓
8. Real-time push (dashboard updates)
```

---

## 🐍 Edge ANPR Service (Python)

### Installation

```bash
cd server/edge_anpr

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Optional: Install OpenALPR for better accuracy
# pip install openalpr-python
```

### Configuration

Create `.env` file:
```env
ERM_API_URL=http://localhost:4000
ERM_API_KEY=your-secure-api-key-here
CAMERA_ID=CAM1
RTSP_URL=rtsp://192.168.1.100:554/stream
CONFIDENCE_THRESHOLD=85
```

### Running the Service

```bash
# Basic usage
python anpr_service.py

# With custom camera
python anpr_service.py --camera-url rtsp://192.168.1.50:554/stream --camera-id CAM2 --api-key secret-key

# Daemon mode (Linux/Mac)
nohup python anpr_service.py > anpr_service.log 2>&1 &
```

### Features

- **RTSP Stream Capture** - Connects to IP cameras via RTSP
- **Frame Processing** - Optimized every 10th frame to reduce CPU
- **Plate Detection** - Uses OpenALPR (or OpenCV fallback)
- **Deduplication** - Won't send same plate twice within 5 seconds
- **Snapshot Save** - Saves matching frames locally
- **Error Handling** - Auto-reconnects on disconnection

### Hardware Requirements

| Component | Recommended |
|-----------|-------------|
| CPU | 2+ cores |
| RAM | 2GB+ |
| Network | 1Mbps+ to ERM server |
| Storage | 10GB+ for snapshots |

### OpenALPR Setup (Linux)

```bash
sudo apt-get install openalpr openalpr-daemon

# Test
alpr -c us /path/to/image.jpg
```

For Docker:
```bash
docker run -v /your/path:/data \
  -e ERM_API_URL=http://host.docker.internal:4000 \
  -e RTSP_URL=rtsp://camera-ip:554/stream \
  openalpr/openalpr
```

---

## 🛠️ Backend Setup

### Environment Variables

```env
# Server
PORT=4000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
EDGE_API_KEY=your-secure-api-key-must-match-edge-service
```

### Database Schema

The system uses these tables (auto-created by migrations):

#### `garage_entries`
```sql
CREATE TABLE public.garage_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id),
  status TEXT DEFAULT 'inside',  -- inside, in_service, awaiting_approval, ready, exited
  entry_time TIMESTAMP,
  exit_time TIMESTAMP,
  camera_id TEXT,
  snapshot_url TEXT,
  notes JSONB,  -- Can store confidence, source, etc.
  created_at TIMESTAMP DEFAULT now()
);
```

#### `alerts`
```sql
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_entry_id UUID REFERENCES public.garage_entries(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  type TEXT,  -- duplicate_entry, capacity_warning, after_hours, etc.
  severity TEXT,  -- info, warning, critical
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
```

#### `audit_logs`
```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT,  -- VEHICLE_ENTRY, VEHICLE_ENTRY_FAILED, etc.
  actor_id UUID REFERENCES auth.users(id),
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### Running Backend

```bash
cd server

# Install dependencies
npm install

# Start (dev)
npm start

# Production
NODE_ENV=production npm start
```

Server runs on `http://localhost:4000`

---

## 🎨 Frontend Dashboard

### Real-time Features

The dashboard automatically updates via Supabase real-time subscriptions:

- **Live Occupancy** - Updates as vehicles enter/exit
- **Instant Alerts** - New alerts appear immediately
- **Entry Feed** - Fresh entries show instantly
- **Status Updates** - Approval/exit status changes in real-time

### UI Components

```tsx
// Dashboard shows:
- Current occupancy vs capacity
- Active vehicle entries with snapshots
- Real-time alerts (color-coded by severity)
- "Ready for Exit" vehicles
- Pending approvals
```

### Customization

Edit `src/pages/Dashboard.tsx` to:
- Change update frequency
- Add custom filters
- Modify alert display
- Add vehicle details modal

---

## 🔒 Security

### API Key Management

1. **Generate strong API key:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Store in environment variables** (not hardcoded)

3. **Rotate periodically** (e.g., quarterly)

### HTTPS Enforcement

Always use HTTPS in production:
```bash
# Use reverse proxy (Nginx)
server {
  listen 443 ssl;
  location /api/camera {
    proxy_pass http://localhost:4000;
  }
}
```

### Rate Limiting (Optional)

Add to backend for DoS protection:
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100  // 100 requests per minute per IP
});
app.use('/api/camera/', limiter);
```

### IP Whitelisting

Only allow known camera IPs:
```javascript
const ALLOWED_IPS = ['192.168.1.100', '10.0.0.50'];
app.use((req, res, next) => {
  if (!ALLOWED_IPS.includes(req.ip)) {
    return res.status(403).json({ error: 'IP not whitelisted' });
  }
  next();
});
```

---

## 📊 Monitoring & Debugging

### Logs to Check

**Backend logs:**
```bash
tail -f nohup.out  # Or check PM2 logs if using PM2
```

**Edge service logs:**
```bash
tail -f anpr_service.log
```

**Browser console** (frontend):
```javascript
// Check real-time subscription status
console.log(supabase.getChannels())
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Edge service can't reach ERM | Check `ERM_API_URL`, network connectivity, firewall |
| Camera stream fails | Verify RTSP URL, camera is online, network accessible |
| Low plate confidence | Adjust `CONFIDENCE_THRESHOLD`, improve camera focus/lighting |
| Database inserts fail | Check Supabase RLS policies, service role key permissions |
| Dashboard not updating | Verify Supabase real-time enabled, check browser network tab |

### Testing the Integration

**Test camera event manually:**
```bash
curl -X POST http://localhost:4000/api/camera/vehicle-entry \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "plate_number": "TEST123",
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'",
    "camera_id": "CAM1",
    "confidence": 95
  }'
```

Expected response:
```json
{
  "ok": true,
  "entry": { ... },
  "alerts": [ ... ]
}
```

---

## 📈 Performance Tips

### Backend Optimization

- Use connection pooling for database
- Add caching for garage settings (rarely changes)
- Archive old audit logs monthly

### Edge Service Optimization

- Reduce frame resolution if CPU is high
- Increase frame skip (every 15th instead of 10th)
- Use GPU acceleration (CUDA) if available
- Run multiple instances per camera for larger areas

### Database Optimization

- Index on `plate_number` and `status`
- Partition `audit_logs` by month
- Archive entries older than 6 months

---

## 🚀 Deployment Checklist

- [ ] Set secure `EDGE_API_KEY`
- [ ] Configure Supabase service role key
- [ ] Enable RLS policies on database tables
- [ ] Test API endpoint with curl
- [ ] Run edge service in background (PM2/systemd)
- [ ] Configure camera RTSP credentials
- [ ] Set up HTTPS reverse proxy
- [ ] Test real-time updates in dashboard
- [ ] Set up monitoring/alerting
- [ ] Document camera/service IPs in wiki
- [ ] Create backup procedure for snapshots
- [ ] Test disaster recovery

---

## 📞 Support & Troubleshooting

For issues:

1. Check backend logs for errors
2. Verify camera connectivity
3. Test API endpoint manually
4. Check Supabase schema and RLS policies
5. Verify real-time subscriptions in browser console
6. Check network connectivity between all components

---

## 🔄 Future Enhancements

- [ ] Machine learning for better plate detection accuracy
- [ ] Multi-camera support with load balancing
- [ ] Vehicle color/make/model detection
- [ ] Facial recognition for driver identification
- [ ] Mobile app notifications
- [ ] Video evidence clips storage
- [ ] Dashboard heatmaps (peak times/areas)
- [ ] Integration with external parking systems

---

**Last Updated:** February 4, 2026  
**Version:** 1.0 - Full Stack Implementation
