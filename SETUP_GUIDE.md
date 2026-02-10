# Garage Guard Pro - Admin Portal Setup Guide

## Quick Start

### Prerequisites
- Supabase project (free tier available at supabase.com)
- Node.js 18+ 
- Bun package manager (or npm)

### Environment Setup

1. **Create `.env.local` file** in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

2. **Get these values from Supabase:**
   - Go to Project Settings → API
   - Copy the "Project URL" (VITE_SUPABASE_URL)
   - Copy the "anon public" key (VITE_SUPABASE_PUBLISHABLE_KEY)

### Database Setup

1. **Run migrations in Supabase:**
   - Go to SQL Editor in your Supabase dashboard
   - Create a new query
   - Copy contents from `supabase/migrations/20260203062407_*.sql`
   - Execute the query
   - Repeat for `supabase/migrations/20260203062421_*.sql`
   - Repeat for `supabase/migrations/20260203_admin_setup.sql`

2. **Enable Email Authentication:**
   - Go to Authentication → Providers
   - Enable "Email"
   - Configure email templates if needed

### First Admin Account

1. **Start the application:**
```bash
bun install
bun dev
```

2. **Navigate to** `http://localhost:5173/auth`

3. **Click "Don't have an account? Sign up"**

4. **Fill in the form:**
   - Full Name: Your name
   - Email: your-email@example.com
   - Password: At least 6 characters
   - Confirm Password: Same as above

5. **Click "Create Account"**
   - Account created with admin role by default
   - Verification email sent (check spam folder)
   - A confirmation toast will appear

6. **Verify Email (if required):**
   - Check your email for verification link
   - Click the link to verify
   - Return to the app

7. **Sign In:**
   - Enter your email and password
   - Click "Sign In"
   - Successfully logged in and redirected to dashboard

## Features Overview

### Login Portal Features
- ✅ Email and password login with validation
- ✅ Sign up with automatic admin role assignment
- ✅ Password reset via email
- ✅ Password visibility toggle
- ✅ Real-time form validation
- ✅ Error messages and toast notifications
- ✅ Session persistence (auto-login on refresh)
- ✅ Role-based access control (RBAC)

### User Management
- ✅ Create admin accounts
- ✅ Assign roles (admin, manager, operator)
- ✅ Update user profiles
- ✅ Enable/disable accounts
- ✅ Search users by email/name
- ✅ View user statistics

### Security Features
- ✅ Row-Level Security (RLS) policies
- ✅ Secure password handling (Supabase Auth)
- ✅ Token-based session management
- ✅ Audit logging for all auth events
- ✅ Email verification
- ✅ Password reset security

## Common Tasks

### Adding a New Admin User

**Option 1: Through the Dashboard (if you have admin settings)**
1. Go to Settings → User Management
2. Click "Invite Admin"
3. Enter email address
4. Invitation email sent
5. User clicks link and creates account

**Option 2: Programmatically**
```tsx
import { sendAdminInvitation } from '@/lib/adminUtils';

const result = await sendAdminInvitation(
  'newadmin@garage.com',
  currentUserId
);

if (result.success) {
  console.log('Invitation sent with token:', result.token);
}
```

### Changing User Role

```tsx
import { updateUserRole } from '@/lib/adminUtils';

const result = await updateUserRole(userId, 'manager');

if (result.success) {
  console.log('User role updated to manager');
} else {
  console.error('Error:', result.error);
}
```

### Getting Current User Info

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, userRole } = useAuth();

  return (
    <div>
      <p>Email: {user?.email}</p>
      <p>Role: {userRole}</p>
    </div>
  );
}
```

### Protecting Routes

The app already uses ProtectedRoute. All dashboard routes are protected:
```tsx
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminPanel />
    </ProtectedRoute>
  }
/>
```

## Troubleshooting

### "Invalid login credentials"
- **Check:** Email and password are correct
- **Check:** User account is verified (check email)
- **Fix:** Sign up again if account isn't verified

### "Email already registered"
- **Check:** You're not using an existing email
- **Fix:** Use a different email or sign in instead

### Password reset email not received
- **Check:** Spam/junk folder
- **Check:** Email configured in Supabase
- **Check:** User email is correct
- **Fix:** In Supabase, go to Email Templates and verify setup

### "Not authenticated" errors on dashboard
- **Check:** User session is valid
- **Check:** localStorage is enabled in browser
- **Fix:** Sign out completely and sign back in
- **Fix:** Clear browser cache and cookies

### User role not loading
- **Check:** User has entry in `user_roles` table
- **Check:** RLS policies are correct
- **Fix:** Manually add role: 
  ```sql
  INSERT INTO public.user_roles (user_id, role) 
  VALUES ('user-uuid-here', 'admin');
  ```

### Admin features not visible
- **Check:** User role is 'admin'
- **Check:** Component checks userRole context
- **Fix:** Update user role using admin utils

## Database Schema Quick Reference

### Key Tables:

**auth.users**
- Managed by Supabase Auth
- Contains email, password hash, metadata

**profiles**
- user_id, full_name, phone, avatar_url, created_at

**user_roles**
- user_id, role (admin|manager|operator)

**admin_creation_tokens**
- email, token, used, expires_at

**audit_logs**
- action, actor_id, entity_type, details, created_at

## API Endpoints (Client-side)

All authentication is client-side using Supabase JavaScript SDK.

### SignIn
```tsx
const { signIn } = useAuth();
const { error } = await signIn('email@example.com', 'password');
```

### SignUp
```tsx
const { signUp } = useAuth();
const { error } = await signUp(
  'email@example.com',
  'password',
  'Full Name',
  'admin'
);
```

### SignOut
```tsx
const { signOut } = useAuth();
await signOut();
```

### Reset Password
```tsx
const { resetPassword } = useAuth();
const { error } = await resetPassword('email@example.com');
```

### Update Password
```tsx
const { updatePassword } = useAuth();
const { error } = await updatePassword('newPassword123');
```

## Production Deployment Checklist

- [ ] Update `.env.local` with production Supabase credentials
- [ ] Enable HTTPS (required by Supabase)
- [ ] Configure email domain for verification emails
- [ ] Set up custom email templates (optional)
- [ ] Configure allowed redirect URLs in Supabase
- [ ] Enable MFA (optional but recommended)
- [ ] Set up monitoring and logging
- [ ] Test password reset flow in production
- [ ] Test user signup and verification
- [ ] Set up database backups
- [ ] Review RLS policies for security
- [ ] Test session management
- [ ] Document admin procedures for your team

## Security Best Practices

1. **Never hardcode credentials** - Use environment variables
2. **Always validate input** - Zod schemas do this automatically
3. **Use HTTPS everywhere** - Required for auth
4. **Secure storage** - Supabase handles session storage securely
5. **Audit logs** - Monitor authentication events in audit_logs table
6. **Regular backups** - Enable Supabase backups
7. **Rate limiting** - Implement on API if using custom backends
8. ** 2FA** - Consider enabling for admin accounts
9. **Password policy** - Enforce strong passwords (already done)
10. **Token rotation** - Supabase handles this automatically

## Next Steps

1. ✅ Set up first admin account (see above)
2. Explore the Dashboard at `/dashboard`
3. Create test users with different roles
4. Customize Settings page for admin preferences
5. Set up email templates for verification/reset
6. Add more admin features (optional)
7. Deploy to production

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [Shadcn/ui Components](https://ui.shadcn.com/)

## Files Modified/Created

### Core Auth Files
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/pages/Auth.tsx` - Auth UI (login/signup/reset/update)
- `src/lib/authUtils.ts` - Authentication utilities
- `src/lib/adminUtils.ts` - Admin management utilities

### Database
- `supabase/migrations/20260203_admin_setup.sql` - Admin setup migrations

### Documentation
- `AUTH_DOCUMENTATION.md` - Comprehensive auth documentation
- `SETUP_GUIDE.md` - This file

## Version Info

- React: 18.x
- Supabase JS: latest
- Tailwind CSS: 3.x
- Shadcn/ui: latest
- React Hook Form: latest
- Zod: latest

---

**Last Updated:** February 3, 2026  
**Status:** ✅ Production Ready
