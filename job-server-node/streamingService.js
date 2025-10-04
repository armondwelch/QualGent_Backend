const { spawn } = require('child_process');
const WebSocket = require('ws');
const { Server } = require('socket.io');

class StreamingService {
  constructor() {
    this.activeStreams = new Map();
    this.wss = null;
    this.io = null;
  }

  /**
   * Initialize WebSocket server for streaming
   */
  initializeWebSocketServer(httpServer) {
    // Initialize Socket.IO for real-time communication
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Initialize raw WebSocket server for scrcpy stream
    this.wss = new WebSocket.Server({ 
      port: 8886,
      path: '/stream'
    });

    this.wss.on('connection', (ws, req) => {
      const jobId = this.extractJobId(req.url);
      console.log(`WebSocket connection established for job: ${jobId}`);
      
      const stream = this.activeStreams.get(jobId);
      if (stream) {
        this.attachClientToStream(ws, stream);
      } else {
        ws.close(1011, 'Stream not found');
      }
    });

    // Socket.IO event handlers
    this.io.on('connection', (socket) => {
      console.log('Socket.IO client connected:', socket.id);
      
      socket.on('request-stream', async (data) => {
        const { jobId, deviceId } = data;
        try {
          const streamUrl = await this.startStream(jobId, deviceId);
          socket.emit('stream-ready', { jobId, streamUrl });
        } catch (error) {
          socket.emit('stream-error', { 
            jobId, 
            error: error.message 
          });
        }
      });

      socket.on('stop-stream', (data) => {
        const { jobId } = data;
        this.stopStream(jobId);
        socket.emit('stream-stopped', { jobId });
      });

      socket.on('disconnect', () => {
        console.log('Socket.IO client disconnected:', socket.id);
      });
    });

    console.log('Streaming services initialized on ports 8886 (WebSocket) and Socket.IO');
  }

  /**
   * Start streaming from a device
   */
  async startStream(jobId, deviceId) {
    if (this.activeStreams.has(jobId)) {
      console.log(`Stream already active for job: ${jobId}`);
      return this.getStreamUrl(jobId);
    }

    console.log(`Starting stream for job ${jobId} on device ${deviceId}`);
    
    // Start scrcpy process
    const scrcpyProcess = spawn('scrcpy', [
      '--serial', deviceId,
      '--no-playback',  // Don't show window on server (updated for v3.3.1)
      '--video-codec', 'h264',
      '--video-bit-rate', '2M',
      '--max-size', '1280',
      '--no-audio',
      '--stay-awake',
      '--show-touches'
    ], {
      env: {
        ...process.env,
        ADB_SERVER_SOCKET: `tcp:${deviceId}`
      }
    });

    const streamData = {
      process: scrcpyProcess,
      deviceId,
      startTime: Date.now(),
      clients: new Set()
    };

    this.activeStreams.set(jobId, streamData);

    // Handle process output
    scrcpyProcess.stdout.on('data', (data) => {
      // Broadcast raw H264 data to all connected WebSocket clients
      streamData.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    });

    scrcpyProcess.stderr.on('data', (data) => {
      console.error(`scrcpy stderr for job ${jobId}:`, data.toString());
    });

    scrcpyProcess.on('error', (error) => {
      console.error(`scrcpy process error for job ${jobId}:`, error);
      this.stopStream(jobId);
    });

    scrcpyProcess.on('exit', (code) => {
      console.log(`scrcpy process exited for job ${jobId} with code ${code}`);
      this.activeStreams.delete(jobId);
    });

    // Wait a moment for scrcpy to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    return this.getStreamUrl(jobId);
  }

  /**
   * Stop streaming for a job
   */
  stopStream(jobId) {
    const stream = this.activeStreams.get(jobId);
    if (stream) {
      console.log(`Stopping stream for job: ${jobId}`);
      
      // Close all client connections
      stream.clients.forEach(client => {
        client.close(1000, 'Stream ended');
      });

      // Kill scrcpy process
      if (stream.process && !stream.process.killed) {
        stream.process.kill('SIGTERM');
      }

      this.activeStreams.delete(jobId);
    }
  }

  /**
   * Get screenshot from device
   */
  async getScreenshot(deviceId) {
    return new Promise((resolve, reject) => {
      const adbProcess = spawn('adb', [
        '-s', deviceId,
        'exec-out', 'screencap', '-p'
      ]);

      const chunks = [];
      adbProcess.stdout.on('data', (chunk) => {
        chunks.push(chunk);
      });

      adbProcess.on('error', reject);
      
      adbProcess.on('exit', (code) => {
        if (code === 0) {
          const buffer = Buffer.concat(chunks);
          resolve(buffer.toString('base64'));
        } else {
          reject(new Error(`Screenshot failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Attach a WebSocket client to an existing stream
   */
  attachClientToStream(ws, stream) {
    stream.clients.add(ws);
    
    ws.on('close', () => {
      stream.clients.delete(ws);
      console.log(`Client disconnected from stream. Remaining clients: ${stream.clients.size}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket client error:', error);
      stream.clients.delete(ws);
    });
  }

  /**
   * Extract job ID from WebSocket URL
   */
  extractJobId(url) {
    const match = url.match(/jobId=([^&]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get stream URL for a job
   */
  getStreamUrl(jobId) {
    return {
      websocket: `ws://localhost:8886/stream?jobId=${jobId}`,
      web: `http://localhost:3000/stream/${jobId}`
    };
  }

  /**
   * Get list of active streams
   */
  getActiveStreams() {
    return Array.from(this.activeStreams.keys()).map(jobId => ({
      jobId,
      deviceId: this.activeStreams.get(jobId).deviceId,
      startTime: this.activeStreams.get(jobId).startTime,
      clientCount: this.activeStreams.get(jobId).clients.size
    }));
  }

  /**
   * Clean up all streams
   */
  cleanup() {
    console.log('Cleaning up all active streams...');
    this.activeStreams.forEach((stream, jobId) => {
      this.stopStream(jobId);
    });
    
    if (this.wss) {
      this.wss.close();
    }
    
    if (this.io) {
      this.io.close();
    }
  }
}

module.exports = StreamingService;