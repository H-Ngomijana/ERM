import React from 'react';

// VehicleDetailPanel: shows snapshot, timeline, client info, actions
export default function VehicleDetailPanel({ entry, onAction }: any) {
  if (!entry) return <div className="p-4">Select a vehicle to see details.</div>;

  const duration = entry.entry_time ? Math.floor((Date.now() - new Date(entry.entry_time).getTime()) / 60000) : 0;

  return (
    <div className="p-4 bg-white shadow rounded">
      <div className="flex gap-4">
        <img src={entry.snapshot_url || '/placeholder.png'} alt="snapshot" className="w-48 h-32 object-cover" />
        <div className="flex-1">
          <h3 className="text-xl font-semibold">{entry.plate_number}</h3>
          <div className="text-sm text-gray-600">Status: {entry.lifecycle_status || entry.status}</div>
          <div className="text-sm text-gray-600">Entered: {entry.entry_time}</div>
          <div className="text-sm text-gray-600">Duration: {duration} mins</div>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary" onClick={() => onAction('approve', entry)}>Approve</button>
            <button className="btn btn-warning" onClick={() => onAction('service', entry)}>Service</button>
            <button className="btn btn-outline" onClick={() => onAction('exit', entry)}>Mark Exit</button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="font-medium">Timeline</h4>
        <ul className="text-sm text-gray-700">
          {/* Timeline items placeholder */}
          <li>Entered: {entry.entry_time}</li>
        </ul>
      </div>
    </div>
  );
}
