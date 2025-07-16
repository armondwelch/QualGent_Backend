const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const jobStore = require('./jobStore');
const queue = require('./queue');
const scheduler = require('./scheduler');

const app = express();

app.use(bodyParser.json());

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

// Debug route to inspect the current grouped job queue
app.get('/debug/queue', (req, res) => {
  if (typeof queue.listQueuedJobs === 'function') {
    res.json(queue.listQueuedJobs());
  } else {
    res.status(500).json({ error: 'listQueuedJobs function not implemented in queue.js' });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Job server running on port ${PORT}`);
  scheduler.start(); // Start the job scheduling loop
});

