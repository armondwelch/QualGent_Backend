const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const cors = require('cors');

const jobStore = require('./jobStore');
const queue = require('./queue');
const scheduler = require('./scheduler');
const WsScrcpyService = require('./wsScrcpyService');

const app = express();
const server = http.createServer(app);
const streamingService = new WsScrcpyService();

app.use(cors());
app.use(bodyParser.json());

// Initialize ws-scrcpy streaming service
streamingService.initialize(server).catch(err => {
  console.error('Failed to initialize ws-scrcpy:', err);
});

// Debug middleware to log incoming requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} request for ${req.url}`);
  next();
});

// Route to submit a new job
app.post('/jobs', (req, res) => {
  const { org_id, app_version_id, test_path, priority, target } = req.body;
  if (!org_id || !app_version_id || !test_path || !priority || !target) {
    return res.status(400).json({ error: 'Missing required job fields' });
  }

  const job_id = uuidv4();

  const job = {
    job_id,
    org_id,
    app_version_id,
    test_path,
    priority,
    target,
    status: 'queued',
    created_at: Date.now(),
  };

  jobStore.saveJob(job);
  queue.enqueue(job);

  console.log(`Job submitted: ${job_id}`);

  res.json({ job_id });
});

// Route to check job status by ID
app.get('/jobs/:id', (req, res) => {
  const job = jobStore.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({ status: job.status });
});

// Route to start streaming for a job
app.post('/jobs/:id/stream', async (req, res) => {
  const jobId = req.params.id;
  const job = jobStore.getJob(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  try {
    const deviceId = process.env.ANDROID_EMULATOR_HOST || '34.56.143.27:5555';
    const streamInfo = await streamingService.startDeviceStream(jobId, deviceId);
    
    res.json({
      jobId,
      streamInfo,
      message: 'ws-scrcpy stream started successfully',
      instructions: {
        webInterface: `Open ${streamInfo.webUrl} in your browser to view and control the device`,
        directStream: `Connect to ${streamInfo.wsUrl} for raw H264 stream`
      }
    });
  } catch (error) {
    console.error(`Error starting stream for job ${jobId}:`, error);
    res.status(500).json({ 
      error: 'Failed to start stream', 
      details: error.message 
    });
  }
});

// Route to stop streaming for a job
app.delete('/jobs/:id/stream', (req, res) => {
  const jobId = req.params.id;
  streamingService.stopDeviceStream(jobId);
  
  res.json({
    jobId,
    message: 'Stream stopped'
  });
});

// Route to list active streams
app.get('/streams', (req, res) => {
  const activeStreams = streamingService.getActiveStreams();
  res.json({ streams: activeStreams });
});

// Route to get connected devices
app.get('/devices', async (req, res) => {
  try {
    const devices = await streamingService.getDeviceList();
    res.json({ devices });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get device list', 
      details: error.message 
    });
  }
});

// Debug route to inspect the current grouped job queue
app.get('/debug/queue', (req, res) => {
  if (typeof queue.listQueuedJobs === 'function') {
    res.json(queue.listQueuedJobs());
  } else {
    res.status(500).json({ error: 'listQueuedJobs function not implemented in queue.js' });
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  streamingService.cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  streamingService.cleanup();
  process.exit(0);
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Job server running on port ${PORT}`);
  console.log('ws-scrcpy streaming server will be running on port 8886');
  console.log('Socket.IO server initialized for stream control');
  console.log('Access streaming web interface at: http://localhost:8886');
  scheduler.start(); // Start the job scheduling loop
});

