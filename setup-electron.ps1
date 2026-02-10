# GarageOS Electron Setup Helper (PowerShell)
# Run this to verify and complete Electron setup on Windows

Write-Host "🚀 GarageOS Electron Setup Helper" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""

# Check Node.js
Write-Host "✓ Checking Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  Node.js: ✗ Not found" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "✓ Checking npm..." -ForegroundColor Cyan
try {
    $npmVersion = npm --version
    Write-Host "  npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  npm: ✗ Not found" -ForegroundColor Red
    exit 1
}

# Check if electron is installed
Write-Host "✓ Checking Electron..." -ForegroundColor Cyan
if (Test-Path "node_modules\electron") {
    Write-Host "  Electron: ✓ Installed" -ForegroundColor Green
} else {
    Write-Host "  Electron: ✗ Not installed - installing now..." -ForegroundColor Yellow
    npm install electron --save-dev
}

# Check other required packages
Write-Host "✓ Checking development dependencies..." -ForegroundColor Cyan

$packages = @("electron-builder", "concurrently", "wait-on", "electron-is-dev")

foreach ($package in $packages) {
    if (Test-Path "node_modules\$package") {
        Write-Host "  $package`: ✓" -ForegroundColor Green
    } else {
        Write-Host "  $package`: ✗ Installing..." -ForegroundColor Yellow
        npm install $package --save-dev
    }
}

# Check if electron folder exists
Write-Host "✓ Checking Electron files..." -ForegroundColor Cyan
if ((Test-Path "electron\main.js") -and (Test-Path "electron\preload.js")) {
    Write-Host "  Electron files: ✓ Found" -ForegroundColor Green
} else {
    Write-Host "  Electron files: ✗ Missing" -ForegroundColor Red
    exit 1
}

# Verify package.json has electron config
Write-Host "✓ Checking package.json configuration..." -ForegroundColor Cyan
$packageJson = Get-Content package.json -Raw
if ($packageJson -match '"main":\s*"electron/main.js"') {
    Write-Host "  Electron main: ✓ Configured" -ForegroundColor Green
} else {
    Write-Host "  Electron main: ✗ Not configured" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Setup verification complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Ready to run:" -ForegroundColor Cyan
Write-Host "   npm run electron-dev" -ForegroundColor White
Write-Host ""
Write-Host "💡 Or build installer:" -ForegroundColor Cyan
Write-Host "   npm run electron-build" -ForegroundColor White
Write-Host ""

# Additional checks
Write-Host "📊 Additional Information:" -ForegroundColor Cyan
Write-Host "  Current directory: $(Get-Location)" -ForegroundColor White
Write-Host "  Node modules size: $(Get-Item node_modules -Recurse | Measure-Object -Sum Length | Select-Object -ExpandProperty Sum | Foreach {'{0:N0}' -f $_})" -ForegroundColor White
