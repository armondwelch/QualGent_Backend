// runJob.js

const { exec } = require("child_process");
const path = require("path"); // Import path module
const config = require("./config"); // Assumes config.js is in the same directory and contains APPWRIGHT_PATH

/**
 * Runs an Appwright test job.
 * This function will execute the Appwright CLI command,
 * ensuring the correct configuration file is used.
 *
 * @param {object} job - The job object containing properties like `test_path`.
 * @param {string} job.test_path - The path to the test file to be executed.
 * @returns {Promise<string>} A promise that resolves with the stdout from the command on success,
 * or rejects with an Error object on failure.
 */
async function runJob(job) {
    return new Promise((resolve, reject) => {
        const testPathEscaped = job.test_path; // Assume test_path is already safe for shell, or add proper escaping if needed

        // Determine the absolute path to your Appwright config file.
        // It's assumed that 'appwright.config.js' resides in the same directory as 'runJob.js'.
        const appwrightConfigPath = path.join(__dirname, 'appwright.config.ts');
        // If your config file is named appwright.config.ts and you're running with ts-node or it's compiled:
        // const appwrightConfigPath = path.join(__dirname, 'appwright.config.ts');

        // Construct the full command for the Appwright CLI.
        // It explicitly includes the --config flag to point to your specific configuration.
        const command = `node ${config.APPWRIGHT_PATH} test ${testPathEscaped} --config ${appwrightConfigPath}`;

        console.log(`[runJob.js] Executing command: ${command}`);

        // Execute the command using child_process.exec
        exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
                // Log all relevant error outputs
                console.error(`[runJob.js] Error running Appwright test: ${error.message}`);
                console.error(`[runJob.js] STDOUT: \n${stdout}`);
                console.error(`[runJob.js] STDERR: \n${stderr}`);

                // Check for the specific BrowserStack error message
                const fullErrorOutput = stdout + stderr; // Combine for a comprehensive check
                if (fullErrorOutput.includes("BROWSERSTACK_USERNAME") && fullErrorOutput.includes("BROWSERSTACK_ACCESS_KEY")) {
                    reject(new Error("Test failed: BrowserStack credentials required. This indicates your appwright.config.js might not be correctly loaded or there's an implicit BrowserStack dependency."));
                } else {
                    // Generic error if not related to BrowserStack credentials
                    reject(new Error(`Test failed during execution: ${error.message}`));
                }
            } else {
                // Log successful completion and stdout
                console.log(`[runJob.js] Test completed successfully.`);
                console.log(`[runJob.js] STDOUT: \n${stdout}`);
                resolve(stdout); // Resolve the promise with the command's standard output
            }
        });
    });
}

// Export the runJob function so it can be used by other modules (e.g., your job processing main file).
module.exports = {
    runJob,
};
