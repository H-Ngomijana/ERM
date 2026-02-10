# Authentication System Documentation

## Overview

The Garage Guard Pro authentication system provides a secure, flexible admin portal with comprehensive role-based access control (RBAC). The system supports multiple authentication flows including sign-up, sign-in, password recovery, and admin-only operations.

## Features

### 1. **Sign Up (Registration)**
- Full name, email, and password validation
- Automatic admin role assignment for first-time signups
- Email verification via Supabase Auth
- Profile creation with user metadata
- User role assignment upon signup

### 2. **Sign In (Login)**
- Email and password validation
- Persistent session management
- Role-based user context
- Automatic redirect to dashboard after login
- Error handling for invalid credentials

### 3. **Password Recovery**
- Password reset via email link
- Secure reset token generation
- Password reset email delivery
- Guided password update flow

### 4. **Account Deletion & Recovery**
- Password update capability
- Email-based verification
- Session management

### 5. **Role-Based Access Control**
- **Admin**: Full system access, user management
- **Manager**: Operational management
- **Operator**: Basic operational access

## Architecture

### Components

#### AuthContext (`src/contexts/AuthContext.tsx`)
Central authentication state management using React Context API.

**Methods:**
- `signIn(email, password)` - User login
- `signUp(email, password, fullName, role)` - User registration with role assignment
- `signOut()` - User logout
- `resetPassword(email)` - Initiate password reset
- `updatePassword(newPassword)` - Update password via reset link

**State:**
- `user` - Current authenticated user (Supabase User object)
- `session` - Current auth session
- `userRole` - Current user's role ('admin' | 'manager' | 'operator' | null)
- `isLoading` - Loading state during auth check

#### Auth Page (`src/pages/Auth.tsx`)
Comprehensive authentication UI with multiple modes:

**Modes:**
1. **Login Mode** - Standard email/password login
2. **Signup Mode** - New account creation
3. **Reset Mode** - Password reset request
4. **Update Mode** - Password update via reset link

**Features:**
- Password visibility toggle
- Form validation with Zod schemas
- Real-time error messages
- Toast notifications
- Navigation between modes

#### ProtectedRoute (`src/components/ProtectedRoute.tsx`)
Route guard ensuring only authenticated users can access protected pages.

### Database Schema

#### Key Tables:
1. **profiles** - User profile information
   - user_id, full_name, phone, avatar_url

2. **user_roles** - User role assignments
   - user_id, role (admin/manager/operator)

3. **admin_creation_tokens** - Admin setup tokens
   - email, token, used, expires_at

4. **audit_logs** - Authentication event logging
   - action, actor_id, entity_type, details

### Security Features

1. **Row Level Security (RLS)**
   - Users can only access their own data
   - Admin-only operations protected by RLS policies
   - Role-based access control enforced at database level

2. **Password Security**
   - Minimum 6 characters for login
   - Minimum 8 characters for password updates
   - Passwords must match confirmation field
   - Supabase Auth handles password hashing

3. **Session Management**
   - Persistent session storage in localStorage
   - Automatic token refresh
   - Secure token handling

4. **Audit Logging**
   - All authentication events logged
   - Immutable audit trail
   - Tracks user actions for compliance

## Usage Guide

### For Users

#### Sign Up as Admin
1. Click "Don't have an account? Sign up"
2. Enter full name, email, and password
3. Password will automatically be at least 6 characters
4. Account created with admin role by default
5. Verify email via link sent to inbox

#### Sign In
1. Enter email and password
2. Click "Sign In"
3. Upon success, redirected to dashboard
4. User role loaded and stored in context

#### Reset Password
1. Click "Forgot your password?" on login page
2. Enter email address
3. Check email for reset link
4. Click link and set new password
5. Auto-redirects to login after password update

### For Developers

#### Import and Use Auth Context
```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, userRole, signOut } = useAuth();
  
  return (
    <div>
      {user && <p>Logged in as {user.email}</p>}
      {userRole && <p>Role: {userRole}</p>}
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

#### Check User Authentication
```tsx
const { user, isLoading } = useAuth();

if (isLoading) return <LoadingSpinner />;
if (!user) return <Navigate to="/auth" />;

return <Dashboard />;
```

#### Assign Roles to Users
```tsx
import { assignUserRole } from '@/lib/authUtils';

// Assign admin role
await assignUserRole(userId, 'admin');

// Assign manager role
await assignUserRole(userId, 'manager');
```

#### Check User Permissions
```tsx
import { getUserRole } from '@/lib/authUtils';

const role = await getUserRole(userId);
if (role === 'admin') {
  // Show admin features
}
```

## API Reference

### AuthContext Methods

#### `signIn(email: string, password: string): Promise<{ error: Error | null }>`
Authenticate user with email and password.

**Example:**
```tsx
const { error } = await signIn('admin@garage.com', 'password123');
if (error) {
  console.error('Login failed:', error.message);
}
```

#### `signUp(email: string, password: string, fullName: string, role?: UserRole): Promise<{ error: Error | null }>`
Create new user account with optional role assignment.

**Example:**
```tsx
const { error } = await signUp(
  'manager@garage.com',
  'securepassword',
  'John Manager',
  'manager'
);
```

#### `resetPassword(email: string): Promise<{ error: Error | null }>`
Send password reset email to user.

**Example:**
```tsx
const { error } = await resetPassword('admin@garage.com');
if (!error) {
  // Email sent successfully
}
```

#### `updatePassword(newPassword: string): Promise<{ error: Error | null }>`
Update current user's password (requires valid session).

**Example:**
```tsx
const { error } = await updatePassword('newSecurePassword123');
```

#### `signOut(): Promise<void>`
Log out current user and clear session.

**Example:**
```tsx
await signOut();
navigate('/auth');
```

## Authentication Flows

### Flow 1: First Time Setup
1. User visits `/auth`
2. Fills signup form (name, email, password)
3. Click "Create Account"
4. Profile and role created in database
5. Verification email sent
6. User signs in after verification
7. Redirected to dashboard

### Flow 2: Standard Login
1. User visits `/auth`
2. Enters email and password
3. Click "Sign In"
4. AuthContext fetches user role
5. Redirected to dashboard
6. Dashboard content loads

### Flow 3: Password Recovery
1. User clicks "Forgot password?"
2. Enters email address
3. Reset email sent by Supabase
4. User clicks link in email
5. Redirected to `/auth?reset=true`
6. Update password form appears
7. Sets new password
8. Returns to login

### Flow 4: Session Recovery
1. App loads
2. AuthProvider checks for existing session
3. If session exists, user role fetched
4. User object and role set in context
5. If user navigates to `/auth`, redirected to `/dashboard`

## Environment Variables

Required `.env.local` variables:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Error Handling

All authentication methods return standardized error objects:
```tsx
const { error } = await signIn(email, password);

if (error) {
  if (error.message === 'Invalid login credentials') {
    // Show: "Invalid email or password"
  } else if (error.message.includes('already registered')) {
    // Show: "This email is already registered"
  } else {
    // Show: error.message
  }
}
```

## Troubleshooting

### User redirects to login immediately after signup
- Verify email address in Supabase Auth
- Check email verification settings in Supabase dashboard

### Password reset email not received
- Check email is correct
- Verify email provider settings in Supabase
- Check spam/junk folders
- Verify reset email template configuration

### Role not loading after login
- Ensure `user_roles` table has entry for user
- Check RLS policies allow user to read their role
- Verify role assignment in signup flow

### Session persists after logout
- Clear browser localStorage
- Check for localStorage blockers
- Verify signOut() completes successfully

## Best Practices

1. **Always handle errors** - Every auth operation can fail
2. **Show loading states** - Use `isLoading` from context
3. **Protect routes** - Use ProtectedRoute component
4. **Validate input** - Use provided Zod schemas
5. **Log events** - Use authUtils functions for audit trail
6. **Check permissions** - Verify user role before sensitive operations
7. **Update passwords** - Encourage users to reset passwords periodically
8. **Use HTTPS** - Always use HTTPS in production

## Migration from Previous System

If migrating from an older auth system:

1. Export existing users from old system
2. Use Supabase Auth's user import feature
3. Create corresponding profiles and user_roles entries
4. Test all authentication flows
5. Update all auth context usage across app

## Performance Considerations

- User roles cached in React context (reduces DB queries)
- Session persisted in localStorage (faster app load)
- Debounce auth checks when possible
- Use React Query for profile data (not auth state)

## Security Considerations

- Never store passwords in client-side state
- Always use HTTPS in production
- Implement rate limiting on auth endpoints
- Monitor audit logs for suspicious activity
- Keep dependencies updated
- Regularly rotate secrets and API keys

## Support & Issues

For authentication-related issues:
1. Check browser console for errors
2. Review Supabase dashboard for account status
3. Verify RLS policies are correctly configured
4. Check auth logs in audit_logs table
5. Review Supabase documentation for specific errors

## License

Part of Garage Guard Pro - All rights reserved
