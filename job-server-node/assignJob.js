const { runJob } = require('./runJob'); // Correctly import the 'runJob' function
const jobStore = require('./jobStore');
const MAX_RETRIES = 3;

async function assignJob(job) {
  job.status = 'running';
  jobStore.saveJob(job);  // update status early

  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      // FIX 2: Call the 'runJob' function by its correct name
      await runJob(job);  // your actual test execution
      job.status = 'complete';
      jobStore.saveJob(job);
      return;
    } catch (err) {
      attempts++;
      console.log(`Job ${job.job_id} failed attempt ${attempts}: ${err.message}`);
      
      // Check if this was a test completion failure vs infrastructure failure
      const isInfrastructureFailure = err.message.includes('Could not find a driver') ||
                                     err.message.includes('EADDRINUSE') ||
                                     err.message.includes('Connection refused') ||
                                     err.message.includes('Cannot find module') ||
                                     err.message.includes('ECONNREFUSED') ||
                                     err.message.includes('network') ||
                                     err.message.includes('timeout') && !err.message.includes('element');
      
      // If test completed but only had cleanup errors, mark as complete
      if (err.message.includes('pkill -f appium') || err.message.includes('Command failed: pkill')) {
        console.log(`Job ${job.job_id} completed successfully with minor cleanup error - marking as complete`);
        job.status = 'complete';
        jobStore.saveJob(job);
        return;
      }
      
      // If test ran to completion but failed assertions, don't retry
      if (!isInfrastructureFailure) {
        console.log(`Job ${job.job_id} failed due to test assertion failure - not retrying`);
        job.status = 'failed';
        jobStore.saveJob(job);
        return;
      }
      
      if (attempts >= MAX_RETRIES) {
        job.status = 'failed';
        jobStore.saveJob(job);
        return;
      }
      
      // Only retry for infrastructure failures
      console.log(`Infrastructure failure detected - waiting 60 seconds for cleanup before retry ${attempts + 1}...`);
      await new Promise(res => setTimeout(res, 60000));
    }
  }
}

// This line is correct, as assignJob is likely the primary export of this file
module.exports = assignJob;