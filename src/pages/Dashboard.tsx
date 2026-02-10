import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import VehicleCard from '@/components/dashboard/VehicleCard';
import StatsCard from '@/components/dashboard/StatsCard';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import ApprovalDialog from '@/components/dashboard/ApprovalDialog';
import { ManualEntryDialog } from '@/components/dashboard/ManualEntryDialog';
import { QuickEntryDialog } from '@/components/dashboard/QuickEntryDialog';
import { SystemPerformance } from '@/components/dashboard/SystemPerformance';
import { useGarageData } from '@/hooks/useGarageData';
import { Car, Users, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Dashboard = () => {
  const { entries, alerts, stats, isLoading, updateEntryStatus, resolveAlert, markAlertRead, createApproval, refetch } = useGarageData();
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<{
    id: string;
    plate: string;
    phone?: string;
  } | null>(null);

  const handleSendApproval = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      setSelectedEntry({
        id: entry.id,
        plate: entry.vehicles.plate_number,
        phone: entry.vehicles.clients?.phone,
      });
      setApprovalDialogOpen(true);
    }
  };

  const handleApprovalSubmit = async (data: { amount: number; description?: string }) => {
    if (selectedEntry) {
      await createApproval(selectedEntry.id, data.amount, data.description);
    }
  };

  const handleMarkExit = async (entryId: string) => {
    await updateEntryStatus(entryId, 'exited');
  };

  const handleViewDetails = (entryId: string) => {
    // TODO: Navigate to vehicle details page
    console.log('View details:', entryId);
  };

  const formattedAlerts = alerts.map(a => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    message: a.message,
    isRead: a.is_read,
    createdAt: a.created_at,
    vehiclePlate: a.vehicles?.plate_number,
  }));

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Live garage overview and management</p>
          </div>
          <div className="flex gap-2">
            <QuickEntryDialog onEntryAdded={() => refetch()} />
            <ManualEntryDialog onEntryAdded={() => refetch()} />
          </div>
        </div>

        {/* System Performance Overview */}
        <SystemPerformance />

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Vehicles Today"
            value={stats.vehiclesToday}
            subtitle="Entries processed"
            icon={Users}
          />
          <StatsCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            subtitle="Awaiting client response"
            icon={Clock}
          />
          <StatsCard
            title="Ready for Exit"
            value={entries.filter(e => e.status === 'ready').length}
            subtitle="Approved vehicles"
            icon={CheckCircle}
          />
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Vehicles section */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All ({entries.length})</TabsTrigger>
                <TabsTrigger value="inside">
                  Entered ({entries.filter(e => e.status === 'inside').length})
                </TabsTrigger>
                <TabsTrigger value="in_service">
                  In Service ({entries.filter(e => e.status === 'in_service').length})
                </TabsTrigger>
                <TabsTrigger value="awaiting">
                  Awaiting ({entries.filter(e => e.status === 'awaiting_approval').length})
                </TabsTrigger>
                <TabsTrigger value="ready">
                  Ready ({entries.filter(e => e.status === 'ready').length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <VehicleGrid
                  entries={entries}
                  onViewDetails={handleViewDetails}
                  onSendApproval={handleSendApproval}
                  onMarkExit={handleMarkExit}
                />
              </TabsContent>
              <TabsContent value="inside" className="mt-4">
                <VehicleGrid
                  entries={entries.filter(e => e.status === 'inside')}
                  onViewDetails={handleViewDetails}
                  onSendApproval={handleSendApproval}
                  onMarkExit={handleMarkExit}
                />
              </TabsContent>
              <TabsContent value="in_service" className="mt-4">
                <VehicleGrid
                  entries={entries.filter(e => e.status === 'in_service')}
                  onViewDetails={handleViewDetails}
                  onSendApproval={handleSendApproval}
                  onMarkExit={handleMarkExit}
                />
              </TabsContent>
              <TabsContent value="awaiting" className="mt-4">
                <VehicleGrid
                  entries={entries.filter(e => e.status === 'awaiting_approval')}
                  onViewDetails={handleViewDetails}
                  onSendApproval={handleSendApproval}
                  onMarkExit={handleMarkExit}
                />
              </TabsContent>
              <TabsContent value="ready" className="mt-4">
                <VehicleGrid
                  entries={entries.filter(e => e.status === 'ready')}
                  onViewDetails={handleViewDetails}
                  onSendApproval={handleSendApproval}
                  onMarkExit={handleMarkExit}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Alerts panel */}
          <div className="lg:col-span-1">
            <AlertsPanel
              alerts={formattedAlerts}
              onResolve={resolveAlert}
              onMarkRead={markAlertRead}
            />
          </div>
        </div>
      </div>

      {/* Approval Dialog */}
      <ApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        vehiclePlate={selectedEntry?.plate || ''}
        clientPhone={selectedEntry?.phone}
        onSubmit={handleApprovalSubmit}
      />
    </DashboardLayout>
  );
};

interface VehicleGridProps {
  entries: Array<{
    id: string;
    status: 'inside' | 'in_service' | 'awaiting_approval' | 'ready' | 'exited';
    entry_time: string;
    snapshot_url: string | null;
    vehicles: {
      plate_number: string;
      is_flagged: boolean;
      clients: { name: string } | null;
    };
  }>;
  onViewDetails: (id: string) => void;
  onSendApproval: (id: string) => void;
  onMarkExit: (id: string) => void;
}

const VehicleGrid = ({ entries, onViewDetails, onSendApproval, onMarkExit }: VehicleGridProps) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No vehicles in this category</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <VehicleCard
          key={entry.id}
          id={entry.id}
          plateNumber={entry.vehicles.plate_number}
          status={entry.status}
          entryTime={entry.entry_time}
          snapshotUrl={entry.snapshot_url || undefined}
          clientName={entry.vehicles.clients?.name}
          isFlagged={entry.vehicles.is_flagged}
          onViewDetails={onViewDetails}
          onSendApproval={onSendApproval}
          onMarkExit={onMarkExit}
        />
      ))}
    </div>
  );
};

export default Dashboard;
