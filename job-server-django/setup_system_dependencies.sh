#!/bin/bash
# System dependencies setup script for QualGent Django Backend

set -e

echo "=== Setting up system dependencies for QualGent Backend ==="

# Install Java (required for APK signature verification)
if ! command -v java &> /dev/null; then
    echo "Installing Java..."
    sudo apt update
    sudo apt install -y default-jdk
else
    echo "Java is already installed: $(java -version 2>&1 | head -1)"
fi

# Install Android Build Tools
if [ ! -d "/usr/lib/android-sdk/build-tools/33.0.0" ]; then
    echo "Installing Android Build Tools..."
    sudo mkdir -p /usr/lib/android-sdk/build-tools
    cd /tmp
    wget -q https://dl.google.com/android/repository/build-tools_r33-linux.zip
    unzip -q build-tools_r33-linux.zip
    sudo mv android-13 /usr/lib/android-sdk/build-tools/33.0.0
    rm build-tools_r33-linux.zip
    echo "Android Build Tools installed to /usr/lib/android-sdk/build-tools/33.0.0"
else
    echo "Android Build Tools already installed"
fi

# Install ADB if not present
if ! command -v adb &> /dev/null; then
    echo "Installing ADB..."
    sudo apt install -y android-tools-adb
else
    echo "ADB is already installed: $(adb --version | head -1)"
fi

# Install Node.js and npm if not present
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    echo "Visit: https://nodejs.org/ or use nvm"
    exit 1
else
    echo "Node.js and npm are installed: $(node --version) / $(npm --version)"
fi

# Install Appium drivers as npm packages in project
cd /home/aqw/project/QualGent_Backend
echo "Installing Appium drivers as npm packages..."
npm install appium-uiautomator2-driver@^3.7.11 appium-xcuitest-driver@^7.25.0

# Create .appium directory and symlink drivers
mkdir -p .appium/node_modules
ln -sf /home/aqw/project/QualGent_Backend/node_modules/appium-uiautomator2-driver .appium/node_modules/
ln -sf /home/aqw/project/QualGent_Backend/node_modules/appium-xcuitest-driver .appium/node_modules/

# Patch appwright to skip driver reinstallation
echo "Patching Appwright to skip driver reinstallation..."
sed -i '/async function installDriver(driverName) {/a\    return; // Skip driver reinstall - use existing compatible drivers' node_modules/appwright/dist/providers/appium.js

echo ""
echo "=== System dependencies setup complete ==="
echo ""
echo "Next steps:"
echo "1. Ensure JAVA_HOME is set in .env: JAVA_HOME=/usr/lib/jvm/default-java"
echo "2. Ensure ANDROID_HOME is set in .env: ANDROID_HOME=/usr/lib/android-sdk"
echo "3. Connect your Android device: adb connect <ip>:5555"
echo "4. Run: python manage.py setup_agents"
echo "5. Start scheduler: python manage.py run_scheduler"
