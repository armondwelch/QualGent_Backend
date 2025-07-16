const axios = require('axios');
const chalk = require('chalk');

async function submitJob(job) {
  try {
    if (!process.env.CI) {
      console.log(chalk.blue('Submitting job with payload:'), job);
    }

    const response = await axios.post('http://localhost:3000/jobs', job);

    if (!process.env.CI) {
      console.log(chalk.blue('Server responded with:'), response.data);
    }

    if (!response.data || !response.data.job_id) {
      throw new Error('No job ID returned from server.');
    }

    return response.data;
  } catch (err) {
    console.error(chalk.red('❌  Failed to submit job:'), err.message);
    throw err;
  }
}

module.exports = async function submit(options) {
  const job = {
    org_id: options.orgId || options.org_id,
    app_version_id: options.appVersionId || options.app_version_id,
    test_path: options.test,
    priority: parseInt(options.priority, 10),
    target: options.target,
  };

  try {
    const result = await submitJob(job);

    // Only output job ID in CI for GitHub Actions compatibility
    if (process.env.CI) {
      console.log(result.job_id);
    } else {
      console.log(chalk.green(`✅  Job submitted with ID: ${result.job_id}`));
    }
  } catch (err) {
    // Error already logged
  }
};
