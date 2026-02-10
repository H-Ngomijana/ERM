#!/bin/bash

# GarageOS Electron Setup Helper
# This script helps complete the Electron setup

echo "🚀 GarageOS Electron Setup Helper"
echo "=================================="
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
node_version=$(node --version)
echo "  Node.js: $node_version"

# Check npm
echo "✓ Checking npm..."
npm_version=$(npm --version)
echo "  npm: $npm_version"

# Check if electron is installed
echo "✓ Checking Electron..."
if [ -d "node_modules/electron" ]; then
    echo "  Electron: ✓ Installed"
else
    echo "  Electron: ✗ Not installed - installing now..."
    npm install electron --save-dev
fi

# Check other required packages
echo "✓ Checking development dependencies..."

packages=("electron-builder" "concurrently" "wait-on" "electron-is-dev")

for package in "${packages[@]}"; do
    if [ -d "node_modules/$package" ]; then
        echo "  $package: ✓"
    else
        echo "  $package: ✗ Installing..."
        npm install "$package" --save-dev
    fi
done

# Check if electron folder exists
echo "✓ Checking Electron files..."
if [ -f "electron/main.js" ] && [ -f "electron/preload.js" ]; then
    echo "  Electron files: ✓ Found"
else
    echo "  Electron files: ✗ Missing"
    exit 1
fi

# Verify package.json has electron config
echo "✓ Checking package.json configuration..."
if grep -q '"main": "electron/main.js"' package.json; then
    echo "  Electron main: ✓ Configured"
else
    echo "  Electron main: ✗ Not configured"
fi

echo ""
echo "✅ Setup verification complete!"
echo ""
echo "🎯 Ready to run:"
echo "   npm run electron-dev"
echo ""
echo "💡 Or build installer:"
echo "   npm run electron-build"
echo ""
