# 🚀 Quick Start: ANPR Integration Deployment

Complete step-by-step guide to get CCTV/ANPR detection working within 30 minutes.

## ⚡ 5-Minute Backend Setup

### 1. Set Environment Variables

```bash
# In server/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-key-here
EDGE_API_KEY=sk-$(openssl rand -hex 16)
PORT=4000
```

### 2. Start Backend

```bash
cd server
npm install
npm start
# Listens on http://localhost:4000
```

### 3. Verify Backend is Ready

```bash
curl http://localhost:4000/api/camera/vehicle-entry \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"plate_number":"TEST","confidence":95}'
# Should return: { "ok": true, "entry": {...} }
```

---

## 🎥 10-Minute Camera Setup

### Option A: ANPR Camera (Native)

Camera has built-in ANPR → HTTP endpoint:

```
Camera admin panel:
  → Integrations → HTTP POST
  → URL: http://your-server:4000/api/camera/vehicle-entry
  → Auth header: x-api-key: sk-...
  → Payload format: plate_number, confidence, timestamp
```

### Option B: RTSP Camera + Edge Service

Camera has RTSP stream → Edge service does plate detection:

```bash
cd server/edge_anpr

# 1. Create environment
cp .env.example .env

# 2. Edit .env
nano .env
# ERM_API_URL=http://localhost:4000
# RTSP_URL=rtsp://192.168.1.100:554/stream
# ERM_API_KEY=sk-...  (same as backend)

# 3. Install dependencies
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Optional: Install OpenALPR for better accuracy
pip install openalpr-python

# 4. Run
python anpr_service.py
```

---

## 📊 15-Minute Dashboard Verification

### 1. Start Frontend

```bash
npm run dev
# Opens http://localhost:5173
```

### 2. Log in to Dashboard

```
Username: your-email@example.com
Password: your-password
```

### 3. Test Plate Detection

**Simulate a vehicle entry:**
```bash
curl -X POST http://localhost:4000/api/camera/vehicle-entry \
  -H "x-api-key: sk-..." \
  -H "Content-Type: application/json" \
  -d '{
    "plate_number": "ABC123",
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'",
    "camera_id": "CAM1",
    "confidence": 95
  }'
```

**Expected:** Dashboard updates instantly showing "ABC123" as inside.

---

## ✅ Complete Integration Checklist

- [ ] Backend running on port 4000
- [ ] `EDGE_API_KEY` matches between backend and edge service
- [ ] Camera configured to send events to `/api/camera/vehicle-entry`
- [ ] Or: Edge service running with RTSP camera configured
- [ ] Dashboard shows new entries in real-time
- [ ] Alerts trigger for violations (duplicate, after hours, etc.)
- [ ] Snapshot URL appears in vehicle card
- [ ] Exit button works (sets status to 'exited')

---

## 🔍 Debugging Checklist

### Backend won't start?
```bash
# Check port is available
lsof -i :4000  # Kill if needed: kill -9 <PID>

# Check environment variables
echo $SUPABASE_URL

# Check logs
npm start 2>&1 | tee server.log
```

### Edge service can't connect?
```bash
# Test camera connectivity
ffmpeg -rtsp_transport tcp -i rtsp://192.168.1.100:554/stream -vframes 1 test.jpg

# Test API connectivity
curl -X POST http://localhost:4000/api/camera/vehicle-entry \
  -H "x-api-key: sk-..." -d '{"plate_number":"TEST","confidence":95}'
```

### Dashboard not updating?
```bash
# Open browser console (F12)
console.log(supabase.getChannels())

# Should show: RealtimeChannelState { status: 'SUBSCRIBED' }
```

---

## 🎯 Production Deployment

### On Linux Server (systemd)

**1. Backend service:**
```bash
# Create /etc/systemd/system/kinamba-backend.service
[Unit]
Description=Kinamba Backend ERM API
After=network.target

[Service]
Type=simple
User=kinamba
WorkingDirectory=/opt/kinamba/server
Environment="NODE_ENV=production"
EnvironmentFile=/opt/kinamba/server/.env
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**2. Edge service:**
```bash
# Create /etc/systemd/system/kinamba-anpr.service
[Unit]
Description=Kinamba ANPR Detection Service
After=network.target

[Service]
Type=simple
User=kinamba
WorkingDirectory=/opt/kinamba/server/edge_anpr
Environment="PYTHONUNBUFFERED=1"
EnvironmentFile=/opt/kinamba/server/edge_anpr/.env
ExecStart=/usr/bin/python3 anpr_service.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Start services:**
```bash
sudo systemctl enable kinamba-backend kinamba-anpr
sudo systemctl start kinamba-backend kinamba-anpr
sudo systemctl status kinamba-backend kinamba-anpr
```

### With Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name api.kinamba.com;
    
    ssl_certificate /etc/letsencrypt/live/api.kinamba.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.kinamba.com/privkey.pem;
    
    location /api/camera/ {
        proxy_pass http://localhost:4000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header Connection "upgrade";
        proxy_http_version 1.1;
        
        # Rate limiting
        limit_req zone=camera burst=10 nodelay;
    }
}

# Rate limiting zone
limit_req_zone $remote_addr zone=camera:10m rate=5r/s;
```

---

## 📈 Performance Tuning

### High-Volume System (100+ entries/min)

**Backend:**
```javascript
// Add connection pooling
const { Pool } = require('pg');
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Edge service:**
```python
# Skip more frames to reduce CPU
# In anpr_service.py: change frame_skip from 10 to 20
```

**Database:**
```sql
-- Add indexes for fast lookups
CREATE INDEX idx_plate_status ON garage_entries(plate_number, status);
CREATE INDEX idx_entry_time ON garage_entries(entry_time DESC);
```

---

## 🔐 Security Hardening

### 1. Use Strong API Keys
```bash
# Generate 32-byte key
openssl rand -hex 32
# Result: 5f8a3c2d1b6e9f4a7c2e5d8b1a4f7c2e
```

### 2. Network Isolation
```bash
# Only allow camera IP to access API
sudo ufw allow from 192.168.1.100 to any port 4000
sudo ufw deny to any port 4000
```

### 3. HTTPS Certificates
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d api.kinamba.com
```

### 4. Monitor API Keys
```bash
# Log all API requests
grep "POST /api/camera" /var/log/nginx/access.log | tail -20
```

---

## 📊 Monitoring & Alerts

### Health Check Endpoint (Optional)

Add to backend:
```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});
```

Monitor with:
```bash
watch -n 5 "curl -s http://localhost:4000/api/health | jq"
```

### Log Aggregation

Send logs to centralized system:
```javascript
const winston = require('winston');
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'kinamba.log' })
  ]
});

logger.info('Vehicle entry detected', { plate: 'ABC123' });
```

---

## 🐛 Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| "API key invalid" | Verify `EDGE_API_KEY` matches between backend and edge service |
| "RTSP connection refused" | Check camera IP, verify network accessibility |
| "Low confidence" entries rejected | Increase `CONFIDENCE_THRESHOLD` to 75 (less strict) or improve camera quality |
| "Duplicate entry" alerts | This is expected—same vehicle entering multiple times |
| "Database connection timeout" | Check Supabase status, verify service role key, check network |
| Dashboard shows old data | Refresh page, check browser console for errors |

---

## 🎓 Understanding the Data Flow

### Real Example: Vehicle ABC123 Enters

```
1. Camera detects "ABC123" at 10:42 AM, confidence 98%
   
2. Sends POST to http://localhost:4000/api/camera/vehicle-entry
   {
     "plate_number": "ABC123",
     "timestamp": "2026-02-03T10:42:00Z",
     "confidence": 98,
     "camera_id": "CAM1"
   }

3. Backend validates:
   ✓ Confidence 98% >= 85%
   ✓ Not already inside
   ✓ Capacity not exceeded
   ✓ Within operating hours
   
4. Inserts into database:
   - garage_entries: status='inside'
   - audit_logs: action='VEHICLE_ENTRY'
   
5. Checks garage capacity:
   If >= limit: creates alert type='capacity_warning'
   
6. Returns success response with entry & alerts
   
7. Supabase broadcasts real-time update
   
8. Dashboard subscribes to change, updates instantly:
   - Shows "ABC123" as inside
   - Displays any alerts
   - Shows snapshot if available
   
9. Admin can approve entry (changes status to 'approved')
   
10. When vehicle exits, sends another event with different camera or manual exit
```

---

## 📞 Need Help?

1. **Check logs:** `tail -f server.log` and `tail -f anpr_service.log`
2. **Test API directly:** Use provided curl commands
3. **Check real-time:** Open browser console, verify Supabase connection
4. **Review database:** Use Supabase dashboard to check garage_entries table
5. **Verify camera:** Test RTSP stream with ffmpeg or VLC

---

**Ready to deploy?** Follow the checklist above in order. Should take 30 minutes total.
