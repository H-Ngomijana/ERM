# 📖 API Reference Card

Quick reference for all API endpoints and data structures.

---

## 🔑 Authentication

**All requests require API key:**

```bash
# Header method (recommended)
curl -H "x-api-key: sk-your-api-key" http://localhost:4000/api/camera/vehicle-entry

# Query parameter method
curl http://localhost:4000/api/camera/vehicle-entry?api_key=sk-your-api-key

# Env variable
export EDGE_API_KEY="sk-..."
curl -H "x-api-key: $EDGE_API_KEY" http://localhost:4000/api/...
```

**Get your API key:**
```bash
# Check server environment
cat server/.env | grep EDGE_API_KEY

# Generate new key
node -e "console.log('sk-' + require('crypto').randomBytes(16).toString('hex'))"
```

---

## 🚗 POST /api/camera/vehicle-entry

Main endpoint for vehicle entry events.

**URL:**
```
POST http://localhost:4000/api/camera/vehicle-entry
POST https://api.kinamba.com/api/camera/vehicle-entry
```

**Headers:**
```
Content-Type: application/json
x-api-key: sk-...
```

**Request Body:**
```json
{
  "plate_number": "ABC123",
  "confidence": 95,
  "timestamp": "2026-02-03T10:42:11Z",
  "camera_id": "CAM1",
  "image_url": "https://cdn.example.com/snapshot.jpg"
}
```

**Field Descriptions:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `plate_number` | string | ✅ | Vehicle plate, uppercase, e.g. "ABC123", "KCA-123AB" |
| `confidence` | number (0-100) | ❌ | OCR confidence (default: 95). Must be >= 85 |
| `timestamp` | ISO 8601 | ❌ | Event time (default: server time). Format: "2026-02-03T10:42:11Z" |
| `camera_id` | string | ❌ | Camera ID for tracking, e.g. "CAM1", "entry_cam" |
| `image_url` | string | ❌ | URL to snapshot image. Will be stored in database. |

**Example Requests:**

```bash
# Minimal (just plate number)
curl -X POST http://localhost:4000/api/camera/vehicle-entry \
  -H "x-api-key: sk-..." \
  -H "Content-Type: application/json" \
  -d '{"plate_number":"ABC123"}'

# Full with all fields
curl -X POST http://localhost:4000/api/camera/vehicle-entry \
  -H "x-api-key: sk-..." \
  -H "Content-Type: application/json" \
  -d '{
    "plate_number": "ABC123",
    "confidence": 98,
    "timestamp": "2026-02-03T10:42:11Z",
    "camera_id": "CAM1",
    "image_url": "https://cdn.example.com/snap_123.jpg"
  }'

# Python request
import requests
import json
from datetime import datetime

response = requests.post(
    'http://localhost:4000/api/camera/vehicle-entry',
    headers={
        'x-api-key': 'sk-...',
        'Content-Type': 'application/json'
    },
    json={
        'plate_number': 'ABC123',
        'confidence': 95,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'camera_id': 'CAM1'
    }
)
print(response.json())
```

**Success Response (200 OK):**
```json
{
  "ok": true,
  "entry": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "plate_number": "ABC123",
    "entry_time": "2026-02-03T10:42:11.123Z",
    "status": "inside",
    "camera_id": "CAM1",
    "snapshot_url": "https://cdn.example.com/snap_123.jpg",
    "created_at": "2026-02-03T10:42:11.123Z"
  },
  "alerts": [
    {
      "id": "alert-uuid",
      "type": "capacity_warning",
      "severity": "warning",
      "message": "Garage at 95% capacity"
    }
  ]
}
```

**Error Responses:**

```json
// 400: Low confidence
{
  "error": "Low confidence",
  "confidence": 78
}

// 409: Vehicle already inside
{
  "error": "Vehicle already inside",
  "plate_number": "ABC123"
}

// 403: Invalid API key
{
  "error": "Invalid API key"
}

// 500: Server error
{
  "error": "Database error",
  "details": "..."
}
```

---

## 📊 Response Codes

| Code | Meaning | When | What to do |
|------|---------|------|-----------|
| 200 | Success | Entry created | Record is in system |
| 400 | Bad Request | Missing/invalid fields | Check request JSON |
| 403 | Forbidden | Invalid/missing API key | Verify `x-api-key` header |
| 409 | Conflict | Vehicle already inside | That vehicle is already entered |
| 422 | Unprocessable | Low confidence | Increase camera quality or lower threshold |
| 500 | Server Error | Backend crashed | Check server logs |

---

## 🎯 Alert Types

Possible alert types returned:

```javascript
{
  "duplicate_entry": "Vehicle ABC123 already inside",
  "capacity_warning": "Garage at 95% capacity",
  "after_hours": "Entry detected after operating hours (9 PM - 6 AM)",
  "unknown_plate": "Plate ABC123 not found in system",
  "low_confidence": "OCR confidence 78% < 85% threshold",
  "invalid_plate": "Plate number format invalid"
}
```

Each alert has:
```json
{
  "id": "alert-uuid",
  "type": "after_hours",
  "severity": "info|warning|critical",
  "message": "Human readable message",
  "entry_id": "garage-entry-uuid",
  "vehicle_id": "vehicle-uuid (if found)",
  "created_at": "2026-02-03T10:42:11Z"
}
```

---

## 🔄 Real-time Updates (Frontend)

Frontend subscribes to changes via Supabase:

```typescript
// Automatically subscribes to:
supabase.channel('garage:updates')
  .on('postgres_changes',
    { 
      event: '*',
      schema: 'public',
      table: 'garage_entries'
    },
    payload => {
      console.log('New entry:', payload.new)
    }
  )
  .subscribe()
```

When POST /api/camera/vehicle-entry succeeds:
1. Database updated
2. Real-time subscription triggered
3. Dashboard updates instantly (no polling needed)

---

## 📱 Edge Service Integration

### Configuration

```bash
# server/edge_anpr/.env
ERM_API_URL=http://localhost:4000        # Backend URL
ERM_API_KEY=sk-...                       # Must match EDGE_API_KEY
CAMERA_ID=CAM1                           # Camera identifier
RTSP_URL=rtsp://192.168.1.100:554/stream # Camera stream URL
CONFIDENCE_THRESHOLD=85                  # Min confidence %
```

### What it sends

```python
# Edge service sends this to backend:
payload = {
    'plate_number': 'ABC123',
    'confidence': 95.5,
    'timestamp': '2026-02-03T10:42:11Z',
    'camera_id': 'CAM1',
    'image_url': '/snapshots/snap_2026020310421.jpg'
}

requests.post(
    'http://localhost:4000/api/camera/vehicle-entry',
    json=payload,
    headers={'x-api-key': ERM_API_KEY}
)
```

---

## 💾 Database Schema

### garage_entries Table

```sql
CREATE TABLE garage_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id),
  plate_number TEXT NOT NULL,
  status TEXT DEFAULT 'inside',
    -- Values: 'inside', 'in_service', 'awaiting_approval', 'ready', 'exited'
  entry_time TIMESTAMP NOT NULL,
  exit_time TIMESTAMP,
  camera_id TEXT,
  snapshot_url TEXT,
  notes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_plate_status ON garage_entries(plate_number, status);
CREATE INDEX idx_entry_time ON garage_entries(entry_time DESC);
CREATE INDEX idx_status ON garage_entries(status);
```

**Example records:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "vehicle_id": "550e8400-e29b-41d4-a716-446655440001",
  "plate_number": "ABC123",
  "status": "inside",
  "entry_time": "2026-02-03T10:42:11Z",
  "exit_time": null,
  "camera_id": "CAM1",
  "snapshot_url": "https://cdn.example.com/snapshot.jpg",
  "notes": { "confidence": 95, "source": "openalpr" },
  "created_at": "2026-02-03T10:42:11Z"
}
```

### alerts Table

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_entry_id UUID REFERENCES garage_entries(id),
  vehicle_id UUID REFERENCES vehicles(id),
  type TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
```

### audit_logs Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 🧪 Testing Examples

### Complete Integration Test

```bash
#!/bin/bash

API_KEY="sk-your-test-key"
BASE_URL="http://localhost:4000"
TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# Test 1: New entry
echo "Test 1: New vehicle entry"
curl -X POST "$BASE_URL/api/camera/vehicle-entry" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "plate_number": "TEST001",
    "confidence": 95,
    "timestamp": "'$TIMESTAMP'",
    "camera_id": "CAM1"
  }' | jq

# Test 2: Same vehicle (should duplicate warning)
echo "Test 2: Same vehicle (expect duplicate alert)"
sleep 1
curl -X POST "$BASE_URL/api/camera/vehicle-entry" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "plate_number": "TEST001",
    "confidence": 92,
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'",
    "camera_id": "CAM1"
  }' | jq

# Test 3: Low confidence (should reject)
echo "Test 3: Low confidence (expect rejection)"
curl -X POST "$BASE_URL/api/camera/vehicle-entry" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "plate_number": "TEST002",
    "confidence": 78,
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'",
    "camera_id": "CAM1"
  }' | jq
```

### Python Integration Test

```python
#!/usr/bin/env python3

import requests
import json
from datetime import datetime

API_KEY = "sk-your-test-key"
BASE_URL = "http://localhost:4000"

def test_vehicle_entry(plate, confidence):
    """Test posting a vehicle entry."""
    
    payload = {
        'plate_number': plate,
        'confidence': confidence,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'camera_id': 'CAM1'
    }
    
    response = requests.post(
        f'{BASE_URL}/api/camera/vehicle-entry',
        headers={
            'x-api-key': API_KEY,
            'Content-Type': 'application/json'
        },
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response

# Run tests
print("=== Test 1: New Entry ===")
test_vehicle_entry("ABC123", 95)

print("\n=== Test 2: Duplicate ===")
test_vehicle_entry("ABC123", 92)

print("\n=== Test 3: Low Confidence ===")
test_vehicle_entry("XYZ789", 70)
```

---

## 🔗 Related Documentation

- [ANPR_ERM_INTEGRATION.md](ANPR_ERM_INTEGRATION.md) - Full system architecture
- [ANPR_QUICKSTART.md](ANPR_QUICKSTART.md) - Quick deployment guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Issue resolution guide
- [server/src/index.js](server/src/index.js) - Backend implementation
- [server/edge_anpr/anpr_service.py](server/edge_anpr/anpr_service.py) - Edge service

---

## 🎓 Common Patterns

### Pattern 1: Trigger from ANPR Camera

```
Camera (ANPR-capable)
  ↓ Detects plate ABC123, confidence 97%
  ↓ POST to http://your-server:4000/api/camera/vehicle-entry
  ↓ {plate_number: "ABC123", confidence: 97}
  ↓
Backend validates & inserts
  ↓
Dashboard updates instantly (real-time)
```

### Pattern 2: Trigger from RTSP Camera + Edge Service

```
RTSP Camera
  ↓ Streams video
  ↓
Edge Service (Python)
  ↓ Captures frames, detects plates
  ↓ Deduplicates (5-sec window)
  ↓ POST to http://backend:4000/api/camera/vehicle-entry
  ↓
Backend validates & inserts
  ↓
Dashboard updates
```

### Pattern 3: Manual Entry via Dashboard

```
Admin opens Dashboard
  ↓ Clicks "Add Vehicle"
  ↓ Enters plate number ABC123
  ↓ Frontend calls Supabase directly
  ↓ Inserts to garage_entries
  ↓
Real-time subscription triggers
  ↓
Dashboard updates
```

---

## 🆘 Quick Debugging

**"Invalid API key"**
```bash
# Verify key matches
echo "Backend key: $(grep EDGE_API_KEY server/.env)"
echo "Edge key: $(grep ERM_API_KEY server/edge_anpr/.env)"
```

**"Connection refused"**
```bash
# Check backend is running
curl http://localhost:4000/api/camera/vehicle-entry
# Should NOT error immediately
```

**"Low confidence"**
```bash
# Check your threshold
grep CONFIDENCE_THRESHOLD server/edge_anpr/.env
# Default is 85%, lower it to be more lenient
```

**"Duplicate entry"**
```bash
# That vehicle is already inside, must exit first
# Exit in dashboard or:
curl -X POST http://localhost:4000/api/camera/vehicle-exit \
  -H "x-api-key: ..." \
  -d '{"plate_number":"ABC123"}'
```

---

**Version:** 1.0  
**Last Updated:** February 4, 2026  
**Status:** Production Ready
