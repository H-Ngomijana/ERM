-- 📊 Database Performance Optimization SQL
-- Run these queries to improve database performance
-- Estimated runTime: 2-5 minutes

-- ============================================
-- 1. CREATE INDEXES FOR FAST QUERIES
-- ============================================

-- Index on garage_entries status (used in most queries)
CREATE INDEX IF NOT EXISTS idx_garage_entries_status 
ON public.garage_entries(status) 
WHERE status != 'exited';

-- Index on garage_entries vehicle_id (for joins)
CREATE INDEX IF NOT EXISTS idx_garage_entries_vehicle_id 
ON public.garage_entries(vehicle_id);

-- Index on garage_entries entry_time (for sorting/filtering by date)
CREATE INDEX IF NOT EXISTS idx_garage_entries_entry_time 
ON public.garage_entries(entry_time DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_garage_entries_composite 
ON public.garage_entries(status, entry_time DESC) 
WHERE status != 'exited';

-- Index on vehicles plate_number (for searching)
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number 
ON public.vehicles(plate_number);

-- Index on vehicles client_id (for joins)
CREATE INDEX IF NOT EXISTS idx_vehicles_client_id 
ON public.vehicles(client_id);

-- Index on alerts is_resolved (for queries)
CREATE INDEX IF NOT EXISTS idx_alerts_is_resolved 
ON public.alerts(is_resolved, created_at DESC) 
WHERE is_resolved = false;

-- Index on alerts created_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_alerts_created_at 
ON public.alerts(created_at DESC);

-- Index on approvals status (for counting pending)
CREATE INDEX IF NOT EXISTS idx_approvals_status 
ON public.approvals(status) 
WHERE status = 'pending';

-- ============================================
-- 2. OPTIMIZE TABLE STRUCTURE
-- ============================================

-- Analyze tables for query planner
ANALYZE public.garage_entries;
ANALYZE public.vehicles;
ANALYZE public.alerts;
ANALYZE public.approvals;
ANALYZE public.clients;

-- ============================================
-- 3. VACUUM TABLES (cleanup bloat)
-- ============================================

VACUUM ANALYZE public.garage_entries;
VACUUM ANALYZE public.vehicles;
VACUUM ANALYZE public.alerts;
VACUUM ANALYZE public.approvals;

-- ============================================
-- 4. ARCHIVE OLD DATA (optional)
-- ============================================

-- Delete audit logs older than 6 months
-- DELETE FROM public.audit_logs 
-- WHERE created_at < NOW() - INTERVAL '6 months';

-- Delete exited garage entries older than 1 year
-- DELETE FROM public.garage_entries 
-- WHERE status = 'exited' AND exit_time < NOW() - INTERVAL '1 year';

-- Delete resolved alerts older than 3 months
-- DELETE FROM public.alerts 
-- WHERE is_resolved = true AND resolved_at < NOW() - INTERVAL '3 months';

-- ============================================
-- 5. CHECK INDEX USAGE
-- ============================================

-- View which indexes are being used
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- View unused indexes
-- SELECT 
--   schemaname,
--   tablename,
--   indexname
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0
-- AND schemaname NOT IN ('pg_toast', 'pg_catalog')
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================
-- 6. QUERY OPTIMIZATION TIPS
-- ============================================

-- For counting unresolved alerts:
-- SELECT COUNT(*) FROM public.alerts WHERE is_resolved = false;
-- (Uses index: idx_alerts_is_resolved)

-- For listing today's entries:
-- SELECT * FROM public.garage_entries 
-- WHERE entry_time >= CURRENT_DATE 
-- ORDER BY entry_time DESC;
-- (Uses index: idx_garage_entries_entry_time)

-- For searching vehicles by plate:
-- SELECT * FROM public.vehicles 
-- WHERE plate_number = 'ABC123';
-- (Uses index: idx_vehicles_plate_number)

-- ============================================
-- 7. MONITORING QUERIES
-- ============================================

-- Check table sizes
-- SELECT 
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
-- SELECT 
--   query,
--   mean_time,
--   calls,
--   total_time
-- FROM pg_stat_statements
-- ORDER BY mean_time DESC
-- LIMIT 10;

-- ============================================
-- DONE! Performance improvements applied ✅
-- ============================================
