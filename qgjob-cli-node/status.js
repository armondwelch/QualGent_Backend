const { getJobStatus } = require('./api');
const chalk = require('chalk');

module.exports = async (options) => {
  try {
    const jobId = options.job_id || options.jobId; // Just in case
    if (!jobId) {
      console.error(chalk.red('❌  Job ID is required.'));
      process.exit(1);
    }
    const result = await getJobStatus(jobId);
    console.log(chalk.yellow(`Job ${jobId} Status: ${result.status}`));
  } catch (err) {
    console.error(chalk.red('❌  Failed to get job status:'), err.message);
  }
};
