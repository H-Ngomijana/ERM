# 🆘 RLS ERROR FIX - Add Client & Vehicle Not Working

## The Problem
You get this error when trying to add a client or vehicle:
```
❌ Error: new row violates row-level security policy for table "clients"
```

## The Solution (Takes 2 minutes)

### **STEP 1: Go to Supabase**
- Open: https://app.supabase.com
- Log in with your account
- Select project: `cmdahjpbezqxvbhbitnl`

### **STEP 2: Go to SQL Editor**
- In the left sidebar, click: **SQL Editor**
- Click the blue button: **+ New Query**

### **STEP 3: Copy & Paste This**

```sql
DROP POLICY IF EXISTS "Staff can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.clients;
DROP POLICY IF EXISTS "Staff can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.vehicles;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_auth" ON public.clients
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vehicles_auth" ON public.vehicles
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
```

### **STEP 4: Click Run**
- Click the blue **Run** button
- Should see: "0 rows returned" ✅

### **STEP 5: Test It**
- Go back to: http://localhost:8080
- Press **F5** to refresh the page
- Click **"Add Client"** button
- Try adding a client - **IT SHOULD WORK NOW!** ✅

---

## ✅ That's It!

Both "Add Client" and "Add Vehicle" buttons should now work perfectly.

If it's still not working:
1. Make sure you refreshed the browser (Ctrl+R or Cmd+R)
2. Make sure you're logged in (see email in top right corner)
3. Check the browser console (F12) for any other errors

---

## Frontend / API key troubleshooting (added by fix)

- I normalized Vite and server env values to strip surrounding quotes and whitespace so quoted values in `.env` won't be sent verbatim.
- If you see "Invalid API key" during login, verify these values in the project root `.env`:
  - `VITE_SUPABASE_URL` should be your Supabase Project URL (e.g. https://your-project.supabase.co)
  - `VITE_SUPABASE_PUBLISHABLE_KEY` should be the anon (public) key from Supabase (the "anon" key)
- For server endpoints (camera/edge), ensure `server/.env` contains:
  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (service role key for server)
  - `EDGE_API_KEY` (shared secret used by cameras/edge devices)

Notes:
- Do not commit real keys to source control. Remove quotes around values in `.env` if present.
- After updating `.env` files, restart the dev server: `npm run dev` (frontend) and restart the Node server if running separately.
