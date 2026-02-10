import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, RotateCw, Trash2, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Camera {
  id: string;
  camera_id: string;
  name: string;
  dvr_ip: string;
  dvr_username: string;
  dvr_password?: string;
  channel_number: number;
  rtsp_url: string;
  connection_status: 'online' | 'offline' | 'untested';
  last_tested: string;
  created_at: string;
}

export default function CameraSettings() {
  const { toast } = useToast();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [generatedRtsp, setGeneratedRtsp] = useState<string | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    dvr_ip: '',
    dvr_username: '',
    dvr_password: '',
    channel_number: '101'
  });

  // Fetch cameras on mount
  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:4000/api/gate/cameras');
      const data = await response.json();
      if (data.ok) {
        setCameras(data.cameras || []);
      }
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
      toast({ title: 'Error', description: 'Failed to load cameras' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRtsp = async () => {
    try {
      if (!formData.dvr_ip || !formData.dvr_username || !formData.dvr_password) {
        toast({ title: 'Error', description: 'Please fill in DVR IP, username, and password' });
        return;
      }

      const response = await fetch('http://localhost:4000/api/gate/cameras/generate-rtsp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dvr_ip: formData.dvr_ip,
          dvr_username: formData.dvr_username,
          dvr_password: formData.dvr_password,
          channel_number: parseInt(formData.channel_number)
        })
      });

      const data = await response.json();
      if (data.ok) {
        setGeneratedRtsp(data.rtsp_url);
        toast({ title: 'Success', description: 'RTSP URL generated' });
      } else {
        toast({ title: 'Error', description: data.error });
      }
    } catch (error) {
      console.error('Failed to generate RTSP:', error);
      toast({ title: 'Error', description: 'Failed to generate RTSP URL' });
    }
  };

  const handleTestConnection = async () => {
    try {
      if (!generatedRtsp) {
        toast({ title: 'Error', description: 'Please generate RTSP URL first' });
        return;
      }

      setTesting('new');
      const response = await fetch('http://localhost:4000/api/gate/cameras/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rtsp_url: generatedRtsp,
          camera_name: formData.name
        })
      });

      const data = await response.json();
      if (data.ok) {
        setSnapshotUrl(data.snapshotUrl);
        toast({ title: 'Success', description: data.message });
      } else {
        toast({ title: 'Error', description: data.error });
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      toast({ title: 'Error', description: 'Connection test failed' });
    } finally {
      setTesting(null);
    }
  };

  const handleAddCamera = async () => {
    try {
      if (!formData.name || !formData.dvr_ip || !generatedRtsp) {
        toast({ title: 'Error', description: 'Please fill in all fields and generate RTSP URL' });
        return;
      }

      const response = await fetch('http://localhost:4000/api/gate/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          dvr_ip: formData.dvr_ip,
          dvr_username: formData.dvr_username,
          dvr_password: formData.dvr_password,
          channel_number: parseInt(formData.channel_number),
          rtsp_url: generatedRtsp
        })
      });

      const data = await response.json();
      if (data.ok) {
        toast({ title: 'Success', description: data.message });
        setFormData({ name: '', dvr_ip: '', dvr_username: '', dvr_password: '', channel_number: '101' });
        setGeneratedRtsp(null);
        setSnapshotUrl(null);
        fetchCameras();
      } else {
        toast({ title: 'Error', description: data.error });
      }
    } catch (error) {
      console.error('Failed to add camera:', error);
      toast({ title: 'Error', description: 'Failed to register camera' });
    }
  };

  const handleTestExistingCamera = async (cameraId: string, rtspUrl: string) => {
    try {
      setTesting(cameraId);
      const response = await fetch('http://localhost:4000/api/gate/cameras/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rtsp_url: rtspUrl })
      });

      const data = await response.json();
      if (data.ok) {
        // Update camera status
        const updateResponse = await fetch(`http://localhost:4000/api/gate/cameras/${cameraId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connection_status: data.status,
            last_tested: data.lastTested
          })
        });

        if (updateResponse.ok) {
          toast({ title: 'Success', description: 'Camera test passed' });
          fetchCameras();
        }
      } else {
        toast({ title: 'Error', description: 'Connection test failed' });
      }
    } catch (error) {
      console.error('Failed to test camera:', error);
      toast({ title: 'Error', description: 'Test failed' });
    } finally {
      setTesting(null);
    }
  };

  const handleDeleteCamera = async (cameraId: string) => {
    if (!window.confirm('Are you sure you want to delete this camera?')) return;

    try {
      setDeleting(cameraId);
      const response = await fetch(`http://localhost:4000/api/gate/cameras/${cameraId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.ok) {
        toast({ title: 'Success', description: 'Camera deleted' });
        fetchCameras();
      } else {
        toast({ title: 'Error', description: data.error });
      }
    } catch (error) {
      console.error('Failed to delete camera:', error);
      toast({ title: 'Error', description: 'Failed to delete camera' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">CCTV Camera Management</h1>
          <p className="text-muted-foreground mt-1">Connect and manage DVR/NVR cameras via RTSP</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Registered Cameras ({cameras.length})</TabsTrigger>
            <TabsTrigger value="add">Add New Camera</TabsTrigger>
          </TabsList>

          {/* Cameras List */}
          <TabsContent value="list" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Loading cameras...</p>
                </CardContent>
              </Card>
            ) : cameras.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No cameras registered yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Go to the "Add New Camera" tab to register your first camera</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {cameras.map((camera) => (
                  <Card key={camera.id}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div>
                        <CardTitle className="text-lg">{camera.name}</CardTitle>
                        <CardDescription className="mt-1">
                          DVR: {camera.dvr_ip} • Channel {camera.channel_number}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {camera.connection_status === 'online' ? (
                          <div className="flex items-center gap-1 text-green-600 text-sm">
                            <Wifi className="h-4 w-4" />
                            Online
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600 text-sm">
                            <WifiOff className="h-4 w-4" />
                            {camera.connection_status}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">RTSP URL</p>
                          <p className="font-mono text-xs truncate">{camera.rtsp_url}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Tested</p>
                          <p className="text-xs">
                            {camera.last_tested
                              ? new Date(camera.last_tested).toLocaleString()
                              : 'Never'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestExistingCamera(camera.id, camera.rtsp_url)}
                          disabled={testing === camera.id}
                        >
                          <RotateCw className="h-4 w-4 mr-2" />
                          {testing === camera.id ? 'Testing...' : 'Test'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteCamera(camera.id)}
                          disabled={deleting === camera.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deleting === camera.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Add Camera Form */}
          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Register New DVR Camera</CardTitle>
                <CardDescription>Enter your DVR/NVR connection details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Camera Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Camera Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Camera Name</label>
                      <Input
                        placeholder="e.g., Gate Camera, Entrance"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* DVR Connection */}
                <div className="space-y-4">
                  <h3 className="font-semibold">DVR/NVR Connection Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">DVR IP Address</label>
                      <Input
                        placeholder="e.g., 192.168.1.100"
                        value={formData.dvr_ip}
                        onChange={(e) => setFormData({ ...formData, dvr_ip: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Channel Number</label>
                      <Input
                        type="number"
                        placeholder="e.g., 101"
                        value={formData.channel_number}
                        onChange={(e) => setFormData({ ...formData, channel_number: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Username</label>
                      <Input
                        placeholder="e.g., admin"
                        value={formData.dvr_username}
                        onChange={(e) => setFormData({ ...formData, dvr_username: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <div className="relative mt-1">
                        <Input
                          type={showPassword.form ? 'text' : 'password'}
                          placeholder="Enter password"
                          value={formData.dvr_password}
                          onChange={(e) => setFormData({ ...formData, dvr_password: e.target.value })}
                        />
                        <button
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword({ ...showPassword, form: !showPassword.form })}
                          type="button"
                        >
                          {showPassword.form ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generated RTSP URL */}
                {generatedRtsp && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">RTSP URL Generated</p>
                        <p className="font-mono text-xs text-blue-800 dark:text-blue-400 break-all mt-1">{generatedRtsp}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Snapshot Preview */}
                {snapshotUrl && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Camera Preview</h3>
                    <img src={snapshotUrl} alt="Camera snapshot" className="w-full h-48 object-cover rounded-lg border" />
                    <p className="text-xs text-green-600">✓ Connection successful</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                  <Button onClick={handleGenerateRtsp} variant="outline" className="flex-1">
                    Generate RTSP URL
                  </Button>
                  <Button
                    onClick={handleTestConnection}
                    variant="outline"
                    disabled={!generatedRtsp || testing === 'new'}
                    className="flex-1"
                  >
                    {testing === 'new' ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button
                    onClick={handleAddCamera}
                    disabled={!generatedRtsp || !snapshotUrl}
                    className="flex-1"
                  >
                    Save Camera
                  </Button>
                </div>

                {/* Info Box */}
                <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg flex gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-900 dark:text-amber-300">
                    <p className="font-medium">Common Channel Numbers:</p>
                    <p className="text-xs mt-1">101 = Channel 1, 102 = Channel 2, etc.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
