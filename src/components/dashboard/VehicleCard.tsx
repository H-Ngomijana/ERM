import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Eye, Send, LogOut, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { memo } from 'react';

type VehicleStatus = 'inside' | 'in_service' | 'awaiting_approval' | 'ready' | 'exited';

interface VehicleCardProps {
  id: string;
  plateNumber: string;
  status: VehicleStatus;
  entryTime: string;
  snapshotUrl?: string;
  clientName?: string;
  isFlagged?: boolean;
  onViewDetails: (id: string) => void;
  onSendApproval: (id: string) => void;
  onMarkExit: (id: string) => void;
}

const statusConfig: Record<VehicleStatus, { label: string; color: string; icon: string }> = {
  inside: { label: 'Entered', color: 'bg-green-500/20 text-green-600 border-green-500/30', icon: '🟢' },
  in_service: { label: 'In Service', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30', icon: '🔵' },
  awaiting_approval: { label: 'Awaiting Approval', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30', icon: '🟡' },
  ready: { label: 'Ready', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30', icon: '🟢' },
  exited: { label: 'Exited', color: 'bg-gray-500/20 text-gray-500 border-gray-500/30', icon: '⚪' },
};

const VehicleCard = ({
  id,
  plateNumber,
  status,
  entryTime,
  snapshotUrl,
  clientName,
  isFlagged,
  onViewDetails,
  onSendApproval,
  onMarkExit,
}: VehicleCardProps) => {
  const config = statusConfig[status];
  const duration = formatDistanceToNow(new Date(entryTime), { addSuffix: false });

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 border-border/50">
      <div className="aspect-video bg-muted relative">
        {snapshotUrl ? (
          <img src={snapshotUrl} alt={`Vehicle ${plateNumber}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No snapshot
          </div>
        )}
        {isFlagged && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Flagged
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold font-mono tracking-wider">{plateNumber}</h3>
            {clientName && <p className="text-sm text-muted-foreground">{clientName}</p>}
          </div>
          <Badge className={`${config.color} border`}>
            {config.icon} {config.label}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{duration}</span>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onViewDetails(id)}>
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
          {status !== 'exited' && status !== 'awaiting_approval' && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onSendApproval(id)}>
              <Send className="h-4 w-4 mr-1" />
              Approve
            </Button>
          )}
          {(status === 'ready' || status === 'inside') && (
            <Button variant="secondary" size="sm" onClick={() => onMarkExit(id)}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Memoize to prevent re-renders when props haven't changed
export default memo(VehicleCard);
