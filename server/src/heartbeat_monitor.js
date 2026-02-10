/*
Heartbeat Monitoring Scaffold
Monitors camera health and generates alerts for offline/delayed cameras.

Use with server-side job scheduler (e.g., node-cron or Bull/Redis queue)

Example integration in main server/index.js:
  const { createMonitor } = require('./heartbeat_monitor');
  heartbeatMonitor.start(supabase, { checkIntervalSec: 60, offlineThresholdSec: 300 });
*/

class HeartbeatMonitor {
  constructor(supabase, options = {}) {
    this.supabase = supabase;
    this.checkIntervalSec = options.checkIntervalSec || 60;
    this.offlineThresholdSec = options.offlineThresholdSec || 300; // 5 min
    this.interval = null;
    this.alertedCameras = new Map(); // Track which cameras we've already alerted for
  }

  async start() {
    console.log(`[HeartbeatMonitor] Starting with check interval ${this.checkIntervalSec}s, offline threshold ${this.offlineThresholdSec}s`);
    this.interval = setInterval(() => this.check(), this.checkIntervalSec * 1000);
    // Run once immediately
    this.check();
  }

  async stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('[HeartbeatMonitor] Stopped');
    }
  }

  async check() {
    try {
      const now = new Date();
      const thresholdTime = new Date(now.getTime() - this.offlineThresholdSec * 1000);

      // Find cameras that haven't reported in > threshold
      const { data: staleCamera, error: queryErr } = await this.supabase
        .from('cameras')
        .select('*')
        .lt('last_seen', thresholdTime.toISOString());

      if (queryErr) {
        console.error('[HeartbeatMonitor] Query error:', queryErr);
        return;
      }

      for (const camera of staleCamera || []) {
        const status = camera.status || 'unknown';

        // Only alert if not already alerted recently
        const lastAlert = this.alertedCameras.get(camera.camera_id);
        if (lastAlert && now.getTime() - lastAlert < 60000) continue; // Don't re-alert within 60s

        // Check if status is already offline
        if (status !== 'offline') {
          // Update camera status
          await this.supabase
            .from('cameras')
            .update({ status: 'offline' })
            .eq('camera_id', camera.camera_id);

          // Create alert
          await this.supabase
            .from('alerts')
            .insert([{
              type: 'camera_offline',
              severity: 'critical',
              message: `Camera ${camera.name || camera.camera_id} is offline (last seen ${thresholdTime.toISOString()})`,
              camera_id: camera.camera_id
            }]);

          console.log(`[HeartbeatMonitor] Alert created for offline camera: ${camera.camera_id}`);
          this.alertedCameras.set(camera.camera_id, now.getTime());
        }
      }
    } catch (err) {
      console.error('[HeartbeatMonitor] Check error:', err);
    }
  }
}

function createMonitor(supabase, options = {}) {
  return new HeartbeatMonitor(supabase, options);
}

export { HeartbeatMonitor, createMonitor };
