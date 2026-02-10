# 🎯 Quick Reference Guide

## Authentication Methods

### Using Auth Context
```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, userRole, isLoading, signIn, signUp, signOut, resetPassword, updatePassword } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" />;
  
  return <div>{user.email} - Role: {userRole}</div>;
}
```

### Sign In
```tsx
const { signIn } = useAuth();

const { error } = await signIn('admin@garage.com', 'password123');
if (error) {
  console.error(error.message);
}
```

### Sign Up
```tsx
const { signUp } = useAuth();

const { error } = await signUp(
  'newadmin@garage.com',
  'password123',
  'John Admin',
  'admin' // Role: 'admin' | 'manager' | 'operator'
);
```

### Reset Password
```tsx
const { resetPassword } = useAuth();

const { error } = await resetPassword('admin@garage.com');
// User receives email with reset link
```

### Update Password
```tsx
const { updatePassword } = useAuth();

const { error } = await updatePassword('newPassword123');
// Must have valid session (called from reset link)
```

### Sign Out
```tsx
const { signOut } = useAuth();

await signOut();
navigate('/auth');
```

---

## Admin Utilities

### Import
```tsx
import {
  getAdminUsers,
  getStaffUsers,
  sendAdminInvitation,
  updateUserRole,
  disableUserAccount,
  enableUserAccount,
  getUserFullProfile,
  searchUsers,
  getAuthStats
} from '@/lib/adminUtils';
```

### Get All Admins
```tsx
const admins = await getAdminUsers();
// Returns: AdminUser[]
// - id, email, full_name, role, phone, avatar_url, created_at
```

### Get All Staff
```tsx
const staff = await getStaffUsers();
// Returns: AdminUser[] (all admin, manager, operator)
```

### Send Admin Invitation
```tsx
const result = await sendAdminInvitation(
  'newadmin@garage.com',
  currentUserId
);

if (result.success) {
  console.log('Invitation sent:', result.token);
} else {
  console.error('Failed:', result.error);
}
```

### Update User Role
```tsx
const result = await updateUserRole(userId, 'manager');

if (result.success) {
  // Role updated
} else {
  console.error(result.error);
}
```

### Disable Account
```tsx
const result = await disableUserAccount(userId);

if (result.success) {
  // Account disabled (user_roles deleted)
}
```

### Enable Account
```tsx
const result = await enableUserAccount(userId, 'operator');

if (result.success) {
  // Account enabled with role
}
```

### Search Users
```tsx
const results = await searchUsers('john');
// Returns: AdminUser[] matching "john" in name or email
```

### Get Statistics
```tsx
const stats = await getAuthStats();
// Returns: { adminCount, managerCount, operatorCount, totalLogins }
```

---

## Auth Utilities

### Import
```tsx
import {
  isCurrentUserAdmin,
  createAdminCreationToken,
  verifyAdminToken,
  markAdminTokenAsUsed,
  assignUserRole,
  getUserRole,
  getUserProfile,
  updateUserProfile,
  logAuthEvent
} from '@/lib/authUtils';
```

### Check If Current User Is Admin
```tsx
const isAdmin = await isCurrentUserAdmin();
if (!isAdmin) {
  return <AccessDenied />;
}
```

### Create Admin Token
```tsx
const token = await createAdminCreationToken('newadmin@garage.com');
// Returns: AdminCreationToken | null
// Can be used in invite links
```

### Verify Admin Token
```tsx
const { valid, email } = await verifyAdminToken(token);
if (valid) {
  console.log('Token is valid for:', email);
}
```

### Get User Role
```tsx
const role = await getUserRole(userId);
// Returns: 'admin' | 'manager' | 'operator' | null
```

### Get User Profile
```tsx
const profile = await getUserProfile(userId);
// Returns: { full_name, phone, avatar_url, ... }
```

### Update User Profile
```tsx
const success = await updateUserProfile(userId, {
  full_name: 'New Name',
  phone: '555-1234',
  avatar_url: 'https://...'
});
```

### Log Auth Event
```tsx
const success = await logAuthEvent('custom_event', {
  detail1: 'value1',
  detail2: 'value2'
});
// Creates audit log entry
```

---

## Form Schemas (Zod)

### Login
```tsx
z.object({
  email: z.string().email(),
  password: z.string().min(6)
})
```

### Signup
```tsx
z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})
```

### Reset Password
```tsx
z.object({
  email: z.string().email()
})
```

### Update Password
```tsx
z.object({
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})
```

---

## Database Queries (Supabase)

### Get User Role
```sql
SELECT role FROM user_roles 
WHERE user_id = 'uuid-here'
LIMIT 1;
```

### Get Admin Users
```sql
SELECT ur.user_id, ur.role, p.full_name, p.email
FROM user_roles ur
JOIN profiles p ON ur.user_id = p.user_id
WHERE ur.role = 'admin'
ORDER BY p.created_at DESC;
```

### Check Auth Events
```sql
SELECT action, actor_id, details, created_at
FROM audit_logs
WHERE action LIKE '%auth%'
ORDER BY created_at DESC
LIMIT 50;
```

### Get All User Roles
```sql
SELECT ur.user_id, ur.role, p.full_name
FROM user_roles ur
JOIN profiles p ON ur.user_id = p.user_id
ORDER BY ur.role, p.full_name;
```

---

## Component Examples

### Protected Admin Component
```tsx
import { useAuth } from '@/contexts/AuthContext';

export function AdminPanel() {
  const { user, userRole } = useAuth();

  if (userRole !== 'admin') {
    return <div>Access Denied</div>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      {/* Admin content */}
    </div>
  );
}
```

### User Info Display
```tsx
import { useAuth } from '@/contexts/AuthContext';

export function UserInfo() {
  const { user, userRole, signOut } = useAuth();

  return (
    <div>
      <p>Email: {user?.email}</p>
      <p>Role: {userRole}</p>
      <button onClick={signOut}>Logout</button>
    </div>
  );
}
```

### Conditional Rendering Based on Role
```tsx
import { useAuth } from '@/contexts/AuthContext';

export function Dashboard() {
  const { userRole } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>
      
      {userRole === 'admin' && (
        <section>Admin Features</section>
      )}
      
      {['admin', 'manager'].includes(userRole || '') && (
        <section>Manager Features</section>
      )}
      
      <section>Operator Features (all users)</section>
    </div>
  );
}
```

---

## Common Patterns

### Check Authentication Status
```tsx
const { user, isLoading } = useAuth();

if (isLoading) return <Spinner />;
return user ? <AuthenticatedView /> : <GuestView />;
```

### Protect API Calls
```tsx
const { user } = useAuth();

if (!user) {
  throw new Error('Not authenticated');
}

const response = await fetchData();
```

### Handle Auth Errors
```tsx
try {
  const { error } = await signIn(email, password);
  
  if (error?.message === 'Invalid login credentials') {
    setError('Wrong email or password');
  } else if (error?.message.includes('User not found')) {
    setError('No account with this email');
  } else {
    setError(error?.message || 'Login failed');
  }
} catch (err) {
  setError('An unexpected error occurred');
}
```

### Redirect After Auth
```tsx
const navigate = useNavigate();
const { user, userRole } = useAuth();

useEffect(() => {
  if (user) {
    navigate(
      userRole === 'admin' ? '/admin' : '/dashboard'
    );
  }
}, [user, userRole, navigate]);
```

---

## Environment Variables

```env
# Required for authentication
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## TypeScript Types

```tsx
import type { User, Session } from '@supabase/supabase-js';

type UserRole = 'admin' | 'manager' | 'operator' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}
```

---

## Error Handling

### Common Error Messages
```
"Invalid login credentials" → Wrong email or password
"User not found" → Email not registered
"Email already registered" → Email taken
"Password must be at least 8 characters" → Password too short
"Passwords don't match" → Confirmation mismatch
"Email verification required" → Verify email first
"Session expired" → Re-login required
"Not authenticated" → No valid session
"Access denied" → Insufficient permissions
```

---

## Debug Tips

### Check Current Auth State
```tsx
const { user, userRole, session } = useAuth();
console.log({ user, userRole, session });
```

### Check Local Storage
```javascript
// In browser console:
localStorage.getItem('sb-supabase-auth-token')
localStorage.getItem('sb-sb-session')
```

### Check User in Supabase
```tsx
const { data: { user } } = await supabase.auth.getUser();
console.log(user);
```

### Check User Role in DB
```sql
SELECT * FROM user_roles WHERE user_id = 'your-uuid';
SELECT * FROM profiles WHERE user_id = 'your-uuid';
```

---

## Performance Tips

1. **Cache roles** - Loaded in context, reuse
2. **Use React Query** - For profile data, not auth
3. **Lazy load admin features** - Only when needed
4. **Debounce searches** - When searching users
5. **Batch updates** - Update multiple users at once

---

## Security Checklist

- [ ] Never log passwords
- [ ] Always validate input
- [ ] Use HTTPS in production
- [ ] Enable email verification
- [ ] Monitor audit logs
- [ ] Rotate secrets regularly
- [ ] Use environment variables
- [ ] Enforce strong passwords
- [ ] Implement 2FA (optional)
- [ ] Keep dependencies updated

---

**Last Updated**: February 3, 2026  
**Version**: 1.0  
**Status**: ✅ Production Ready
