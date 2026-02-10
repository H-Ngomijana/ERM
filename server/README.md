# ERM Server

Quick setup and run instructions for the ERM server (development).

1. Copy `.env.example` to `.env` and fill values:

```
SUPABASE_URL=https://your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EDGE_API_KEY=choose-a-secret-key-for-cameras
PORT=3001
```

2. Install Node dependencies and start the server:

```powershell
cd server
npm install
npm start
```

3. Install Python requirements for the edge ANPR (if using the included script):

```powershell
python -m pip install -r requirements.txt
```

4. Point your edge device/camera to POST detections to:

```
https://<your-server>/api/camera/vehicle-entry
Header: x-api-key: <EDGE_API_KEY>
```

Notes:
- Do not store `SUPABASE_SERVICE_ROLE_KEY` in client-side code. Keep it server-side only.
- Apply the SQL migrations in your Supabase project before relying on DB functions.