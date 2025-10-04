"""Streaming service for device screen mirroring using ws-scrcpy."""
import asyncio
import subprocess
import logging
import os
from pathlib import Path
from django.conf import settings

logger = logging.getLogger(__name__)


class StreamingService:
    """Manages ws-scrcpy server and device streaming."""

    def __init__(self):
        self.active_streams = {}
        self.ws_scrcpy_process = None
        self.is_running = False

    async def initialize(self):
        """Start the ws-scrcpy server."""
        if self.is_running:
            logger.info("ws-scrcpy server is already running")
            return

        try:
            ws_scrcpy_path = getattr(settings, 'WS_SCRCPY_PATH', '/opt/ws-scrcpy')
            ws_scrcpy_index = Path(ws_scrcpy_path) / 'dist' / 'index.js'

            if not ws_scrcpy_index.exists():
                logger.warning(f"ws-scrcpy not found at {ws_scrcpy_index}")
                return

            # Start ws-scrcpy server - same arguments as JavaScript implementation
            self.ws_scrcpy_process = await asyncio.create_subprocess_exec(
                'node',
                str(ws_scrcpy_index),
                '--port', '8886',
                '--no-cleanup',
                '--stay-awake',
                '--show-touches',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(ws_scrcpy_path),
                env={
                    **dict(os.environ),
                    'ADB_PATH': '/usr/lib/android-sdk/platform-tools/adb'
                }
            )

            # Wait for startup confirmation
            await self._wait_for_startup()
            self.is_running = True
            logger.info("ws-scrcpy server started successfully on port 8886")

        except Exception as e:
            logger.error(f"Failed to start ws-scrcpy server: {e}", exc_info=True)
            raise

    async def _wait_for_startup(self):
        """Wait for ws-scrcpy to start."""
        timeout = 10
        start_time = asyncio.get_event_loop().time()

        while asyncio.get_event_loop().time() - start_time < timeout:
            # Check if process is still running
            if self.ws_scrcpy_process.returncode is not None:
                # Process has exited, read error output
                stderr = await self.ws_scrcpy_process.stderr.read()
                raise Exception(f"ws-scrcpy process exited: {stderr.decode()}")

            # Assume it started successfully if still running after 2 seconds
            if asyncio.get_event_loop().time() - start_time > 2:
                return

            await asyncio.sleep(0.5)

        raise Exception("ws-scrcpy server startup timeout")

    async def start_device_stream(self, job_id, device_id):
        """
        Start streaming for a device.

        Args:
            job_id: Job ID to associate with the stream
            device_id: Device ID (e.g., "35.192.2.213:5555")

        Returns:
            dict: Stream information
        """
        if job_id in self.active_streams:
            return self.active_streams[job_id]

        logger.info(f"Starting stream for job {job_id} on device {device_id}")

        # Connect device via ADB if not already connected
        await self._connect_device(device_id)

        stream_info = {
            'job_id': job_id,
            'device_id': device_id,
            'start_time': asyncio.get_event_loop().time(),
            'web_url': 'http://localhost:8886',
            'ws_url': f'ws://localhost:8886/ws?device={device_id}',
            'mirror_url': f'http://localhost:8886/mirror/{device_id}',
            'control_url': f'ws://localhost:8886/control/{device_id}'
        }

        self.active_streams[job_id] = stream_info
        return stream_info

    async def stop_device_stream(self, job_id):
        """Stop streaming for a job."""
        if job_id in self.active_streams:
            logger.info(f"Stopping stream for job {job_id}")
            del self.active_streams[job_id]
            return True
        return False

    async def _connect_device(self, device_id):
        """Connect to device via ADB."""
        try:
            process = await asyncio.create_subprocess_exec(
                'adb', 'connect', device_id,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            output = stdout.decode() + stderr.decode()

            if process.returncode == 0 and 'connected' in output.lower():
                logger.info(f"Connected to device: {device_id}")
            else:
                logger.warning(f"ADB connect returned: {output}")
        except Exception as e:
            logger.error(f"Error connecting to device {device_id}: {e}")

    def get_active_streams(self):
        """Get list of active streams."""
        return list(self.active_streams.values())

    async def get_device_list(self):
        """Get list of connected ADB devices."""
        try:
            process = await asyncio.create_subprocess_exec(
                'adb', 'devices', '-l',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            output = stdout.decode()

            devices = []
            lines = output.strip().split('\n')

            for line in lines[1:]:  # Skip first line "List of devices attached"
                line = line.strip()
                if line and 'device' in line:
                    parts = line.split()
                    device_id = parts[0]
                    if device_id and device_id != 'List':
                        devices.append({
                            'id': device_id,
                            'state': 'device',
                            'info': line
                        })

            return devices
        except Exception as e:
            logger.error(f"Failed to get device list: {e}")
            return []

    def cleanup(self):
        """Clean up and stop ws-scrcpy server."""
        logger.info("Cleaning up streaming service...")

        self.active_streams.clear()

        if self.ws_scrcpy_process:
            try:
                self.ws_scrcpy_process.terminate()
                self.ws_scrcpy_process = None
            except Exception as e:
                logger.error(f"Error terminating ws-scrcpy process: {e}")

        self.is_running = False


# Global streaming service instance
streaming_service = StreamingService()
