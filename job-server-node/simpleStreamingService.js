const { spawn } = require('child_process');
const WebSocket = require('ws');
const { Server } = require('socket.io');

class SimpleStreamingService {
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

    // Initialize raw WebSocket server for screenshot stream
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

    console.log('Simple streaming services initialized on ports 8886 (WebSocket) and Socket.IO');
  }

  /**
   * Start screenshot-based streaming from a device
   */
  async startStream(jobId, deviceId) {
    if (this.activeStreams.has(jobId)) {
      console.log(`Stream already active for job: ${jobId}`);
      return this.getStreamUrl(jobId);
    }

    console.log(`Starting screenshot stream for job ${jobId} on device ${deviceId}`);
    
    const streamData = {
      deviceId,
      startTime: Date.now(),
      clients: new Set(),
      interval: null,
      isActive: true
    };

    this.activeStreams.set(jobId, streamData);

    // Start periodic screenshot capture and broadcast
    streamData.interval = setInterval(async () => {
      try {
        const screenshot = await this.getScreenshot(deviceId);
        const message = {
          type: 'screenshot',
          jobId,
          timestamp: Date.now(),
          data: `data:image/png;base64,${screenshot}`
        };

        // Broadcast to all connected WebSocket clients
        streamData.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });

        // Also emit via Socket.IO
        if (this.io) {
          this.io.emit('screenshot-update', message);
        }
      } catch (error) {
        console.error(`Screenshot capture error for job ${jobId}:`, error);
      }
    }, 1000); // Capture every 1 second (1 FPS)

    // Wait a moment for first screenshot
    await new Promise(resolve => setTimeout(resolve, 1000));

    return this.getStreamUrl(jobId);
  }

  /**
   * Stop streaming for a job
   */
  stopStream(jobId) {
    const stream = this.activeStreams.get(jobId);
    if (stream) {
      console.log(`Stopping stream for job: ${jobId}`);
      
      // Stop the screenshot interval
      if (stream.interval) {
        clearInterval(stream.interval);
      }

      stream.isActive = false;

      // Close all client connections
      stream.clients.forEach(client => {
        client.close(1000, 'Stream ended');
      });

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

      adbProcess.stderr.on('data', (data) => {
        console.error(`Screenshot stderr: ${data}`);
      });

      adbProcess.on('error', (error) => {
        reject(new Error(`Screenshot process error: ${error.message}`));
      });
      
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
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Screenshot stream connected',
      jobId: stream.jobId,
      fps: 1
    }));
    
    ws.on('close', () => {
      stream.clients.delete(ws);
      console.log(`Client disconnected from stream. Remaining clients: ${stream.clients.size}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket client error:', error);
      stream.clients.delete(ws);
    });

    // Send current screenshot immediately if available
    this.getScreenshot(stream.deviceId)
      .then(screenshot => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'screenshot',
            timestamp: Date.now(),
            data: `data:image/png;base64,${screenshot}`
          }));
        }
      })
      .catch(error => {
        console.error('Initial screenshot failed:', error);
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
      web: `http://localhost:3000/stream/${jobId}`,
      type: 'screenshot-stream',
      fps: 1
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
      clientCount: this.activeStreams.get(jobId).clients.size,
      type: 'screenshot-stream',
      fps: 1
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

module.exports = SimpleStreamingService;