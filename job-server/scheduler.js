const jobStore = require('./jobStore');
const assignJob = require('./assignJob');
const queue = require('./queue');
const agents = require('./agents');

exports.start = () => {
  setInterval(() => {
    ['android', 'ios'].forEach(target => {
      const agent = agents.getAvailableAgent(target);
      if (!agent) return;

      const jobs = queue.dequeueGroup(target);
      if (!jobs || jobs.length === 0) return;

      agents.setBusy(agent.id, true);
      console.log(`Assigning ${jobs.length} job(s) to agent ${agent.id}`);

      (async () => {
        for (const job of jobs) {
          try {
            await assignJob(job);
          } catch (err) {
            console.error(`Job ${job.job_id} failed on agent ${agent.id}:`, err);
            // Optionally, update job status to 'failed' in jobStore here
            jobStore.updateJobStatus(job.job_id, 'failed');
          }
        }
        agents.setBusy(agent.id, false);
      })();
    });
  }, 1000); // runs every second
};
