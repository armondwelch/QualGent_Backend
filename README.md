<h1>QueueForge - Job Scheduling System</h1> 

QueueForge is a tool for managing end-2-end testing across multiple devices and app versions, prioritizing job execution and reducing redundancy. The tool receives and queues test jobs, groups them by app_version_id, assigns jobs to available agents based on device availability and target, and tracks job and run statuses with retries for failed jobs. Integrations with browserstack, docker android, and ios simulators.

<h1>Features:</h1>

Job Server: Handles job scheduling, execution, and integration with external services like BrowserStack.

PostgreSQL Database: Stores metadata for test videos, job statuses, and other related information.

Kubernetes (in GCP): Manages the deployment and scaling of services like job server, database, and emulators/simulators.

KVM: Hardware-assisted virtualization for emulators

BrowserStack: Used for cross-browser and mobile device testing with retrieval of test results and metadata.

Ws-scrpy, VNC: Live video streaming for real-time test observation

CLI Tool (qgjob-cli): Command-line tool for managing job execution and interactions with the backend services.

<h1>Job Handling</h1>

Job Submission: Submits jobs with relevant information including app version, test path, priority (e.g. 1,2 3), and target platform (ios or android)

Job Queueing: Jobs are queued with priority and grouped by app_version_id to optimize device usage.

Job Assignment: Jobs are assigned to available agents based on device target (Android/iOS) and priority.

Job Retry: Failed jobs are retried up to a configured maximum number of attempts (Default 3).

Job Status Tracking: You can track job status via the API and inspect the current state of queued jobs. The status can be "queued", "running", "complete", or "failed".

<img width="1108" height="712" alt="image" src="https://github.com/user-attachments/assets/633db7a3-6298-48da-97fb-5de129b906f4" />


<h1>Emulator Services</h1>

<h2>Android</h2>
<img width="954" height="186" alt="image" src="https://github.com/user-attachments/assets/dc272f4b-b80f-4cf0-b62f-037fd5991a92" />

<h2>iOS</h2>
<img width="983" height="144" alt="image" src="https://github.com/user-attachments/assets/31a516b9-d735-4872-a983-4ce0c5618ef3" />


<h1>Infrastructure Requirements</h1>
<h3>Container Platform</h3>

Docker - For containerized deployment of job-server and emulators

Kubernetes - For orchestration and scaling (optional but recommended for production)

<h3>Storage</h3>

PostgreSQL - Database for storing test results and video data

File Storage - Persistent volume for app builds storage (/mnt/data/apk-storage/) and for emulators

<h3>External Services</h3>
BrowserStack App Automate account

<h3>Mobile App Testing</h3>
Appwright - Mobile testing framework

<h3>Runtime Dependencies</h3>

Node.js Environment

Node.js v18+ recommended

npm or yarn package manager

<h3>System Tools (for iOS conversion)</h3>

zip - For creating .ipa files from .app bundles

axios- For making HTTP requests to the backend.

uuid- For generating unique job IDs

<h1>Quick Setup</h1>
<h3>Prerequisites</h3>

-  Containerization tool
-  Minikube or any Kubernetes environment
-  BrowserStack App Automate account

Clone this repository:

`git clone https://github.com/armondwelch/QualGent_Backend`

Clone Appwright repository:

`git clone https://github.com/empirical-run/appwright`

<h3>1. Start Kubernetes</h3>

Using Minikube

`minikube start`

Enable Required addons

`minikube addons enable storage-provisioner`

Ensure your cluster is running and kubectl is configured

`kubectl cluster-info`

<h3>2. Deploy the Application</h3>
  
Deploy Resources

`kubectl apply -f k8s/`

This will create persistent volumes for app storage for job server deployment and required services.

<h3>Setup CLI</h3>

Install Node:

`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash`

Install dependencies

`npm install commander axios chalk`

`npm install qgjob-cli`

<h3>Set Env Variables</h3>

BROWSERSTACK_USERNAME

BROWSERSTACK_ACCESS_KEY

DATABASE_URL - PostgreSQL connection string (if applicable)

<h3>Configuration</h3>

jobserver/appwright.config.ts can be edited to testing implementation

Default Ports
- Job Server: `3000`
- PostgreSQL: `5432`
- MacOS appium: 4723
- MacOS VNC: 5999
  
<h1>Submit Tests</h1>

Submit jobs using the CLI:

`qgjob-cli/index.js submit --org-id="org_id" --app-version-id="app_version_id" --test="test_path" --priority="priority (e.g. 1, 2, 3)" --target="target (e.g. android, ios, emulator)"`

Example job submission:

`qgjob submit --org-id=qualgent --app-version-id="v1.2.3" --test="/usr/src/app/tests/tests.spec.ts" --priority="1" --target="ios"`

Check status of previously submitted job:

`qgjob status --job-id="ID"`

Tests found in QueueForge/job-server/tests
Builds found in QueueForge/job-server/builds

<h3>Example test runs</h3>

android

https://app-automate.browserstack.com/projects/Default+Project/builds/app+android/23?public_token=c44e005111e6331115555920388c54ea4150f64babe2917dea48d60aacbc257c

ios

https://app-automate.browserstack.com/projects/Default+Project/builds/app+ios/4?public_token=c44e005111e6331115555920388c54ea4150f64babe2917dea48d60aacbc257c

database dump with previous testing metadata @ QualGent_Backend/k8s/qualgent_backup.sql
