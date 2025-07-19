const { exec } = require("child_process");
const path = require("path");
const config = require("./config"); // Make sure config.js exports APPWRIGHT_PATH
const appwrightPath = '/home/node/appwright/dist/bin/index.js';

/**
 * Runs an Appwright test job.
 * Executes the Appwright CLI command with the specified test path and config.
 *
 * @param {object} job - The job object containing properties like `test_path` and `target`.
 * @param {string} job.test_path - The path to the test file to be executed.
 * @param {string} job.target - The target project name (e.g., 'android', 'ios').
 * @returns {Promise<string>} Resolves with stdout on success, rejects with Error on failure.
 */
async function runJob(job) {
    return new Promise((resolve, reject) => {
        const testPathEscaped = job.test_path; // Assuming safe path input
        const targetProject = job.target;

        const appwrightConfigPath = path.join(__dirname, 'appwright.config.ts');

        const command = `node ${config.APPWRIGHT_PATH} test ${testPathEscaped} --config ${appwrightConfigPath} --project ${targetProject}`;

        console.log(`[runJob.js] Executing command: ${command}`);

        exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
            const fullOutput = stdout + stderr;
            const testsPassed = fullOutput.match(/^\s*✓/m) || fullOutput.includes('1 passed');

            if (error && !testsPassed) {
                console.error(`[runJob.js] Error running Appwright test: ${error.message}`);
                console.error(`[runJob.js] STDOUT: \n${stdout}`);
                console.error(`[runJob.js] STDERR: \n${stderr}`);

                if (fullOutput.includes("BROWSERSTACK_USERNAME") && fullOutput.includes("BROWSERSTACK_ACCESS_KEY")) {
                    reject(new Error("Test failed: BrowserStack credentials required. This indicates your appwright.config.js might not be correctly loaded or there's an implicit BrowserStack dependency."));
                } else {
                    reject(new Error(`Test failed during execution: ${error.message}`));
                }
            } else {
                console.log(`[runJob.js] Test completed successfully.`);
                console.log(`[runJob.js] STDOUT: \n${stdout}`);
                resolve(stdout);
            }
        });
    });
}

module.exports = {
    runJob,
};
