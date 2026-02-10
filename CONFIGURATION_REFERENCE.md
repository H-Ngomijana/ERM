# ⚙️ Configuration Reference

Quick reference for all environment variables and configuration options.

---

## 🔧 Backend Configuration

### Required Variables (`server/.env`)

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-128-char-key...

# Server
PORT=4000
NODE_ENV=development  # or production

# API Security
EDGE_API_KEY=sk-your-secure-32-hex-char-key-here
```

### How to Get Variables

**SUPABASE_URL:**
```
Go to: https://app.supabase.com/project/[project-ref]/settings/api
Copy: Project URL
Example: https://eabjzlqvmrkrjlzojkxm.supabase.co
```

**SUPABASE_SERVICE_ROLE_KEY:**
```
Go to: https://app.supabase.com/project/[project-ref]/settings/api
Copy: Service Role Key (under "Project API keys")
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**EDGE_API_KEY (generate):**
```bash
# Option 1: OpenSSL
openssl rand -hex 32
# Output: 5f8a3c2d1b6e9f4a7c2e5d8b1a4f7c2e9d3b2a1f8e7d6c5b4a3f2e1d0c9b8a7

# Option 2: Node.js
node -e "console.log('sk-' + require('crypto').randomBytes(32).toString('hex'))"
# Output: sk-5f8a3c2d1b6e9f4a7c2e5d8b1a4f7c2e9d3b2a1f8e7d6c5b4a3f2e1d0c9b8a7
```

### Optional Variables

```bash
# Logging
LOG_LEVEL=info                    # debug, info, warn, error
LOG_FILE=kinamba.log              # Optional: file logging

# Database
DATABASE_POOL_SIZE=20             # Connection pool size
CONNECTION_TIMEOUT=5000           # Milliseconds

# Alerts
ALERT_WEBHOOK_URL=https://...     # Optional: send alerts to Slack/Teams
ALERT_EMAIL_RECIPIENTS=...        # Optional: email alerts to admin

# Camera
ALLOWED_CAMERA_IPS=192.168.1.*    # Optional: IP whitelist
MAX_SNAPSHOT_SIZE=10485760        # 10MB in bytes
```

### Verification

```bash
# Check variables are set
grep -E 'SUPABASE|EDGE_API_KEY|PORT' server/.env

# Test Supabase connection
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  $SUPABASE_URL/rest/v1/garage_entries?limit=1
```

---

## 🎥 Edge Service Configuration

### Required Variables (`server/edge_anpr/.env`)

```bash
# Backend API
ERM_API_URL=http://localhost:4000        # Backend server URL
ERM_API_KEY=sk-same-as-backend-key       # Must match EDGE_API_KEY

# Camera
CAMERA_ID=CAM1                           # Camera identifier
RTSP_URL=rtsp://192.168.1.100:554/stream # Camera stream

# Detection
CONFIDENCE_THRESHOLD=85                  # Minimum confidence %
```

### Optional Variables

```bash
# Camera Authentication
RTSP_USERNAME=admin                      # If camera requires auth
RTSP_PASSWORD=password123               # If camera requires auth

# Processing
FRAME_SKIP=10                           # Process every nth frame (lower = faster but higher CPU)
FRAME_RESIZE_WIDTH=320                  # Resize for processing
FRAME_RESIZE_HEIGHT=240                 # Lower = faster

# Deduplication
DEDUP_WINDOW=5                          # Don't send same plate within N seconds
DEDUP_CONFIDENCE=90                     # Min confidence to accept duplicate

# Storage
SNAPSHOT_DIR=./snapshots                # Where to save snapshots
MAX_SNAPSHOTS=1000                      # Keep only latest N snapshots

# Logging
LOG_LEVEL=INFO                          # DEBUG, INFO, WARNING, ERROR
LOG_FILE=anpr_service.log              # Log file path

# Retry
RETRY_INTERVAL=5                        # Seconds between connection retries
MAX_RETRIES=10                          # Max retries before giving up
```

### Common RTSP URLs

```bash
# Hikvision
rtsp://admin:password@192.168.1.100:554/stream

# Axis
rtsp://admin:password@192.168.1.100:554/axis-media/media.amp

# Dahua
rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1

# Generic/Unknown
rtsp://192.168.1.100:554/stream
rtsp://192.168.1.100:8554/stream
rtsp://192.168.1.100:554/live0
```

### How to Find RTSP URL

1. **Check camera documentation** - Manual usually lists RTSP URL
2. **Try common defaults:**
   - rtsp://ip:554/stream
   - rtsp://ip:554/live0
   - rtsp://ip:8554/stream
3. **Use ONVIF discovery:**
   ```bash
   # Use nmap or ONVIF viewer to find cameras
   nmap -p 554,8554,8080 192.168.1.0/24
   ```
4. **Test with ffmpeg:**
   ```bash
   ffmpeg -i rtsp://192.168.1.100:554/stream -vframes 1 test.jpg
   # If works, that's the correct URL
   ```

### Verification

```bash
# Test camera connectivity
python3 -c "
import cv2
cap = cv2.VideoCapture('rtsp://192.168.1.100:554/stream')
ret, frame = cap.read()
if ret:
    print('SUCCESS: Camera connected')
else:
    print('FAILED: Cannot read from camera')
cap.release()
"

# Test API connectivity
curl -X POST http://localhost:4000/api/camera/vehicle-entry \
  -H "x-api-key: $ERM_API_KEY" \
  -d '{"plate_number":"TEST","confidence":95}'
```

---

## 📊 Database Configuration

### Table Creation

These tables are created automatically (migrations applied):

```sql
-- Check tables exist
\dt garage_entries alerts audit_logs garage_settings vehicles

-- If missing, run migrations in Supabase dashboard
```

### Important Settings Table

```sql
-- Check current settings
SELECT * FROM garage_settings LIMIT 1;

-- Update capacity
UPDATE garage_settings SET capacity = 25 WHERE name = 'Main Garage';

-- Update hours
UPDATE garage_settings 
SET operating_hours = jsonb_build_object(
  'start_time', '06:00',
  'end_time', '22:00',
  'closed_days', '["Sunday"]'::jsonb
);
```

### Indexing

```sql
-- Create performance indexes (optional if not auto-created)
CREATE INDEX IF NOT EXISTS idx_plate_status 
  ON garage_entries(plate_number, status);

CREATE INDEX IF NOT EXISTS idx_entry_time 
  ON garage_entries(entry_time DESC);

CREATE INDEX IF NOT EXISTS idx_alert_type 
  ON alerts(type);

-- Verify indexes exist
SELECT indexname FROM pg_indexes WHERE tablename='garage_entries';
```

---

## 🔐 Security Configuration

### API Key Management

```bash
# Generate production key (32 bytes = 64 hex chars)
openssl rand -hex 32

# Store in backend .env
echo "EDGE_API_KEY=sk-$(openssl rand -hex 32)" >> server/.env

# Share with edge service
cp server/.env server/edge_anpr/.env
# Then edit edge service .env to match
```

### HTTPS Setup (Production)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d api.kinamba.com

# Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/kinamba

# Add SSL section
server {
    listen 443 ssl http2;
    server_name api.kinamba.com;
    
    ssl_certificate /etc/letsencrypt/live/api.kinamba.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.kinamba.com/privkey.pem;
    
    location /api/camera/ {
        proxy_pass http://localhost:4000;
    }
}

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Rate Limiting (Optional)

```bash
# Add to Nginx config
limit_req_zone $remote_addr zone=camera:10m rate=10r/s;

location /api/camera/ {
    limit_req zone=camera burst=20 nodelay;
    proxy_pass http://localhost:4000;
}
```

### IP Whitelisting (Optional)

```bash
# Only allow known camera IPs
sudo ufw allow from 192.168.1.100 to any port 4000
sudo ufw allow from 192.168.1.200 to any port 4000
sudo ufw deny to any port 4000

# Verify rules
sudo ufw status numbered
```

---

## 🎨 Frontend Configuration

### Environment Variables (`src/.env`)

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...

# API
VITE_API_URL=http://localhost:4000
VITE_ENVIRONMENT=development  # or production

# Optional
VITE_DISABLE_AUTH=false       # For demo/dev only
```

### How to Get Anon Key

```
Go to: https://app.supabase.com/project/[project-ref]/settings/api
Copy: Anon Public Key
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Build Configuration

```bash
# Development
npm run dev        # Hot reload, Vite server on port 5173

# Production build
npm run build      # Creates dist/ folder
npm run preview    # Test production build locally

# Production deployment
npm run build
# Deploy dist/ to web server (Nginx, Vercel, etc)
```

---

## 📋 Docker Configuration (Optional)

### Backend Docker

```dockerfile
# Dockerfile.backend
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/src ./src
EXPOSE 4000
CMD ["node", "src/index.js"]
```

```bash
# Build and run
docker build -f Dockerfile.backend -t kinamba-backend .
docker run -e SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=... -p 4000:4000 kinamba-backend
```

### Edge Service Docker

```dockerfile
# Dockerfile.edge
FROM python:3.9-slim
WORKDIR /app
RUN apt-get update && apt-get install -y \
    libopencv-dev python3-opencv openalpr
COPY server/edge_anpr/requirements.txt .
RUN pip install -r requirements.txt
COPY server/edge_anpr/ .
CMD ["python", "anpr_service.py"]
```

```bash
# Build and run
docker build -f Dockerfile.edge -t kinamba-edge .
docker run -e RTSP_URL=... -e ERM_API_URL=... -e ERM_API_KEY=... kinamba-edge
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      EDGE_API_KEY: ${EDGE_API_KEY}
    ports:
      - "4000:4000"
    
  edge:
    build:
      context: .
      dockerfile: Dockerfile.edge
    environment:
      RTSP_URL: ${RTSP_URL}
      ERM_API_URL: http://backend:4000
      ERM_API_KEY: ${EDGE_API_KEY}
    depends_on:
      - backend

volumes:
  snapshots:
    driver: local
```

```bash
# Run with Docker Compose
docker-compose up -d
docker-compose logs -f
```

---

## 🔄 Systemd Service Configuration (Linux)

### Backend Service

```bash
# Create /etc/systemd/system/kinamba-backend.service
[Unit]
Description=Kinamba Backend API
After=network.target

[Service]
Type=simple
User=kinamba
WorkingDirectory=/opt/kinamba/server
Environment="NODE_ENV=production"
EnvironmentFile=/opt/kinamba/server/.env
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/kinamba-backend.log
StandardError=append:/var/log/kinamba-backend.log

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable kinamba-backend
sudo systemctl start kinamba-backend
```

### Edge Service

```bash
# Create /etc/systemd/system/kinamba-edge.service
[Unit]
Description=Kinamba ANPR Service
After=network.target

[Service]
Type=simple
User=kinamba
WorkingDirectory=/opt/kinamba/server/edge_anpr
EnvironmentFile=/opt/kinamba/server/edge_anpr/.env
ExecStart=/usr/bin/python3 anpr_service.py
Restart=always
RestartSec=10
StandardOutput=append:/var/log/kinamba-edge.log
StandardError=append:/var/log/kinamba-edge.log

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable kinamba-edge
sudo systemctl start kinamba-edge
```

### Monitoring

```bash
# Check status
sudo systemctl status kinamba-backend kinamba-edge

# View logs
sudo journalctl -u kinamba-backend -f
sudo journalctl -u kinamba-edge -f

# Restart services
sudo systemctl restart kinamba-backend kinamba-edge
```

---

## 📈 Performance Tuning

### Backend Optimization

```javascript
// In server/src/index.js

// Increase connection pool
const pool = new Pool({
  max: 30,  // From default 10
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Add response compression
const compression = require('compression');
app.use(compression());

// Add request timeout
app.use(timeout('10s'));
```

### Edge Service Optimization

```python
# In server/edge_anpr/anpr_service.py

# Reduce processing frequency
FRAME_SKIP = 20  # Was 10

# Lower resolution
FRAME_WIDTH = 320  # Was 640
FRAME_HEIGHT = 240  # Was 480

# Batch requests
BATCH_SIZE = 5  # Send 5 plates per request

# Use GPU if available
import cv2
if cv2.cuda.getCudaEnabledDeviceCount() > 0:
    USE_GPU = True
```

### Database Optimization

```sql
-- Add query caching
ALTER TABLE garage_entries SET (fillfactor = 70);

-- Archive old records
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '6 months';

-- Vacuum
VACUUM ANALYZE garage_entries;
```

---

## 📞 Configuration Verification

### Checklist

```bash
# 1. Backend environment
grep -E 'SUPABASE|EDGE_API_KEY|PORT' server/.env | wc -l
# Should output: 3 (all variables set)

# 2. Edge service environment
grep -E 'ERM_API_URL|ERM_API_KEY|RTSP_URL' server/edge_anpr/.env | wc -l
# Should output: 3 (all variables set)

# 3. API keys match
BACKEND_KEY=$(grep EDGE_API_KEY server/.env | cut -d'=' -f2)
EDGE_KEY=$(grep ERM_API_KEY server/edge_anpr/.env | cut -d'=' -f2)
if [ "$BACKEND_KEY" = "$EDGE_KEY" ]; then echo "✓ Keys match"; else echo "✗ Keys mismatch"; fi

# 4. Backend responds
curl -s http://localhost:4000/api/camera/vehicle-entry -H "x-api-key: test" | jq . > /dev/null && echo "✓ Backend OK"

# 5. Camera accessible
ffmpeg -i rtsp://your-camera-ip:554/stream -vframes 1 test.jpg > /dev/null 2>&1 && echo "✓ Camera OK"

# 6. Supabase connection
psql "postgresql://postgres:password@db.supabase.co:6543/postgres" -c "SELECT version();" && echo "✓ Database OK"
```

---

**Version:** 1.0  
**Last Updated:** February 4, 2026
