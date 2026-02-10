/**
 * Admin Management Utilities
 * Provides admin-specific operations and user management functions
 */

import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/contexts/AuthContext';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
}

/**
 * Get list of all admin users
 */
export const getAdminUsers = async (): Promise<AdminUser[]> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role,
        profiles (
          full_name,
          phone,
          avatar_url
        )
      `)
      .eq('role', 'admin');

    if (error) throw error;

    return data?.map((item: any) => ({
      id: item.user_id,
      role: item.role,
      full_name: item.profiles?.full_name || 'Unknown',
      phone: item.profiles?.phone,
      avatar_url: item.profiles?.avatar_url,
    })) || [];
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
};

/**
 * Get list of all staff users (admin, manager, operator)
 */
export const getStaffUsers = async (): Promise<AdminUser[]> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role,
        profiles (
          full_name,
          phone,
          avatar_url
        )
      `);

    if (error) throw error;

    return data?.map((item: any) => ({
      id: item.user_id,
      role: item.role,
      full_name: item.profiles?.full_name || 'Unknown',
      phone: item.profiles?.phone,
      avatar_url: item.profiles?.avatar_url,
    })) || [];
  } catch (error) {
    console.error('Error fetching staff users:', error);
    return [];
  }
};

/**
 * Send admin invitation email to a new user
 */
export const sendAdminInvitation = async (
  email: string,
  invitedBy: string
): Promise<{ success: boolean; token?: string; error?: string }> => {
  try {
    const token = `invite_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const { data, error } = await supabase
      .from('admin_creation_tokens')
      .insert({
        email,
        token,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
      })
      .select()
      .single();

    if (error) throw error;

    // Log the invitation in audit logs
    await supabase.from('audit_logs').insert({
      action: 'admin_invitation_sent',
      entity_type: 'admin',
      details: {
        invitee_email: email,
        invited_by: invitedBy,
        token: token
      }
    });

    return { success: true, token };
  } catch (error) {
    console.error('Error sending admin invitation:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send invitation' 
    };
  }
};

/**
 * Update user role
 */
export const updateUserRole = async (
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!newRole) {
      throw new Error('Role is required');
    }

    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) throw error;

    // Log the role change
    await supabase.from('audit_logs').insert({
      action: 'user_role_updated',
      entity_type: 'user_role',
      entity_id: userId,
      details: {
        new_role: newRole
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update role' 
    };
  }
};

/**
 * Disable a user account
 */
export const disableUserAccount = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Delete user roles (effectively disabling access)
    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (roleError) throw roleError;

    // Log the action
    await supabase.from('audit_logs').insert({
      action: 'user_account_disabled',
      entity_type: 'user',
      entity_id: userId
    });

    return { success: true };
  } catch (error) {
    console.error('Error disabling user account:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to disable account' 
    };
  }
};

/**
 * Re-enable a user account
 */
export const enableUserAccount = async (
  userId: string,
  role: UserRole = 'operator'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role || 'operator'
      });

    if (error) throw error;

    // Log the action
    await supabase.from('audit_logs').insert({
      action: 'user_account_enabled',
      entity_type: 'user',
      entity_id: userId,
      details: {
        role: role
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error enabling user account:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to enable account' 
    };
  }
};

/**
 * Get user's full profile with role
 */
export const getUserFullProfile = async (userId: string) => {
  try {
    const [profile, role] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()
    ]);

    if (profile.error) throw profile.error;
    if (role.error) throw role.error;

    return {
      ...profile.data,
      role: role.data?.role || null
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * Check authentication audit logs
 */
export const getAuthenticationAuditLogs = async (limit: number = 50) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .like('action', '%auth%')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching auth logs:', error);
    return [];
  }
};

/**
 * Search users by email or name
 */
export const searchUsers = async (query: string): Promise<AdminUser[]> => {
  try {
    const lowerQuery = query.toLowerCase();
    
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        user_id,
        full_name,
        phone,
        avatar_url,
        user_roles (
          role
        )
      `)
      .or(`full_name.ilike.%${lowerQuery}%`);

    if (error) throw error;

    return data?.map((item: any) => ({
      id: item.user_id,
      full_name: item.full_name || 'Unknown',
      phone: item.phone,
      avatar_url: item.avatar_url,
      role: item.user_roles?.[0]?.role || 'operator',
    })) || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

/**
 * Get authentication statistics
 */
export const getAuthStats = async () => {
  try {
    const [adminCount, managerCount, operatorCount, totalLogins] = await Promise.all([
      supabase
        .from('user_roles')
        .select('id', { count: 'exact' })
        .eq('role', 'admin'),
      supabase
        .from('user_roles')
        .select('id', { count: 'exact' })
        .eq('role', 'manager'),
      supabase
        .from('user_roles')
        .select('id', { count: 'exact' })
        .eq('role', 'operator'),
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .like('action', '%login%')
    ]);

    return {
      adminCount: adminCount.count || 0,
      managerCount: managerCount.count || 0,
      operatorCount: operatorCount.count || 0,
      totalLogins: totalLogins.count || 0
    };
  } catch (error) {
    console.error('Error fetching auth stats:', error);
    return {
      adminCount: 0,
      managerCount: 0,
      operatorCount: 0,
      totalLogins: 0
    };
  }
};

/**
 * Validate admin creation token (check if can be used)
 */
export const validateAdminCreationToken = async (token: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('admin_creation_tokens')
      .select('used, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    if (!data) return false;
    if (data.used) return false;
    if (new Date(data.expires_at) < new Date()) return false;

    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};
