import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Clock, Car, Ban, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type AlertType = 'overdue' | 'unapproved_exit' | 'unknown_plate' | 'after_hours' | 'capacity_warning' | 'duplicate_entry';
type AlertSeverity = 'info' | 'warning' | 'critical';

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  isRead: boolean;
  createdAt: string;
  vehiclePlate?: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onResolve: (id: string) => void;
  onMarkRead: (id: string) => void;
}

const alertIcons: Record<AlertType, React.ReactNode> = {
  overdue: <Clock className="h-4 w-4" />,
  unapproved_exit: <Ban className="h-4 w-4" />,
  unknown_plate: <Car className="h-4 w-4" />,
  after_hours: <Clock className="h-4 w-4" />,
  capacity_warning: <AlertTriangle className="h-4 w-4" />,
  duplicate_entry: <Car className="h-4 w-4" />,
};

const severityColors: Record<AlertSeverity, string> = {
  info: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  warning: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-600 border-red-500/30',
};

const AlertsPanel = ({ alerts, onResolve, onMarkRead }: AlertsPanelProps) => {
  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Alerts
          </CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} new</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>No active alerts</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    alert.isRead ? 'bg-background' : 'bg-accent/50'
                  }`}
                  onClick={() => !alert.isRead && onMarkRead(alert.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-full p-2 ${severityColors[alert.severity]} border`}>
                      {alertIcons[alert.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.message}</p>
                      {alert.vehiclePlate && (
                        <p className="text-xs font-mono text-muted-foreground">{alert.vehiclePlate}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolve(alert.id);
                      }}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;
