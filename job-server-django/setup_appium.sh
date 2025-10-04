#!/bin/bash
# Setup script for Appium drivers

set -e

echo "=== Installing Appium and drivers ==="

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install Appium globally if not already installed
if ! command -v appium &> /dev/null; then
    echo "Installing Appium..."
    npm install -g appium@2.11.4
else
    echo "Appium is already installed: $(appium --version)"
fi

# Install UiAutomator2 driver for Android
echo "Installing UiAutomator2 driver for Android..."
appium driver install uiautomator2

# Install XCUITest driver for iOS
echo "Installing XCUITest driver for iOS..."
appium driver install xcuitest

# Verify installation
echo ""
echo "=== Installed drivers ==="
appium driver list --installed

echo ""
echo "=== Setup complete ==="
