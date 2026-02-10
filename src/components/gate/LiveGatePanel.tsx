import React, { useEffect, useState } from 'react';

// LiveGatePanel: shows incoming CCTV detections in real-time
// - List of recent detections
// - Quick actions: Approve, Flag, Manual Edit
// - Shows camera health

export default function LiveGatePanel() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // Placeholder: subscribe to real-time channel or poll API
    // Replace with Supabase realtime subscription
    // Example: supabase.channel('garage:gate').on(...)
  }, []);

  return (
    <div className="p-4 bg-white shadow rounded">
      <h3 className="text-lg font-semibold mb-2">Live Gate</h3>
      <div className="space-y-2">
        {events.length === 0 && <div className="text-sm text-muted">No recent detections</div>}
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-3 p-2 border rounded">
            <img src={e.snapshot_url || '/placeholder.png'} alt="snap" className="w-20 h-12 object-cover" />
            <div className="flex-1">
              <div className="font-medium">{e.plate_number}</div>
              <div className="text-sm text-gray-500">{e.camera_id} • {e.confidence}%</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-sm">Approve</button>
              <button className="btn btn-ghost btn-sm">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
