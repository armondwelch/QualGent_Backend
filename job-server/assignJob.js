const { runJob } = require('./runJob'); // Correctly import the 'runJob' function
const jobStore = require('./jobStore');
const MAX_RETRIES = 3;

async function assignJob(job) {
  job.status = 'running';
  jobStore.saveJob(job);  // update status early

  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      // FIX 2: Call the 'runJob' function by its correct name
      await runJob(job);  // your actual test execution
      job.status = 'complete';
      jobStore.saveJob(job);
      return;
    } catch (err) {
      attempts++;
      console.log(`Job ${job.job_id} failed attempt ${attempts}: ${err.message}`);
      if (attempts >= MAX_RETRIES) {
        job.status = 'failed';
        jobStore.saveJob(job);
        return;
      }
      // optionally add delay here before retrying
      await new Promise(res => setTimeout(res, 2000));
    }
  }
}

// This line is correct, as assignJob is likely the primary export of this file
module.exports = assignJob;
