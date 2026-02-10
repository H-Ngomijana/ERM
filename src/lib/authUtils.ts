import { supabase } from '@/integrations/supabase/client';

export interface AdminCreationToken {
  id: string;
  email: string;
  token: string;
  used: boolean;
  created_at: string;
  used_at?: string;
  expires_at: string;
}

/**
 * Check if the current user has admin privileges
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  return !!data;
};

/**
 * Create an admin creation token for first-time setup or inviting admins
 */
export const createAdminCreationToken = async (email: string): Promise<AdminCreationToken | null> => {
  try {
    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error('Only admins can create admin tokens');
    }

    const token = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const { data, error } = await supabase
      .from('admin_creation_tokens')
      .insert({
        email,
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as AdminCreationToken;
  } catch (error) {
    console.error('Error creating admin token:', error);
    return null;
  }
};

/**
 * Verify and use an admin creation token during signup
 */
export const verifyAdminToken = async (token: string): Promise<{ valid: boolean; email?: string }> => {
  try {
    const { data, error } = await supabase
      .from('admin_creation_tokens')
      .select('email, used, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { valid: false };
    if (data.used) return { valid: false };
    if (new Date(data.expires_at) < new Date()) return { valid: false };

    return { valid: true, email: data.email };
  } catch (error) {
    console.error('Error verifying admin token:', error);
    return { valid: false };
  }
};

/**
 * Mark an admin token as used
 */
export const markAdminTokenAsUsed = async (token: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('admin_creation_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('token', token);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking token as used:', error);
    return false;
  }
};

/**
 * Assign a role to a user
 */
export const assignUserRole = async (
  userId: string,
  role: 'admin' | 'manager' | 'operator'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error assigning user role:', error);
    return false;
  }
};

/**
 * Get user's role
 */
export const getUserRole = async (userId: string): Promise<string | null> => {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    return data?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

/**
 * Get user profile information
 */
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
  }
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};

/**
 * Check if email exists in the system
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password: 'dummy_check_password_that_will_fail'
    });

    // If user exists but password is wrong, we get "Invalid login credentials"
    // If user doesn't exist, we also get "Invalid login credentials"
    // So we need to use a different approach

    // Try to get user via email through admin API check
    const { data: users } = await supabase.auth.admin?.listUsers() || { data: { users: [] } };
    return users?.some(u => u.email === email) || false;
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
};

/**
 * Generate first admin setup link
 */
export const generateFirstAdminSetupLink = (): string => {
  const setupToken = `admin_setup_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  return `${window.location.origin}/auth?setup=${setupToken}`;
};

/**
 * Log authentication event for audit trail
 */
export const logAuthEvent = async (
  eventType: string,
  details?: Record<string, any>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        action: `auth_${eventType}`,
        entity_type: 'auth',
        details: details || {}
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error logging auth event:', error);
    return false;
  }
};
