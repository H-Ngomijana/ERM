import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'http://localhost:4000/api/gate';

export interface Camera {
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

export function useCameraManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCameras = async (): Promise<Camera[]> => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/cameras`);
      const data = await response.json();
      if (data.ok) {
        return data.cameras || [];
      }
      throw new Error(data.error);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load cameras'
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const generateRtspUrl = async (dvr_ip: string, dvr_username: string, dvr_password: string, channel_number: number): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE}/cameras/generate-rtsp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dvr_ip, dvr_username, dvr_password, channel_number })
      });

      const data = await response.json();
      if (data.ok) {
        return data.rtsp_url;
      }
      toast({
        title: 'Error',
        description: data.error || 'Failed to generate RTSP URL'
      });
      return null;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate RTSP URL'
      });
      return null;
    }
  };

  const testConnection = async (rtsp_url: string, camera_name?: string) => {
    try {
      const response = await fetch(`${API_BASE}/cameras/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rtsp_url, camera_name })
      });

      const data = await response.json();
      if (data.ok) {
        return data;
      }
      throw new Error(data.error);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Connection test failed'
      });
      return null;
    }
  };

  const addCamera = async (camera: Omit<Camera, 'id' | 'camera_id' | 'created_at'>) => {
    try {
      const response = await fetch(`${API_BASE}/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(camera)
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: 'Success',
          description: data.message || 'Camera registered successfully'
        });
        return data.camera;
      }
      throw new Error(data.error);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to register camera'
      });
      return null;
    }
  };

  const testExistingCamera = async (camera_id: string, rtsp_url: string) => {
    try {
      setTesting(camera_id);
      const testResult = await testConnection(rtsp_url);
      if (testResult) {
        // Update status in database
        const response = await fetch(`${API_BASE}/cameras/${camera_id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connection_status: testResult.status,
            last_tested: testResult.lastTested
          })
        });

        if (response.ok) {
          toast({
            title: 'Success',
            description: 'Camera test passed'
          });
          return true;
        }
      }
      return false;
    } finally {
      setTesting(null);
    }
  };

  const deleteCamera = async (camera_id: string) => {
    try {
      setDeleting(camera_id);
      const response = await fetch(`${API_BASE}/cameras/${camera_id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: 'Success',
          description: 'Camera deleted'
        });
        return true;
      }
      throw new Error(data.error);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete camera'
      });
      return false;
    } finally {
      setDeleting(null);
    }
  };

  return {
    loading,
    testing,
    deleting,
    fetchCameras,
    generateRtspUrl,
    testConnection,
    addCamera,
    testExistingCamera,
    deleteCamera
  };
}
