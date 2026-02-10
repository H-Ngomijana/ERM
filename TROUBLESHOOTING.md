# 🔧 Troubleshooting Guide: ANPR/ERM Integration

Comprehensive debugging guide for common issues and solutions.

---

## 🚨 Critical Issues

### Backend Won't Start

**Symptoms:** `npm start` crashes immediately

**Diagnosis:**
```bash
# Check for port conflict
lsof -i :4000
# If in use: kill -9 <PID>

# Check Node version
node --version  # Should be 16+

# Check syntax errors
node server/src/index.js
```

**Solutions:**

1. **Port 4000 in use**
   ```bash
   # Find process using port
   netstat -ano | findstr :4000  # Windows
   lsof -i :4000  # Mac/Linux
   
   # Kill it
   taskkill /PID <PID> /F  # Windows
   kill -9 <PID>  # Mac/Linux
   ```

2. **Missing dependencies**
   ```bash
   cd server
   npm install --force
   npm start
   ```

3. **Missing environment variables**
   ```bash
   # Verify .env exists and has:
   cat server/.env | grep -E 'SUPABASE|EDGE_API_KEY|PORT'
   
   # If missing, add them:
   echo "EDGE_API_KEY=sk-your-key" >> server/.env
   ```

4. **Supabase connection fails**
   ```bash
   # Test Supabase connectivity
   curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     https://your-project.supabase.co/rest/v1/garage_entries?limit=1
   
   # If fails: verify credentials are correct
   ```

---

### Edge Service Can't Connect to Camera

**Symptoms:** "Failed to connect to RTSP camera" in logs

**Diagnosis:**
```bash
# Test RTSP connectivity
ffmpeg -rtsp_transport tcp -i rtsp://192.168.1.100:554/stream -vframes 1 test.jpg

# Test with nc
nc -zv 192.168.1.100 554
```

**Solutions:**

1. **Wrong RTSP URL**
   ```bash
   # Common formats:
   rtsp://192.168.1.100:554/stream
   rtsp://admin:password@192.168.1.100:554/stream
   rtsp://192.168.1.100:554/live0
   rtsp://192.168.1.100:554/cam1
   
   # Find correct URL from camera manual or web UI
   ```

2. **Camera firewall blocking**
   ```bash
   # On camera network, try different ports
   for port in 554 8554 8080; do
     echo "Testing port $port..."
     nc -zv 192.168.1.100 $port
   done
   ```

3. **Authentication required**
   ```python
   # In anpr_service.py, modify VideoCapture:
   cap = cv2.VideoCapture('rtsp://admin:password@192.168.1.100:554/stream')
   ```

4. **Network isolation**
   ```bash
   # If server can't reach camera, check routing:
   ping 192.168.1.100
   traceroute 192.168.1.100  # May need mtr package
   
   # Check firewall allows connection
   sudo ufw allow from $(hostname -I) to 192.168.1.100 port 554
   ```

---

### Edge Service Can't Reach Backend API

**Symptoms:** "Connection refused" or timeout when sending to ERM API

**Diagnosis:**
```bash
# Test connectivity from edge service machine
curl -X POST http://localhost:4000/api/camera/vehicle-entry \
  -H "x-api-key: sk-..." \
  -H "Content-Type: application/json" \
  -d '{"plate_number":"TEST","confidence":95}'

# If that works, test from remote:
curl -X POST http://<backend-ip>:4000/api/camera/vehicle-entry \
  -H "x-api-key: sk-..." \
  -d '{"plate_number":"TEST","confidence":95}'
```

**Solutions:**

1. **Wrong ERM_API_URL**
   ```bash
   # Check .env
   cat server/edge_anpr/.env | grep ERM_API_URL
   
   # Should match your backend server
   # If local: http://localhost:4000
   # If remote: http://192.168.1.50:4000 or https://api.kinamba.com
   ```

2. **Backend not running**
   ```bash
   # Start backend first:
   cd server && npm start
   
   # Verify it's responding:
   curl http://localhost:4000/api/camera/vehicle-entry
   # Should NOT crash with 404 or 403
   ```

3. **API key mismatch**
   ```bash
   # Verify they match:
   echo "Backend key:"
   grep EDGE_API_KEY server/.env
   echo "Edge key:"
   grep ERM_API_KEY server/edge_anpr/.env
   
   # They must be identical!
   ```

4. **Firewall blocking port 4000**
   ```bash
   # Check if port is accessible
   telnet 192.168.1.50 4000  # Or: nc -zv 192.168.1.50 4000
   
   # If blocked, open firewall:
   sudo ufw allow 4000/tcp
   ```

5. **HTTPS certificate error**
   ```python
   # If using HTTPS URL with self-signed cert, add to anpr_service.py:
   import urllib3
   urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
   
   response = requests.post(
       ERM_API_URL + '/api/camera/vehicle-entry',
       json=payload,
       headers=headers,
       verify=False  # Only for dev!
   )
   ```

---

## ⚠️ API Issues

### "Low Confidence" Plates Rejected

**Symptoms:** Plates being rejected with "Confidence too low"

**Analysis:**
```bash
# Check current threshold
grep CONFIDENCE_THRESHOLD server/edge_anpr/.env
# Default: 85%

# Check what confidence is actually being detected
# Look in anpr_service.log for detected plates
tail -f anpr_service.log | grep -i confidence
```

**Solutions:**

1. **Lower confidence threshold**
   ```bash
   # Edit server/edge_anpr/.env
   CONFIDENCE_THRESHOLD=75  # Less strict
   
   # Restart service
   ```

2. **Improve camera focus/lighting**
   - Move camera closer to plates
   - Ensure good lighting (no glare, no shadows)
   - Focus camera on clear plate area
   - Clean camera lens

3. **Use better plate recognition**
   ```bash
   # Install OpenALPR for better accuracy:
   pip install openalpr-python
   
   # Check anpr_service.py uses OpenALPR:
   grep "openalpr" anpr_service.py
   ```

---

### "Duplicate Entry" Alerts

**Symptoms:** Same plate enters again, gets "already inside" error

**This is expected behavior!** But solutions:

1. **Vehicle legitimately exits then re-enters**
   - Exit the vehicle manually in dashboard
   - Then it can re-enter

2. **False duplicate (camera glitch)**
   - Check 5-second deduplication in edge service
   - Might be same plate detected 2x very quickly
   - Adjust deduplication window in anpr_service.py:
     ```python
     DEDUP_WINDOW = 5  # seconds, increase to 10
     ```

3. **Check what's in database**
   ```sql
   -- Check existing entries
   SELECT plate_number, status, entry_time 
   FROM garage_entries 
   WHERE plate_number = 'ABC123'
   ORDER BY entry_time DESC
   LIMIT 5;
   
   -- If status='inside', vehicle thinks it's still here
   -- Update status to 'exited':
   UPDATE garage_entries 
   SET status='exited', exit_time=NOW()
   WHERE plate_number='ABC123' AND status='inside';
   ```

---

### "After Hours" Entries

**Symptoms:** Plates entering outside business hours get warnings

**Expected behavior!** But to adjust:

1. **Check operating hours**
   ```sql
   SELECT * FROM garage_settings LIMIT 1;
   -- Look at operating_hours field
   ```

2. **Update operating hours**
   ```sql
   UPDATE garage_settings 
   SET operating_hours = jsonb_build_object(
     'start', '06:00',
     'end', '22:00'
   );
   ```

3. **Disable after-hours alerts** (in backend)
   ```javascript
   // In server/src/index.js, comment out:
   // if (isAfterHours) { ... }
   ```

---

### API Returns 403 Unauthorized

**Symptoms:** "Invalid API key" or "Unauthorized" response

**Diagnosis:**
```bash
# Check API key is being sent
curl -v -X POST http://localhost:4000/api/camera/vehicle-entry \
  -H "x-api-key: sk-test-key" \
  -d '{"plate_number":"TEST"}'

# Look at response headers, especially 'Authorization'
```

**Solutions:**

1. **No API key provided**
   ```bash
   # Must include header:
   curl -H "x-api-key: sk-..." http://localhost:4000/api/camera/vehicle-entry
   
   # Or query param:
   curl http://localhost:4000/api/camera/vehicle-entry?api_key=sk-...
   ```

2. **Wrong API key value**
   ```bash
   # Verify exact match:
   BACKEND_KEY=$(grep EDGE_API_KEY server/.env | cut -d'=' -f2)
   EDGE_KEY=$(grep ERM_API_KEY server/edge_anpr/.env | cut -d'=' -f2)
   
   if [ "$BACKEND_KEY" != "$EDGE_KEY" ]; then
     echo "KEYS DO NOT MATCH!"
   fi
   ```

3. **API key not set**
   ```bash
   # If .env missing, backend uses default (no auth)
   # This is only for development!
   # For production, ALWAYS set EDGE_API_KEY
   ```

---

## 📊 Database Issues

### "Column Not Found" Error

**Symptoms:** "Could not find 'column_name' of 'table_name'"

**Solutions:**

1. **Check column exists**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name='garage_entries';
   ```

2. **If missing, create it**
   ```sql
   ALTER TABLE garage_entries 
   ADD COLUMN snapshot_url TEXT DEFAULT NULL;
   ```

3. **Check RLS policies don't prevent access**
   ```sql
   -- View RLS policies
   SELECT * FROM pg_policies 
   WHERE tablename='garage_entries';
   
   -- Disable if problematic:
   ALTER TABLE garage_entries DISABLE ROW LEVEL SECURITY;
   ```

---

### Database Connection Timeout

**Symptoms:** "connect timeout" or "connection refused"

**Diagnosis:**
```javascript
// In backend, test Supabase connection:
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

supabase.from('garage_entries').select('count').then(
  r => console.log('Connected:', r),
  e => console.error('Failed:', e)
);
```

**Solutions:**

1. **Verify Supabase URL**
   ```bash
   grep SUPABASE_URL server/.env
   # Should look like: https://xxxxx.supabase.co
   ```

2. **Verify service role key**
   ```bash
   # Check it's not truncated
   grep SUPABASE_SERVICE_ROLE_KEY server/.env | wc -c
   # Should be >100 characters
   ```

3. **Check Supabase status**
   - Visit https://status.supabase.com/
   - If red, wait for them to fix it

4. **Network connectivity**
   ```bash
   ping supabase.co
   curl -I https://your-project.supabase.co/
   ```

---

### RLS Policy Blocks Insert

**Symptoms:** "new row violates row-level security policy"

**Diagnosis:**
```sql
-- Check what policies exist
SELECT * FROM pg_policies WHERE tablename='garage_entries';

-- Test if auth works
SELECT auth.uid();  -- Should return your user ID
```

**Solutions:**

1. **Check RLS is enabled/disabled correctly**
   ```sql
   -- Disable RLS temporarily (dev only)
   ALTER TABLE garage_entries DISABLE ROW LEVEL SECURITY;
   
   -- Re-enable with proper policy:
   ALTER TABLE garage_entries ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow authenticated inserts" 
   ON garage_entries FOR INSERT 
   TO authenticated 
   WITH CHECK (auth.uid() IS NOT NULL);
   ```

2. **Verify auth header is valid**
   ```javascript
   // In backend, check auth:
   const { data: { user }, error } = await supabase.auth.getUser();
   console.log('Auth user:', user?.id || 'NONE');
   ```

---

## 🎨 Frontend Issues

### Dashboard Not Updating

**Symptoms:** New entries don't appear, need manual refresh

**Diagnosis:**
```javascript
// In browser console (F12):
console.log(supabase.getChannels());
// Should show: RealtimeChannelState { status: 'SUBSCRIBED' }

// Check for JavaScript errors:
// Look for red X in console tab
```

**Solutions:**

1. **Verify Supabase real-time enabled**
   - Go to Supabase dashboard
   - Settings → Replication
   - Ensure garage_entries and alerts have replication enabled

2. **Check subscription is active**
   ```javascript
   // In browser console:
   const channel = supabase
     .channel('garage-changes')
     .on('postgres_changes', 
       { event: '*', schema: 'public', table: 'garage_entries' },
       (payload) => console.log('Changed!', payload)
     )
     .subscribe();
   ```

3. **Check WebSocket connection**
   ```javascript
   // In browser DevTools Network tab:
   // Look for: wss://your-project.supabase.co/realtime/v1?...
   // If red X, WebSocket failed
   ```

4. **Verify auth token is valid**
   ```javascript
   // In console:
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Logged in as:', user?.email);
   ```

---

### Login Fails

**Symptoms:** "Invalid credentials" or stuck on login page

**Solutions:**

1. **Check auth is enabled**
   - Supabase dashboard → Authentication → Providers
   - Email/Password should be enabled

2. **User doesn't exist**
   ```sql
   -- Check in Supabase
   SELECT id, email FROM auth.users WHERE email='test@example.com';
   
   -- If not found, create via Supabase dashboard or:
   -- Create new user via sign-up in app
   ```

3. **Wrong password**
   - Password is case-sensitive
   - No spaces
   - Try reset password flow

4. **Email not confirmed**
   - If you have email confirmation enabled:
   - Check email for confirmation link
   - Or disable confirmation in Supabase dashboard (dev only)

---

## 🔄 Performance Issues

### High CPU Usage

**Symptoms:** Edge service using 90%+ CPU, running slow

**Solutions:**

1. **Reduce frame processing frequency**
   ```python
   # In anpr_service.py, increase frame_skip:
   frame_skip = 20  # Process every 20th frame instead of 10
   ```

2. **Lower resolution**
   ```python
   # Resize frame before processing:
   frame = cv2.resize(frame, (320, 240))  # Instead of 640x480
   ```

3. **Use GPU acceleration**
   ```bash
   # Install CUDA-enabled OpenCV:
   pip install opencv-python-headless opencv-contrib-python
   ```

4. **Run on multiple machines**
   - Run separate edge service instances per 2-3 cameras
   - Load balance API requests

---

### High Memory Usage

**Symptoms:** Service crashes after hours, memory keeps growing

**Solutions:**

1. **Check for memory leaks**
   ```python
   # Add memory monitoring to anpr_service.py:
   import psutil
   import os
   
   process = psutil.Process(os.getpid())
   memory_mb = process.memory_info().rss / 1024 / 1024
   print(f"Memory: {memory_mb:.1f} MB")
   ```

2. **Release video capture properly**
   ```python
   # Make sure to call cap.release()
   cap = cv2.VideoCapture(rtsp_url)
   try:
     # ... processing ...
   finally:
     cap.release()  # Always cleanup!
   ```

3. **Restart service regularly**
   ```bash
   # In cron, restart daily:
   0 2 * * * systemctl restart kinamba-anpr
   ```

---

## 📋 Comprehensive Test Checklist

Use this to verify entire system:

```bash
# 1. Backend connectivity
curl http://localhost:4000/api/camera/vehicle-entry \
  -H "x-api-key: sk-test-key" \
  -H "Content-Type: application/json" \
  -d '{"plate_number":"TEST123","confidence":95}'

# 2. Database connectivity
# (From backend server)
psql "postgresql://user:pass@db.supabase.co/postgres"

# 3. Camera connectivity
ffmpeg -i rtsp://192.168.1.100:554/stream -vframes 1 test.jpg

# 4. Plate detection
# Run: python anpr_service.py
# Look for: "Detected plate: ABC123"

# 5. Dashboard real-time
# Open browser to http://localhost:5173
# Add a vehicle manually, watch for real-time update

# 6. End-to-end flow
# Trigger: curl ... (vehicle entry API call)
# Check: Dashboard updates instantly
# Check: Database has garage_entries record
# Check: Alerts triggered if applicable
```

---

## 🆘 Get Help

If still stuck:

1. **Check logs**
   - Backend: `tail -f server.log` or npm console output
   - Edge: `tail -f anpr_service.log`
   - Browser: F12 → Console tab

2. **Verify each component separately**
   - Test backend API with curl
   - Test camera with ffmpeg
   - Test database with psql
   - Test frontend with hardcoded test data

3. **Check documentation**
   - [ANPR_ERM_INTEGRATION.md](ANPR_ERM_INTEGRATION.md)
   - [ANPR_QUICKSTART.md](ANPR_QUICKSTART.md)

4. **Review logs for actual error messages**
   - Error messages contain clues!
   - Include full error in searches

---

**Last Updated:** February 4, 2026
