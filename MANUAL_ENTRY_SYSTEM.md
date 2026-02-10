# Dashboard Enhancement - Manual Entry & System Performance

## Overview
Enhanced the dashboard to display vehicle entries from **both manual entry and CCTV camera** sources equally, giving complete system visibility.

---

## Features Implemented

### 1. **Quick Entry Dialog** (New)
**File**: `src/components/dashboard/QuickEntryDialog.tsx`

- **Fast plate number entry** - Type plate and log entry instantly
- **Smart vehicle detection** - Auto-finds registered vehicles
- **Unregistered vehicle handling** - Creates temporary entry for new plates
- **Keyboard shortcuts** - Press Enter to submit
- **Real-time validation** - Shows warnings for unregistered vehicles

**How to use:**
1. Click "Quick Entry" button on Dashboard
2. Type plate number (e.g., "ABC123")
3. Press Enter or click "Log Entry"
4. Vehicle is instantly added to dashboard

---

### 2. **Manual Entry Dialog** (Enhanced)
**File**: `src/components/dashboard/ManualEntryDialog.tsx`

- **Registered vehicle selection** - Browse all vehicles from dropdown
- **Automatic client info** - Shows vehicle details and owner
- **Audit trail** - Records manual entries for compliance
- **Source tracking** - Marks as "Manual entry" in system

**How to use:**
1. Click "Manual Entry" button on Dashboard
2. Select vehicle from dropdown
3. Click "Log Entry"
4. Vehicle is added to active entries list

---

### 3. **System Performance Dashboard** (New)
**File**: `src/components/dashboard/SystemPerformance.tsx`

**Real-time metrics showing:**

#### Summary Cards (4 cards)
- **Total Entries Today** - Combined camera + manual count
- **Camera Entries** - CCTV-captured vehicles + percentage
- **Manual Entries** - Manually logged vehicles + percentage  
- **Active Vehicles** - Currently in garage

#### Visualizations

**Entry Distribution (Pie Chart)**
- Shows percentage breakdown of Camera vs Manual entries
- Color-coded: Blue (Camera), Green (Manual)

**Entry Trend Chart (Bar Chart)**
- Last 24 hours of entries grouped by 2-hour intervals
- Stacked bars showing Camera and Manual entries
- Real-time updates every 30 seconds

---

## How It Works

### Vehicle Entry Flow

```
┌─────────────────────────────────────────┐
│         Vehicle Enters Garage           │
└──────────┬──────────────────┬───────────┘
           │                  │
      ┌────▼──────┐   ┌──────▼───────┐
      │   CCTV    │   │   Manual     │
      │  Camera   │   │   Entry      │
      └────┬──────┘   └──────┬───────┘
           │                  │
           └──────────┬───────┘
                      │
           ┌──────────▼──────────┐
           │  garage_entries     │
           │  (unified table)    │
           └──────────┬──────────┘
                      │
           ┌──────────▼──────────┐
           │  Dashboard Display  │
           │  (shows all entries)│
           └─────────────────────┘
```

### Database Tables Used

**garage_entries** (unified entry tracking)
- `id` - Entry ID
- `vehicle_id` - FK to vehicles table
- `status` - inside, in_service, awaiting_approval, ready, exited
- `entry_time` - When vehicle entered
- `snapshot_url` - Camera snapshot (NULL for manual entries)
- `notes` - Source tracking (e.g., "Manual entry", "Manual entry - quick entry")

**vehicles** (vehicle registry)
- All registered vehicles
- Can be tagged for quick entry

---

## Dashboard Updates

### New Buttons Added
- **Quick Entry** 🔍 - Fastest way to log entries (plate number only)
- **Manual Entry** ➕ - Full vehicle selection from registry

### New Section Added
- **System Performance Overview** - Displays all performance metrics and charts

### Data Display
All entries now show:
- ✅ CCTV-captured vehicles
- ✅ Manually logged vehicles
- ✅ Mixed sources in same view
- ✅ Entry source in notes (for audit trail)

---

## Usage Examples

### Example 1: Quick Entry (Fastest)
```
Staff member at gate:
1. Tap "Quick Entry" button
2. Scan/type plate: "KBA123DEF"
3. Press Enter
✓ Vehicle logged instantly
```

### Example 2: Manual Entry (Preferred for registered vehicles)
```
Staff member in office:
1. Click "Manual Entry"
2. Select "KBA123DEF - Toyota Camry - John Doe"
3. Click "Log Entry"
✓ Vehicle logged with full details
```

### Example 3: CCTV Capture (Automatic)
```
Vehicle approaches camera:
1. ANPR system captures plate
2. Camera API logs entry automatically
✓ Vehicle logged with snapshot
```

---

## System Performance Tracking

The dashboard now tracks:

| Metric | Source | Tracked As |
|--------|--------|-----------|
| Total entries | Both | SUM (camera + manual) |
| Camera entries | CCTV | snapshot_url IS NOT NULL |
| Manual entries | Manual | notes LIKE '%Manual entry%' |
| Active vehicles | Both | status IN ('inside', 'in_service') |
| Entry trends | Both | Grouped by time, colored by source |

---

## Testing Checklist

- [ ] Click "Quick Entry" and log a plate number
- [ ] Click "Manual Entry" and select a vehicle
- [ ] Verify both types appear in "All" vehicles tab
- [ ] Check "Vehicles Today" stat increases
- [ ] Check System Performance shows camera + manual split
- [ ] Verify entry notes show source in audit trail
- [ ] Check that unregistered plates create temporary vehicles
- [ ] Verify real-time updates (charts refresh every 30s)

---

## Technical Details

### Components
- `ManualEntryDialog.tsx` - Vehicle selection dialog
- `QuickEntryDialog.tsx` - Plate number entry dialog
- `SystemPerformance.tsx` - Charts and metrics component

### Dashboard Updates
- Updated `Dashboard.tsx` to import and display new components
- Added `refetch()` callback to refresh data after entries logged
- Integration with `useGarageData` hook for real-time updates

### Dependencies
- **recharts** - Already installed for charts (v2.15.4)
- **date-fns** - Already installed for date formatting
- **supabase-js** - Already installed for database operations

---

## Notes

- Manual entries create "notes" field with source info for audit trail
- Unregistered vehicles can be logged as quick entries (auto-creates vehicle)
- All entries feed same `garage_entries` table - dashboard shows unified view
- System performance metrics update every 30 seconds
- Entry source visible in dashboard cards and chart colors
