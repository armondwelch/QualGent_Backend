const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');
const { Server } = require('socket.io');

class WsScrcpyService {
  constructor() {
    this.activeStreams = new Map();
    this.wsScrcpyProcess = null;
    this.io = null;
  }

  /**
   * Initialize and start ws-scrcpy server
   */
  async initialize(httpServer) {
    // Initialize Socket.IO for control messages
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      path: '/socket.io'
    });

    // Start ws-scrcpy server
    await this.startWsScrcpyServer();

    // Socket.IO event handlers for control
    this.io.on('connection', (socket) => {
      console.log('Control socket connected:', socket.id);
      
      socket.on('start-stream', async (data) => {
        const { jobId, deviceId } = data;
        try {
          const streamInfo = await this.startDeviceStream(jobId, deviceId);
          socket.emit('stream-ready', streamInfo);
        } catch (error) {
          socket.emit('stream-error', { 
            jobId, 
            error: error.message 
          });
        }
      });

      socket.on('stop-stream', (data) => {
        const { jobId } = data;
        this.stopDeviceStream(jobId);
        socket.emit('stream-stopped', { jobId });
      });

      socket.on('get-active-streams', () => {
        socket.emit('active-streams', this.getActiveStreams());
      });

      socket.on('disconnect', () => {
        console.log('Control socket disconnected:', socket.id);
      });
    });

    console.log('ws-scrcpy service initialized');
  }

  /**
   * Start the ws-scrcpy server process
   */
  async startWsScrcpyServer() {
    return new Promise((resolve, reject) => {
      const wsScrcpyPath = process.env.WS_SCRCPY_PATH || '/opt/ws-scrcpy';
      
      // Start ws-scrcpy server with configuration
      this.wsScrcpyProcess = spawn('node', [
        path.join(wsScrcpyPath, 'dist', 'index.js'),
        '--port', '8886',
        '--no-cleanup',
        '--stay-awake',
        '--show-touches'
      ], {
        env: {
          ...process.env,
          ADB_PATH: '/opt/android-sdk/platform-tools/adb'
        },
        cwd: wsScrcpyPath
      });

      this.wsScrcpyProcess.stdout.on('data', (data) => {
        console.log(`ws-scrcpy: ${data}`);
        if (data.toString().includes('Listening on')) {
          console.log('ws-scrcpy server started successfully');
          resolve();
        }
      });

      this.wsScrcpyProcess.stderr.on('data', (data) => {
        console.error(`ws-scrcpy error: ${data}`);
      });

      this.wsScrcpyProcess.on('error', (error) => {
        console.error('Failed to start ws-scrcpy:', error);
        reject(error);
      });

      this.wsScrcpyProcess.on('exit', (code) => {
        console.log(`ws-scrcpy process exited with code ${code}`);
        this.wsScrcpyProcess = null;
      });

      // Give it some time to start
      setTimeout(() => {
        if (!this.wsScrcpyProcess) {
          reject(new Error('ws-scrcpy failed to start within timeout'));
        } else {
          resolve();
        }
      }, 5000);
    });
  }

  /**
   * Start streaming for a specific device
   */
  async startDeviceStream(jobId, deviceId) {
    if (this.activeStreams.has(jobId)) {
      return this.activeStreams.get(jobId);
    }

    console.log(`Starting ws-scrcpy stream for job ${jobId} on device ${deviceId}`);
    
    // Connect device via ADB first
    await this.connectDevice(deviceId);

    const streamInfo = {
      jobId,
      deviceId,
      startTime: Date.now(),
      // ws-scrcpy web interface URL
      webUrl: `http://localhost:8886`,
      // Direct WebSocket URL for H264 stream
      wsUrl: `ws://localhost:8886/ws?device=${deviceId}`,
      // Alternative URLs
      mirrorUrl: `http://localhost:8886/mirror/${deviceId}`,
      controlUrl: `ws://localhost:8886/control/${deviceId}`
    };

    this.activeStreams.set(jobId, streamInfo);
    
    // Notify via Socket.IO
    if (this.io) {
      this.io.emit('stream-started', streamInfo);
    }

    return streamInfo;
  }

  /**
   * Stop streaming for a job
   */
  stopDeviceStream(jobId) {
    const stream = this.activeStreams.get(jobId);
    if (stream) {
      console.log(`Stopping stream for job: ${jobId}`);
      
      // ws-scrcpy handles device disconnection automatically
      // Just remove from our tracking
      this.activeStreams.delete(jobId);
      
      // Notify via Socket.IO
      if (this.io) {
        this.io.emit('stream-ended', { jobId });
      }
    }
  }

  /**
   * Connect to device via ADB
   */
  async connectDevice(deviceId) {
    return new Promise((resolve, reject) => {
      const adbProcess = spawn('adb', ['connect', deviceId]);
      
      let output = '';
      adbProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      adbProcess.on('exit', (code) => {
        if (code === 0 && output.includes('connected')) {
          console.log(`Connected to device: ${deviceId}`);
          resolve();
        } else {
          reject(new Error(`Failed to connect to device ${deviceId}: ${output}`));
        }
      });
    });
  }

  /**
   * Get list of active streams
   */
  getActiveStreams() {
    return Array.from(this.activeStreams.values());
  }

  /**
   * Get device list
   */
  async getDeviceList() {
    return new Promise((resolve, reject) => {
      const adbProcess = spawn('adb', ['devices', '-l']);
      
      let output = '';
      adbProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      adbProcess.on('exit', (code) => {
        if (code === 0) {
          const lines = output.split('\n');
          const devices = [];
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && line.includes('device')) {
              const parts = line.split(/\s+/);
              const deviceId = parts[0];
              if (deviceId && deviceId !== 'List') {
                devices.push({
                  id: deviceId,
                  state: 'device',
                  info: line
                });
              }
            }
          }
          
          resolve(devices);
        } else {
          reject(new Error(`Failed to get device list: ${output}`));
        }
      });
    });
  }

  /**
   * Clean up and stop ws-scrcpy server
   */
  cleanup() {
    console.log('Cleaning up ws-scrcpy service...');
    
    // Clear all active streams
    this.activeStreams.clear();
    
    // Stop ws-scrcpy server
    if (this.wsScrcpyProcess) {
      this.wsScrcpyProcess.kill('SIGTERM');
      this.wsScrcpyProcess = null;
    }
    
    // Close Socket.IO
    if (this.io) {
      this.io.close();
    }
  }
}

module.exports = WsScrcpyService;