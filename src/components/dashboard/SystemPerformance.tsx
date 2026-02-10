import { useEffect, useState, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingUp, Camera, Users } from 'lucide-react';

interface SystemStats {
  totalEntriesToday: number;
  cameraEntries: number;
  manualEntries: number;
  activeVehicles: number;
  totalProcessed: number;
  entryTrend: Array<{ time: string; entries: number; device: string }>;
}

export const SystemPerformance = memo(() => {
  const [stats, setStats] = useState<SystemStats>({
    totalEntriesToday: 0,
    cameraEntries: 0,
    manualEntries: 0,
    activeVehicles: 0,
    totalProcessed: 0,
    entryTrend: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Total entries today
      const { count: totalToday } = await supabase
        .from('garage_entries')
        .select('*', { count: 'exact', head: true })
        .gte('entry_time', today);

      // Camera entries (entries with snapshot_url)
      const { count: cameraCount } = await supabase
        .from('garage_entries')
        .select('*', { count: 'exact', head: true })
        .gte('entry_time', today)
        .not('snapshot_url', 'is', null);

      // Manual entries (entries with 'Manual entry' in notes)
      const { count: manualCount } = await supabase
        .from('garage_entries')
        .select('*', { count: 'exact', head: true })
        .gte('entry_time', today)
        .ilike('notes', '%Manual entry%');

      // Active vehicles (status = 'inside' or 'in_service')
      const { count: activeCount } = await supabase
        .from('garage_entries')
        .select('*', { count: 'exact', head: true })
        .in('status', ['inside', 'in_service']);

      // Entry trend data (last 24 hours, grouped by 2-hour intervals)
      const { data: entries } = await supabase
        .from('garage_entries')
        .select('entry_time, snapshot_url')
        .gte('entry_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('entry_time');

      // Process trend data
      const trendMap: { [key: string]: { camera: number; manual: number } } = {};
      entries?.forEach((entry: any) => {
        const date = new Date(entry.entry_time);
        const hour = Math.floor(date.getHours() / 2) * 2;
        const key = `${hour}:00`;

        if (!trendMap[key]) {
          trendMap[key] = { camera: 0, manual: 0 };
        }

        if (entry.snapshot_url) {
          trendMap[key].camera++;
        } else {
          trendMap[key].manual++;
        }
      });

      const entryTrend = Object.entries(trendMap).map(([time, data]) => [
        { time, entries: data.camera, device: 'Camera' },
        { time, entries: data.manual, device: 'Manual' },
      ]).flat();

      setStats({
        totalEntriesToday: totalToday || 0,
        cameraEntries: cameraCount || 0,
        manualEntries: manualCount || 0,
        activeVehicles: activeCount || 0,
        totalProcessed: totalToday || 0,
        entryTrend,
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pieData = [
    { name: 'Camera', value: stats.cameraEntries, color: '#3b82f6' },
    { name: 'Manual', value: stats.manualEntries, color: '#10b981' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntriesToday}</div>
            <p className="text-xs text-muted-foreground">Camera + Manual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Camera Entries</CardTitle>
            <Camera className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.cameraEntries}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEntriesToday > 0
                ? `${Math.round((stats.cameraEntries / stats.totalEntriesToday) * 100)}%`
                : '0%'}{' '}
              of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Entries</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.manualEntries}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEntriesToday > 0
                ? `${Math.round((stats.manualEntries / stats.totalEntriesToday) * 100)}%`
                : '0%'}{' '}
              of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeVehicles}</div>
            <p className="text-xs text-muted-foreground">Currently in garage</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pie Chart - Entry Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Entry Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.totalEntriesToday > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No entries today
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Entry Trend (Last 24 Hours)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.entryTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.entryTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="entries" fill="#3b82f6" name="Camera" stackId="a" />
                  <Bar dataKey="entries" fill="#10b981" name="Manual" stackId="b" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
