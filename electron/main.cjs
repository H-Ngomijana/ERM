const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
// Determine development mode without importing ESM-only packages
const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;
let backendProcess;
let frontendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/garage-icon.png')
  });

  // Load the app from Vite dev server or built app
  const startUrl = isDev
    ? 'http://localhost:5173' // Vite dev server port
    : `file://${path.join(__dirname, '../dist/index.html')}`; // Built app

  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Kill backend when window closes
    if (backendProcess) {
      backendProcess.kill();
    }
    if (frontendProcess) {
      frontendProcess.kill();
    }
  });
}

function startBackendServer() {
  return new Promise((resolve) => {
    console.log('Starting backend server...');
    
    // Check the Node.js server location
    const serverPath = path.join(__dirname, '../server/src/index.js');
    const fallbackPath = path.join(__dirname, '../server/index.js');
    
    const actualPath = require('fs').existsSync(serverPath) ? serverPath : fallbackPath;
    
    backendProcess = spawn('node', [actualPath], {
      cwd: path.join(__dirname, '../server'),
      stdio: 'inherit',
      shell: true
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
    });

    // Give backend time to start
    setTimeout(resolve, 2000);
  });
}

function startFrontendServer() {
  return new Promise((resolve) => {
    console.log('Starting frontend development server...');
    
    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: __dirname.replace(/electron$/, ''), // Go to root directory
      stdio: 'inherit',
      shell: true
    });

    frontendProcess.on('error', (err) => {
      console.error('Failed to start frontend:', err);
    });

    // Give frontend time to start
    setTimeout(resolve, 5000);
  });
}

app.on('ready', async () => {
  try {
    // Start servers
    await startBackendServer();
    await startFrontendServer();
    
    // Create window after servers are ready
    createWindow();
  } catch (err) {
    console.error('Error starting application:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Kill processes before quitting
  if (backendProcess) {
    backendProcess.kill();
  }
  if (frontendProcess) {
    frontendProcess.kill();
  }
  
  // On macOS, keep app active until user explicitly closes it
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
