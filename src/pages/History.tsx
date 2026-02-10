import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, History as HistoryIcon, Loader2 } from 'lucide-react';
import { format, formatDistanceStrict } from 'date-fns';

interface HistoryEntry {
  id: string;
  status: 'inside' | 'in_service' | 'awaiting_approval' | 'ready' | 'exited';
  entry_time: string;
  exit_time: string | null;
  vehicles: {
    plate_number: string;
    clients: { name: string } | null;
  };
  approvals: {
    id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
  }[];
}

const statusColors: Record<string, string> = {
  inside: 'bg-green-500/20 text-green-600',
  in_service: 'bg-blue-500/20 text-blue-600',
  awaiting_approval: 'bg-yellow-500/20 text-yellow-600',
  ready: 'bg-emerald-500/20 text-emerald-600',
  exited: 'bg-gray-500/20 text-gray-500',
};

const History = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('garage_entries')
      .select(`
        id,
        status,
        entry_time,
        exit_time,
        vehicles (
          plate_number,
          clients (name)
        ),
        approvals (
          id,
          amount,
          status
        )
      `)
      .order('entry_time', { ascending: false })
      .limit(100);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setEntries(data as HistoryEntry[] || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredEntries = entries.filter((e) =>
    e.vehicles.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.vehicles.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateDuration = (entry: string, exit: string | null) => {
    const endTime = exit ? new Date(exit) : new Date();
    return formatDistanceStrict(new Date(entry), endTime);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Vehicle History</h1>
          <p className="text-muted-foreground">Complete entry/exit records</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by plate or owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No history found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plate Number</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Entry Time</TableHead>
                    <TableHead>Exit Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono font-bold">
                        {entry.vehicles.plate_number}
                      </TableCell>
                      <TableCell>{entry.vehicles.clients?.name || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(entry.entry_time), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {entry.exit_time
                          ? format(new Date(entry.exit_time), 'MMM d, yyyy HH:mm')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {calculateDuration(entry.entry_time, entry.exit_time)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[entry.status]}>
                          {entry.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entry.approvals.length > 0 ? (
                          <span className="font-medium">
                            ${entry.approvals[0].amount.toFixed(2)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default History;
