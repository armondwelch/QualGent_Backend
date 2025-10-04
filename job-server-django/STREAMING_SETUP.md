# Streaming Setup with ws-scrcpy

This document explains how to set up device streaming functionality using ws-scrcpy.

## Installation

### 1. Install ws-scrcpy

```bash
# Clone ws-scrcpy repository
sudo git clone https://github.com/NetrisTV/ws-scrcpy.git /opt/ws-scrcpy

# Install dependencies
cd /opt/ws-scrcpy
sudo npm install

# Build the project
sudo npm run dist
```

### 2. Verify Installation

```bash
ls -la /opt/ws-scrcpy/dist/index.js
```

## Configuration

The `.env` file already contains the ws-scrcpy configuration:

```bash
WS_SCRCPY_PATH=/opt/ws-scrcpy
```

## API Endpoints

### Start Streaming

**POST** `/jobs/{job_id}/stream/`

Start streaming for a specific job (Android only).

```bash
curl -X POST http://localhost:8000/jobs/{job_id}/stream/ \
  -H "Content-Type: application/json" \
  -d '{"device_id": "35.192.2.213:5555"}'
```

Response:
```json
{
  "job_id": "xxx-xxx-xxx",
  "stream_info": {
    "job_id": "xxx-xxx-xxx",
    "device_id": "35.192.2.213:5555",
    "web_url": "http://localhost:8886",
    "ws_url": "ws://localhost:8886/ws?device=35.192.2.213:5555",
    "mirror_url": "http://localhost:8886/mirror/35.192.2.213:5555",
    "control_url": "ws://localhost:8886/control/35.192.2.213:5555"
  },
  "message": "ws-scrcpy stream started successfully",
  "instructions": {
    "web_interface": "Open http://localhost:8886 in your browser to view and control the device",
    "direct_stream": "Connect to ws://localhost:8886/ws?device=35.192.2.213:5555 for raw H264 stream"
  }
}
```

### Stop Streaming

**DELETE** `/jobs/{job_id}/stream/`

Stop streaming for a specific job.

```bash
curl -X DELETE http://localhost:8000/jobs/{job_id}/stream/
```

### List Active Streams

**GET** `/streams/`

Get list of all active streams.

```bash
curl http://localhost:8000/streams/
```

Response:
```json
{
  "streams": [
    {
      "job_id": "xxx-xxx-xxx",
      "device_id": "35.192.2.213:5555",
      "web_url": "http://localhost:8886",
      ...
    }
  ],
  "total_streams": 1
}
```

### List Devices

**GET** `/devices/`

Get list of all connected ADB devices.

```bash
curl http://localhost:8000/devices/
```

Response:
```json
{
  "devices": [
    {
      "id": "35.192.2.213:5555",
      "state": "device",
      "info": "35.192.2.213:5555 device"
    }
  ],
  "total_devices": 1
}
```

## Usage

### 1. Connect Device

Make sure your Android device is connected via ADB:

```bash
adb connect 35.192.2.213:5555
adb devices
```

### 2. Submit a Job

```bash
curl -X POST http://localhost:8000/jobs/ \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "test-org",
    "app_version_id": "v1.0.0",
    "test_path": "tests/tests.spec.ts",
    "priority": 1,
    "target": "android"
  }'
```

### 3. Start Streaming

```bash
curl -X POST http://localhost:8000/jobs/{job_id}/stream/
```

### 4. View Stream

Open http://localhost:8886 in your web browser to see the device screen and interact with it in real-time.

## Troubleshooting

### ws-scrcpy server not starting

Check if the path is correct:
```bash
ls -la /opt/ws-scrcpy/dist/index.js
```

Check if Node.js is installed:
```bash
node --version
```

### Device not showing in stream

Ensure device is connected:
```bash
adb devices
```

Reconnect if needed:
```bash
adb connect 35.192.2.213:5555
```

### Port 8886 already in use

Kill existing ws-scrcpy processes:
```bash
lsof -ti:8886 | xargs kill -9
```

## Architecture

The streaming service follows the same architecture as the Node.js implementation:

1. **Django Server** (port 8000) - REST API endpoints
2. **ws-scrcpy Server** (port 8886) - Separate Node.js process for device streaming
3. **StreamingService** - Python service that manages the ws-scrcpy process

The streaming service is initialized when the Django server starts and runs as a child process, providing isolation while maintaining control through the Django API.
