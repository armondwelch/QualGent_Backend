const { spawn } = require('child_process');
const WebSocket = require('ws');
const { Server } = require('socket.io');

class IOSSimulatorService {
  constructor() {
    this.activeStreams = new Map();
    this.vncProcesses = new Map();
    this.io = null;
  }

  /**
   * Initialize iOS simulator streaming service
   */
  async initialize(httpServer) {
    // Initialize Socket.IO for control messages
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      path: '/ios-socket.io'
    });

    // Socket.IO event handlers
    this.io.on('connection', (socket) => {
      console.log('iOS Control socket connected:', socket.id);
      
      socket.on('start-ios-stream', async (data) => {
        const { jobId, simulatorHost } = data;
        try {
          const streamInfo = await this.startIOSStream(jobId, simulatorHost);
          socket.emit('ios-stream-ready', streamInfo);
        } catch (error) {
          socket.emit('ios-stream-error', { 
            jobId, 
            error: error.message 
          });
        }
      });

      socket.on('stop-ios-stream', (data) => {
        const { jobId } = data;
        this.stopIOSStream(jobId);
        socket.emit('ios-stream-stopped', { jobId });
      });

      socket.on('get-active-ios-streams', () => {
        socket.emit('active-ios-streams', this.getActiveStreams());
      });

      socket.on('disconnect', () => {
        console.log('iOS Control socket disconnected:', socket.id);
      });
    });

    console.log('iOS Simulator service initialized');
  }

  /**
   * Start VNC streaming for iOS simulator
   */
  async startIOSStream(jobId, simulatorHost = '146.148.52.213:5900') {
    if (this.activeStreams.has(jobId)) {
      return this.activeStreams.get(jobId);
    }

    console.log(`Starting iOS simulator stream for job ${jobId} via VNC: ${simulatorHost}`);
    
    const [host, port] = simulatorHost.split(':');
    const vncPort = port || '5900';

    // Test VNC connection first
    await this.testVNCConnection(host, vncPort);

    const streamInfo = {
      jobId,
      simulatorHost,
      startTime: Date.now(),
      // VNC viewer URLs
      vncUrl: `vnc://${host}:${vncPort}`,
      // Web-based VNC viewer (if you have noVNC setup)
      webVncUrl: `http://localhost:6080/vnc.html?host=${host}&port=${vncPort}&autoconnect=true`,
      // Alternative: screenshare via HTTP
      screencastUrl: `http://localhost:3000/ios-screencast/${jobId}`,
      type: 'ios-simulator'
    };

    // Start periodic screenshot capture for web viewing
    this.startScreenshotCapture(jobId, host, vncPort);

    this.activeStreams.set(jobId, streamInfo);
    
    // Notify via Socket.IO
    if (this.io) {
      this.io.emit('ios-stream-started', streamInfo);
    }

    return streamInfo;
  }

  /**
   * Test VNC connection availability
   */
  async testVNCConnection(host, port) {
    return new Promise((resolve, reject) => {
      const testProcess = spawn('nc', ['-z', '-v', host, port]);
      
      testProcess.on('exit', (code) => {
        if (code === 0) {
          console.log(`VNC connection test successful: ${host}:${port}`);
          resolve();
        } else {
          reject(new Error(`Cannot connect to VNC server at ${host}:${port}`));
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        testProcess.kill('SIGTERM');
        reject(new Error(`VNC connection test timed out for ${host}:${port}`));
      }, 10000);
    });
  }

  /**
   * Start periodic screenshot capture for web viewing
   */
  startScreenshotCapture(jobId, host, port) {
    const captureInterval = setInterval(async () => {
      try {
        const screenshot = await this.captureVNCScreenshot(host, port);
        
        // Emit screenshot to connected clients
        if (this.io) {
          this.io.emit('ios-screenshot', { 
            jobId, 
            screenshot: screenshot.toString('base64'),
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error(`Screenshot capture failed for job ${jobId}:`, error.message);
      }
    }, 1000); // Capture every second

    // Store interval for cleanup
    const stream = this.activeStreams.get(jobId);
    if (stream) {
      stream.captureInterval = captureInterval;
    }
  }

  /**
   * Capture screenshot from VNC server
   */
  async captureVNCScreenshot(host, port) {
    return new Promise((resolve, reject) => {
      // Use vncsnapshot or similar tool to capture VNC screen
      // This requires vncsnapshot to be installed
      const vncProcess = spawn('vncsnapshot', [
        '-quiet',
        '-quality', '80',
        `${host}:${port}`,
        '/tmp/ios_screenshot.jpg'
      ]);

      vncProcess.on('exit', (code) => {
        if (code === 0) {
          // Read the screenshot file
          const fs = require('fs');
          try {
            const screenshot = fs.readFileSync('/tmp/ios_screenshot.jpg');
            resolve(screenshot);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`VNC screenshot failed with code ${code}`));
        }
      });

      vncProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Stop iOS simulator streaming
   */
  stopIOSStream(jobId) {
    const stream = this.activeStreams.get(jobId);
    if (stream) {
      console.log(`Stopping iOS stream for job: ${jobId}`);
      
      // Clear screenshot capture interval
      if (stream.captureInterval) {
        clearInterval(stream.captureInterval);
      }

      // Stop any VNC processes
      if (this.vncProcesses.has(jobId)) {
        const vncProcess = this.vncProcesses.get(jobId);
        if (!vncProcess.killed) {
          vncProcess.kill('SIGTERM');
        }
        this.vncProcesses.delete(jobId);
      }

      this.activeStreams.delete(jobId);
      
      // Notify via Socket.IO
      if (this.io) {
        this.io.emit('ios-stream-ended', { jobId });
      }
    }
  }

  /**
   * Get list of active iOS streams
   */
  getActiveStreams() {
    return Array.from(this.activeStreams.values());
  }

  /**
   * Send touch event to iOS simulator (via Appium server)
   */
  async sendTouchEvent(jobId, x, y, action = 'tap') {
    const stream = this.activeStreams.get(jobId);
    if (!stream) {
      throw new Error(`No active stream found for job ${jobId}`);
    }

    // This would integrate with your Appium server at 146.148.52.213:30537
    // to send touch events to the iOS simulator
    console.log(`Sending touch event to iOS simulator: ${action} at (${x}, ${y})`);
    
    // Implementation would use your Appium client to send touch commands
    // Example: await this.appiumClient.touchAction([{ action, x, y }]);
  }

  /**
   * Clean up all iOS streams
   */
  cleanup() {
    console.log('Cleaning up iOS simulator service...');
    
    // Stop all active streams
    this.activeStreams.forEach((stream, jobId) => {
      this.stopIOSStream(jobId);
    });
    
    // Close Socket.IO
    if (this.io) {
      this.io.close();
    }
  }
}

module.exports = IOSSimulatorService;