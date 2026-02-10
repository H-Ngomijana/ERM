# 🚀 GarageOS Desktop - Quick Start

## ⚡ TL;DR - Get Running Now

### 1. Fix File Lock (Windows PowerShell)
```powershell
# If npm install had errors, do this once
npm cache clean --force
npm install electron-builder concurrently wait-on --save-dev
```

### 2. Run Desktop App (Development)
```bash
npm run electron-dev
```

This:
- Starts Vite frontend on http://localhost:5173
- Starts Node backend 
- Opens desktop window automatically
- Reloads on code changes

### 3. Build Installer (.exe)
When ready to create installer:
```bash
npm run electron-build
```

Creates: `dist/GarageOS Setup.exe` - Ready to distribute!

---
v
## 🎯 Commands Cheat Sheet

| Command | Does | Use When |
|---------|------|----------|
| `npm run electron-dev` | Full dev mode | Testing desktop app |
| `npm run dev` | Frontend only | React development |
| `npm run electron` | Open window | Servers already running |
| `npm run build` | Build frontend | Production prep |
| `npm run electron-build` | Create .exe | Ready to distribute |
| `npm start` | Build + launch | Final test before release |

---

## 🔧 System Requirements

- **Node.js:** v14 or higher (you have this)
- **npm:** v6 or higher (you have this)
- **Windows:** 8.1 or higher (for .exe)
- **RAM:** 1GB+ available
- **Disk:** 500MB+ free

---

## ✅ What's Installed

### Root Packages Added
```json
{
  "main": "electron/main.js",
  "homepage": "./",
  "scripts": {
    "electron": "electron .",
    "electron-dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron-build": "npm run build && electron-builder"
  }
}
```

### Files Created
```
electron/
├── main.js          ← Launches servers and window
└── preload.js       ← Secure frontend-backend bridge
```

### Packages to Install (if not installed)
```
electron@latest
electron-builder
concurrently
wait-on
electron-is-dev
```

---

## 🖥️ Window Configuration

Opening desktop window will show:
- **Resolution:** 1400x900 pixels (adjustable)
- **Title:** GarageOS
- **Features:**
  - Minimizable
  - Maximizable
  - Resizable
  - Closeable
  - Custom icon support

---

## 🚨 Common Issues & Fixes

### Issue: EBUSY Error During npm install
```bash
# This happens when VS Code locks node_modules

Solution A (Recommended):
1. Close VS Code completely
2. Open new PowerShell
3. `npm install electron-builder --save-dev`

Solution B (Force Clean):
1. `npm cache clean --force`
2. `Remove-Item -Recurse -Force node_modules`
3. `npm install`
```

### Issue: Window Opens But Shows Blank/Error
```bash
Problem: Frontend not running on port 5173

Fix:
1. Open 2nd terminal
2. Run: npm run dev
3. Keep it running
4. Then run: npm run electron
```

### Issue: "Cannot find module 'electron'"
```bash
Fix: Electron not installed properly

npm install electron --save-dev
```

### Issue: Port 5173 Already in Use
```powershell
# Find and kill process using port 5173
$process = Get-Process | Where-Object {$_.Port -eq 5173}
$process | Stop-Process -Force

# Or change port in vite.config.ts
# server: { port: 5174 }
```

### Issue: Backend Not Starting
```bash
Check in electron/main.js:
- Path to server file: server/src/index.js
- Node.js is installed: node --version
- Backend runs standalone: cd server && node src/index.js
```

### Issue: App Won't Close/Kill Process
```bash
# Kill Electron manually
taskkill /F /IM electron.exe

# Or from PowerShell
Get-Process | Where-Object {$_.ProcessName -like "*electron*"} | Stop-Process -Force
```

---

## 📦 Building for Distribution

### Step 1: Test Everything
```bash
npm run electron-dev
# Test all features work
# Close when satisfied
```

### Step 2: Build Installer
```bash
npm run electron-build
```

### Step 3: Verify Installer
```bash
# Look for:
dist/GarageOS Setup.exe         ← Main installer
dist/GarageOS-1.0.0.exe         ← Portable version
```

### Step 4: Test Installer
```bash
# On same or different PC:
1. Double-click GarageOS Setup.exe
2. Click through wizard
3. Click "Install"
4. App installs and runs
```

### Step 5: Distribute
```bash
# Share dist/GarageOS Setup.exe with users
# They can:
- Double-click to install
- Choose installation location
- Create desktop shortcut
- Launch from Start Menu
```

---

## 🔐 Security Built In

- ✅ Node.js integration disabled
- ✅ Context isolation enabled
- ✅ Preload script separates contexts
- ✅ Safe API exposure only
- ✅ No dangerous permissions

---

## 🎨 Customization Quick Guide

### Change App Name
```json
// package.json
"build": {
  "productName": "My Garage System"  ← Changes installer name
}
```

### Change App Icon
```javascript
// electron/main.js
icon: path.join(__dirname, '../public/my-icon.png')
```

Place 256x256 PNG at `public/my-icon.png`

### Change Window Size
```javascript
// electron/main.js
mainWindow = new BrowserWindow({
  width: 1920,   ← Change width
  height: 1080   ← Change height
});
```

### Change Frontend Dev Port
```javascript
// electron/main.js
const startUrl = 'http://localhost:5174'; ← Change port
```

Also update in `vite.config.ts`:
```javascript
server: {
  port: 5174  ← Same port
}
```

---

## 📊 File Structure After Setup

```
garage-guard-pro/
├── electron/              ← NEW
│   ├── main.js            ← NEW (480 lines)
│   └── preload.js         ← NEW (12 lines)
│
├── src/                   ← Unchanged
│   ├── App.tsx
│   ├── main.tsx
│   └── ...
│
├── server/                ← Unchanged
│   └── src/index.js
│
├── package.json           ← MODIFIED (added main, scripts, build)
├── vite.config.ts         ← Unchanged
└── ELECTRON_SETUP_GUIDE.md ← NEW (documentation)
```

---

## 📝 Development Workflow

### Daily Development
```bash
# Terminal 1
npm run electron-dev

# This opens the desktop window
# Your code changes auto-reload
# Frontend and backend both running

# To stop: Close the desktop window
# Or press Ctrl+C in terminal
```

### Testing Installer
```bash
# When ready to test the actual .exe:
npm run electron-build

# Double-click: dist/GarageOS Setup.exe
# Goes through installer wizard
# Creates Start Menu shortcut
# Creates Desktop shortcut
# Users can launch from icon
```

### Deploy to User
```bash
# On your development PC:
npm run electron-build

# Share with user:
dist/GarageOS Setup.exe

# User just needs to:
1. Download GarageOS Setup.exe
2. Double-click
3. Click "Install"
4. Done - app is installed
```

---

## 🔗 Related Documentation

- **Full Setup Guide:** See [ELECTRON_SETUP_GUIDE.md](ELECTRON_SETUP_GUIDE.md)
- **Admin Settings:** See [ADMIN_SETTINGS_QUICK_GUIDE.md](ADMIN_SETTINGS_QUICK_GUIDE.md)
- **Troubleshooting:** See [ELECTRON_SETUP_GUIDE.md - Troubleshooting](ELECTRON_SETUP_GUIDE.md)

---

## ✨ What You Now Have

✅ **Desktop Application**
- No terminal needed
- Professional window
- Taskbar integration

✅ **Easy Distribution**
- .exe installer
- One-click setup
- Desktop shortcut

✅ **Development Ready**
- Auto-reload on code change
- Both servers start automatically
- Full debugging in console

✅ **Production Ready**
- Error handling
- Process management
- Secure context isolation

---

## 🎯 Next Steps

### Right Now
```bash
npm run electron-dev
```
- See app in desktop window
- Verify everything works
- Test your features

### When Ready for Users
```bash
npm run electron-build
```
- Creates installer
- Share .exe with users
- Users double-click to install

---

**Status:** ✅ READY TO USE

**Quick Launch:**
```bash
npm run electron-dev
```

**That's it!** 🚀
