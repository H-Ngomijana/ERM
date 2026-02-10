

# 🚗 Garage Management System with ERM Logic

## Overview
A full-stack web application for managing garage operations with automated vehicle entry/exit tracking via ANPR cameras, Enterprise Risk Management rules, and SMS/WhatsApp notifications for client payment approvals.

---

## 🔐 Authentication & Security

### Admin Login System
- Secure admin authentication with email/password
- Role-based access control (Admin, Manager, Operator)
- Session management with automatic timeout
- All actions logged with admin ID and timestamp

---

## 📊 Admin Dashboard (Main Hub)

### Live Garage View
- Real-time list of all vehicles currently inside the garage
- Color-coded status indicators:
  - 🟢 **Entered** - Just arrived
  - 🔵 **In Service** - Being worked on
  - 🟡 **Awaiting Approval** - Pending client response
  - 🟢 **Ready** - Work complete, approved
  - ⚪ **Exited** - Left the garage

### Vehicle Cards Display
- License plate number (large, prominent)
- Entry timestamp and duration
- Current status with visual indicator
- CCTV snapshot thumbnail
- Quick action buttons (view details, send approval, mark exit)

### Alerts Panel
- Overdue vehicles (exceeded allowed stay)
- Unpaid/unapproved exits attempted
- Unknown plates detected
- After-hours entries
- Capacity warnings

### Statistics Overview
- Current occupancy vs capacity
- Vehicles processed today
- Pending approvals count
- Average stay duration

---

## 🚙 Vehicle Entry Flow (CCTV Integration)

### ANPR API Endpoint
- Secure endpoint to receive camera data
- Accepts: plate number, timestamp, camera ID, image reference

### Automated Validation (ERM Rules)
- ✅ Check plate not already inside (prevent duplicates)
- ✅ Verify garage capacity not exceeded
- ✅ Validate entry time within allowed hours
- ✅ Flag unknown/new plates for admin review

### On Valid Entry
- Create entry record with status "INSIDE"
- Store CCTV snapshot reference
- Write to immutable audit log
- Notify admin of new arrival
- If plate linked to known client → send SMS notification

---

## 💳 Payment & Approval System

### Admin Initiates Approval
- Select vehicle from dashboard
- Enter repair/service cost
- Add optional notes/description
- Click "Send for Approval"

### SMS/WhatsApp Notification to Client
- Message format: "Your vehicle [PLATE] repair cost: $X. Reply APPROVE or REJECT"
- Include link to view details (optional)
- Automated delivery via SMS gateway

### Approval Tracking
- Pending approvals list in dashboard
- Client response logged with timestamp
- Status updates: Approved / Rejected
- Admin can view approval history

### Approval States
- **Pending** - Awaiting client response
- **Approved** - Client confirmed
- **Rejected** - Client declined
- **Expired** - No response within time limit

---

## 🚪 Exit Control System

### Exit Detection Options
- ANPR camera detects vehicle leaving
- Admin manually triggers exit

### Exit Validation (ERM Rules)
- ✅ Payment/approval status verified
- ✅ No active risk flags
- ✅ All services marked complete

### Blocking Rules
- **Cannot exit if:** Unapproved or payment pending
- Admin can override with reason (logged to audit)

### On Valid Exit
- Update status to "EXITED"
- Record exit timestamp
- Complete session in history
- Close all related approvals

---

## 👥 Client Management

### Client Registry
- Name and contact details (phone for SMS)
- Linked vehicle plates
- Communication preferences
- Visit history summary

### Vehicle-Client Linking
- Associate plates with client profiles
- Auto-notify linked clients on entry
- View all vehicles for a client

---

## 📜 Audit & History

### Immutable Audit Log
- Every action recorded (no deletions)
- Logged: Action type, actor (admin ID), timestamp, details
- Searchable and filterable

### Vehicle History
- Complete entry/exit records
- All status changes
- Approval/payment records
- CCTV snapshots preserved

### Dispute Resolution
- Full timeline available for any dispute
- Export records as PDF
- Manual action notes with reasons

---

## ⚠️ ERM Rules Engine

### Entry Rules
| Rule | Action |
|------|--------|
| Duplicate plate entry | Block + Alert |
| Unknown plate | Allow + Flag for review |
| After-hours entry | Allow + Alert admin |
| Capacity exceeded | Block + Alert |

### Time Rules
| Rule | Action |
|------|--------|
| Vehicle exceeds 24h | Yellow alert |
| Vehicle exceeds 48h | Red alert + Escalate |
| Service overdue | Notify admin |

### Financial Rules
| Rule | Action |
|------|--------|
| Exit without approval | Block |
| Price modification | Log with reason required |
| Admin override | Must provide reason |

### Audit Rules
| Rule | Enforcement |
|------|-------------|
| Record deletion | Not possible (append-only) |
| Manual actions | Require admin ID + reason |
| Status changes | Automatic timestamp |

---

## 🔔 Notifications

### Admin Notifications
- New vehicle entry alerts
- Overdue vehicle warnings
- Approval responses received
- Exit attempts blocked

### Client Notifications (SMS/WhatsApp)
- Vehicle arrival confirmation
- Payment approval requests
- Service completion notices
- Receipt/summary on exit

---

## 📱 Technical Architecture

### Frontend
- React-based responsive admin dashboard
- Real-time updates via Supabase subscriptions
- Mobile-friendly for tablet use in garage

### Backend
- Supabase (PostgreSQL database)
- Edge functions for ANPR webhook, SMS gateway
- Row-level security for data protection

### Database Tables
- `vehicles` - Plate registry
- `clients` - Customer information
- `garage_entries` - Entry/exit records
- `approvals` - Payment approval tracking
- `audit_logs` - Immutable action history
- `user_roles` - Admin role management
- `alerts` - System notifications

### Integrations
- ANPR camera webhook endpoint
- SMS/WhatsApp gateway (Twilio or similar)

