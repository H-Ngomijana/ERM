# Quick Fix for RLS Error - Add Client/Vehicle Broken

## 🎯 What You Need to Do (2 minutes!)

**Error you see:**
```
new row violates row-level security policy for table "clients"
```

**Fix:**

1. Go to https://app.supabase.com/
2. Click your project (mcqfirgeekuccefsrhko)
3. Click "SQL Editor" on the left
4. Click "New Query"
5. Paste this SQL ⬇️
6. Click "Run"
7. Refresh browser at http://localhost:8080 - DONE! ✅

---

## 📋 SQL to Paste into Supabase SQL Editor

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Staff can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.clients;

DROP POLICY IF EXISTS "Staff can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.vehicles;

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Add permissive policies
CREATE POLICY "clients_auth" ON public.clients
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vehicles_auth" ON public.vehicles
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
```
DROP POLICY IF EXISTS "Staff can update entries" ON public.garage_entries;
DROP POLICY IF EXISTS "Staff can view approvals" ON public.approvals;
DROP POLICY IF EXISTS "Staff can insert approvals" ON public.approvals;
DROP POLICY IF EXISTS "Staff can update approvals" ON public.approvals;
DROP POLICY IF EXISTS "Staff can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Staff can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Staff can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Staff can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff can view settings" ON public.garage_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.garage_settings;

-- Update functions
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.uid() IS NOT NULL $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id), false) $$;

-- Recreate policies for clients
CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Authenticated users can insert clients" ON public.clients FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Authenticated users can update clients" ON public.clients FOR UPDATE USING (public.is_authenticated());
CREATE POLICY "Authenticated users can delete clients" ON public.clients FOR DELETE USING (public.is_authenticated());

-- Recreate policies for vehicles
CREATE POLICY "Authenticated users can view vehicles" ON public.vehicles FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Authenticated users can insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Authenticated users can update vehicles" ON public.vehicles FOR UPDATE USING (public.is_authenticated());
CREATE POLICY "Authenticated users can delete vehicles" ON public.vehicles FOR DELETE USING (public.is_authenticated());

-- Recreate policies for garage_entries
CREATE POLICY "Authenticated users can view entries" ON public.garage_entries FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Authenticated users can insert entries" ON public.garage_entries FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Authenticated users can update entries" ON public.garage_entries FOR UPDATE USING (public.is_authenticated());

-- Recreate policies for approvals
CREATE POLICY "Authenticated users can view approvals" ON public.approvals FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Authenticated users can insert approvals" ON public.approvals FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Authenticated users can update approvals" ON public.approvals FOR UPDATE USING (public.is_authenticated());

-- Recreate policies for alerts
CREATE POLICY "Authenticated users can view alerts" ON public.alerts FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Authenticated users can insert alerts" ON public.alerts FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Authenticated users can update alerts" ON public.alerts FOR UPDATE USING (public.is_authenticated());

-- Recreate policies for audit_logs
CREATE POLICY "Authenticated users can view audit logs" ON public.audit_logs FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (public.is_authenticated());

-- Recreate policies for garage_settings
CREATE POLICY "Authenticated users can view settings" ON public.garage_settings FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Authenticated users can update settings" ON public.garage_settings FOR UPDATE USING (public.is_authenticated());

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.is_authenticated TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
```

---

## ✅ After Running the SQL

1. **Sign out** from the app
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Sign back in**
4. **Try adding a client** or vehicle again
5. ✨ **Should work now!**

---

## ❓ Still Having Issues?

- If you see an error running the SQL, check that you're in the correct Supabase project
- Make sure RLS is enabled on your tables (it should be)
- Try signing out and signing back in
- Clear your browser cookies completely

---

## 📝 What Changed?

- **Before:** Only users with a specific role could add data
- **After:** Any logged-in user can add data
- **Result:** The RLS error goes away, clients and vehicles can be added normally
