const { exec } = require("child_process");
const config = require("./config"); // should contain APPWRIGHT_PATH

async function runTest(job) {
  return new Promise((resolve, reject) => {
    const testPathEscaped = job.test_path; // or apply escaping if needed

    // Command for Appwright CLI
    const command = `node ${config.APPWRIGHT_PATH} test ${testPathEscaped}`;
    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌    Test failed for job ${job.job_id}:`);
        if (stdout) console.error('STDOUT:', stdout);
        if (stderr) console.error('STDERR:', stderr);
        console.error('ERROR MESSAGE:', error.message);
        return reject(stderr || error.message || 'Unknown error');
      }
      console.log(`✅    Test passed for job ${job.job_id}:`, stdout);
      resolve(stdout);
    });
  });
}

module.exports = runTest;
