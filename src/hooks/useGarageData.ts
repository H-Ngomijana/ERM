import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface GarageEntry {
  id: string;
  vehicle_id: string;
  status: 'inside' | 'in_service' | 'awaiting_approval' | 'ready' | 'exited';
  entry_time: string;
  exit_time: string | null;
  snapshot_url: string | null;
  notes: string | null;
  vehicles: {
    id: string;
    plate_number: string;
    is_flagged: boolean;
    clients: {
      id: string;
      name: string;
      phone: string;
    } | null;
  };
}

interface Alert {
  id: string;
  type: 'overdue' | 'unapproved_exit' | 'unknown_plate' | 'after_hours' | 'capacity_warning' | 'duplicate_entry';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  is_read: boolean;
  created_at: string;
  vehicles: {
    plate_number: string;
  } | null;
}

interface Stats {
  vehiclesToday: number;
  pendingApprovals: number;
}

export const useGarageData = () => {
  const [entries, setEntries] = useState<GarageEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<Stats>({
    vehiclesToday: 0,
    pendingApprovals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch active garage entries with pagination - limit to 50 entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('garage_entries')
        .select(`
          id,
          vehicle_id,
          status,
          entry_time,
          exit_time,
          snapshot_url,
          notes,
          vehicles (
            id,
            plate_number,
            is_flagged,
            clients (
              id,
              name,
              phone
            )
          )
        `)
        .neq('status', 'exited')
        .order('entry_time', { ascending: false })
        .limit(50);  // Limit to 50 entries for better performance

      if (entriesError) throw entriesError;
      setEntries(entriesData as GarageEntry[] || []);

      // Fetch unresolved alerts - limit to 20 for performance
      const { data: alertsData, error: alertsError } = await supabase
        .from('alerts')
        .select(`
          id,
          type,
          severity,
          message,
          is_read,
          created_at,
          vehicles (
            plate_number
          )
        `)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(20);  // Limit to 20 alerts

      if (alertsError) throw alertsError;
      setAlerts(alertsData as Alert[] || []);

      // Calculate stats using aggregation instead of counting all
      const today = new Date().toISOString().split('T')[0];
      
      // Use single count query for better performance
      const [todayCountResult, pendingCountResult] = await Promise.all([
        supabase
          .from('garage_entries')
          .select('*', { count: 'exact', head: true })
          .gte('entry_time', today),
        supabase
          .from('approvals')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
      ]);

      setStats({
        vehiclesToday: todayCountResult.count || 0,
        pendingApprovals: pendingCountResult.count || 0,
      });

    } catch (error) {
      console.error('Error fetching garage data:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading data',
        description: 'Failed to load garage data. Please refresh.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up realtime subscriptions
    const entriesChannel = supabase
      .channel('garage_entries_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'garage_entries' }, () => {
        fetchData();
      })
      .subscribe();

    const alertsChannel = supabase
      .channel('alerts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(entriesChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [user]);

  const updateEntryStatus = async (entryId: string, status: GarageEntry['status']) => {
    const { error } = await supabase
      .from('garage_entries')
      .update({ 
        status, 
        updated_by: user?.id,
        exit_time: status === 'exited' ? new Date().toISOString() : null 
      })
      .eq('id', entryId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error updating status',
        description: error.message,
      });
      return false;
    }

    // Create audit log
    await supabase.rpc('create_audit_log', {
      _action: `status_changed_to_${status}`,
      _entity_type: 'garage_entry',
      _entity_id: entryId,
      _details: { new_status: status }
    });

    toast({ title: 'Status updated', description: `Vehicle status changed to ${status}` });
    return true;
  };

  const resolveAlert = async (alertId: string, notes?: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({
        is_resolved: true,
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      })
      .eq('id', alertId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error resolving alert', description: error.message });
      return false;
    }

    toast({ title: 'Alert resolved' });
    return true;
  };

  const markAlertRead = async (alertId: string) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', alertId);
  };

  const createApproval = async (entryId: string, amount: number, description?: string) => {
    if (!user) return false;

    const { error } = await supabase.from('approvals').insert({
      garage_entry_id: entryId,
      amount,
      description,
      created_by: user.id,
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error creating approval', description: error.message });
      return false;
    }

    // Update entry status
    await updateEntryStatus(entryId, 'awaiting_approval');

    toast({ title: 'Approval request sent', description: 'Client will receive SMS notification' });
    return true;
  };

  return {
    entries,
    alerts,
    stats,
    isLoading,
    updateEntryStatus,
    resolveAlert,
    markAlertRead,
    createApproval,
    refetch: fetchData,
  };
};
