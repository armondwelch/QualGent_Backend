<h1>QueueForge - Job Scheduling System</h1> 

 QueueForge is a tool for managing end-2-end testing across multiple devices and app versions, prioritizing job execution and reducing reduncy. The tool receives and queues test jobs., groups them by app_version_id, assigns jobs to available agents based on device availability and target, and tracks job and run statuses with retries for failed jobs.


<h1>Key Features:</h1>

Job Submission: Submits jobs with relevant metadata like app version, test path, priority, and target platform.

Job Queueing: Jobs are queued with priority and grouped by app_version_id to optimize device usage.

Job Assignment: Jobs are assigned to available agents based on device target (Android/iOS) and priority.

Job Retry: Failed jobs are retried up to a configured maximum number of attempts.

Job Status Tracking: You can track job status via the API and inspect the current state of queued jobs.
<img width="738" height="588" alt="image" src="https://github.com/user-attachments/assets/0a1464f9-d2dc-40d2-9c83-0eb230daa9c5" />

<h1>How It Works</h1>

Job Creation: Users submit a job via the POST /jobs endpoint with required details (e.g., org_id, app_version_id, test_path, priority, target). 

Job Queuing: The job is then placed in an in-memory queue (or PostgreSQL database if configured). The queue is sorted based on job priority.

Job Assignment: The job scheduler runs at regular intervals, checking for available agents. The scheduler assigns jobs to agents based on the target device and job priority.

Job Execution: Each agent runs the assigned test job and updates the job status accordingly. Failed jobs are retried up to the configured retry limit.

Job Status: Job status can be tracked using the GET /jobs/:id endpoint. The status can be "queued", "running", "complete", or "failed".

<h1>Setup</h1>
<img width="792" height="508" alt="image" src="https://github.com/user-attachments/assets/fc7753ef-25e7-4466-afaf-cf70b463e239" />

Clone this repository:

`git clone https://github.com/armondwelch/QueueForge`

Clone Appwright repository:

`git clone https://github.com/empirical-run/appwright`

Install Node:

`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash`

Install dependencies:
`npm install express body-parser uuid`
`npm install commander axios chalk`
`npm install --save-dev @playwright/test`

<h3>CLI (qgjob-cli):</h3>

axios: For making HTTP requests to the backend.

uuid: For generating unique job IDs

`npm install ./path-to-qgjob-cli`

`npm link`

<h3>Testing framework: Appwright</h3>

cd appwright

`npm install appwright`

`npm run build`

Change path defined in job-server/config.js to PATH-TO/appwright/dist/bin/index.js

jobserver/appwright.config.ts can be edited for further configuration

<h3>Backend (job-server):</h3>

Express as Web framework for handling HTTP requests;

Start Server

`node job-server/index.js`

<h1>Submit Tests</h1>

Submit jobs using the CLI:

`qgjob-cli/index.js submit --org-id="org_id" --app-version-id="app_version_id" --test="test_path" --priority="priority (e.g. 1, 2, 3)" --target="target (e.g. android, ios, emulator)"`

Check status of previously submitted job:

`qgjob status --job-id="ID"`

Tests found in QueueForge/job-server/tests
