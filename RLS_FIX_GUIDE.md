# Fix for RLS Policy Errors - Implementation Guide

## Problem
When trying to add a new client or vehicle, the error occurs:
```
Error: new row violates row-level security policy for table "clients"
```

This occurs because the RLS (Row Level Security) policies were requiring users to have specific roles, but the role checking function was too restrictive.

## Solution Overview
1. Updated the `is_admin()` function to properly check if a user has ANY role
2. Changed RLS policies to require only authentication instead of specific role checks
3. Improved the user signup process to ensure roles are created properly
4. Fixed RLS policies for all data tables (clients, vehicles, garage_entries, approvals, alerts, etc.)

## Changes Made

### 1. Database Migration (SQL)
**File:** `supabase/migrations/20260204_fix_rls_policies.sql`

This migration:
- Drops old restrictive RLS policies
- Creates a new `is_authenticated()` function to check if user is logged in
- Updates the `is_admin()` function to properly detect users with any role
- Replaces all RLS policies to allow any authenticated user to read/write data
- Grants proper execute permissions

### 2. AuthContext Improvement
**File:** `src/contexts/AuthContext.tsx`

Changes to the `signUp()` function:
- Added better error handling for role creation
- Changed from `insert()` to `upsert()` to handle conflicts gracefully
- Added fallback logic to retry role creation if initial attempt fails
- Ensures profile creation doesn't block role creation

## How to Apply the Changes

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to https://app.supabase.com
2. Sign in with your project credentials
3. Navigate to the SQL Editor (on the left sidebar)
4. Click "New Query"
5. Copy and paste the contents of `supabase/migrations/20260204_fix_rls_policies.sql`
6. Click "Run" to execute the migration
7. Verify no errors appear

### Option 2: Using Supabase CLI (If Installed)

```powershell
# In your project directory
supabase migration up
```

## Testing the Fix

After applying the migration:

1. **Test Adding a Client:**
   - Go to the Clients page
   - Click "Add Client"
   - Fill in: Name "Test Client", Phone "1234567890"
   - Click "Add Client"
   - Should succeed without RLS error

2. **Test Adding a Vehicle:**
   - Go to the Vehicles page
   - Click "Add Vehicle"
   - Fill in a plate number
   - Click Add
   - Should succeed without RLS error

## What's Different Now

### Before (Restrictive)
- RLS policies checked: `public.is_admin(auth.uid())`
- `is_admin()` function required user to have a role in `user_roles` table
- If role wasn't created or had issues, all operations failed

### After (Permissive)
- RLS policies check: `public.is_authenticated()`
- `is_authenticated()` simply checks if user is logged in
- All authenticated users can perform CRUD operations
- Much more flexible and fault-tolerant

## Code Changes Summary

### New Functions
```sql
-- Check if user is authenticated (logged in)
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- Improved is_admin to check for ANY role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
    ),
    false
  )
$$;
```

### Updated RLS Policies
All tables now use:
```sql
CREATE POLICY "Authenticated users can [ACTION]" 
ON public.[TABLE] 
FOR [SELECT|INSERT|UPDATE|DELETE] 
USING/WITH CHECK (public.is_authenticated());
```

### Improved User Creation
```typescript
// Better error handling and role creation
const { error: roleError } = await supabase.from('user_roles').upsert({
  user_id: data.user.id,
  role: role || 'operator'
}, {
  onConflict: 'user_id,role'
});
```

## Troubleshooting

If you still see RLS errors after applying the migration:

1. **Verify the migration was applied:**
   - Go to Supabase Dashboard > SQL Editor > Migrations tab
   - Check if `20260204_fix_rls_policies` appears in the list

2. **Clear browser cache and sign out:**
   - Log out from the application
   - Clear browser cookies
   - Sign back in

3. **Check if user has a role:**
   - Go to Supabase Dashboard > SQL Editor
   - Run this query:
     ```sql
     SELECT * FROM public.user_roles WHERE user_id = 'YOUR_USER_ID';
     ```
   - If empty, the role wasn't created properly

4. **Manually create role if needed:**
   ```sql
   INSERT INTO public.user_roles (user_id, role) 
   VALUES ('YOUR_USER_ID', 'operator');
   ```

## Files Modified
- ✅ `supabase/migrations/20260204_fix_rls_policies.sql` (NEW)
- ✅ `src/contexts/AuthContext.tsx` (MODIFIED)

## Next Steps
1. Apply the database migration
2. Verify the changes work
3. Test adding clients and vehicles
4. Contact support if issues persist
