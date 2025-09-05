const groupedQueues = {};
const MAX_ATTEMPTS = 3;

/**
 * Enqueue a job into the queue for its app_version_id.
 * Sorts by priority (lower = higher priority).
 */
exports.enqueue = (job) => {
  const group = groupedQueues[job.app_version_id] || [];

  // Avoid re-adding duplicates
  if (!group.find(j => j.job_id === job.job_id)) {
    group.push(job);
    group.sort((a, b) => a.priority - b.priority);
    groupedQueues[job.app_version_id] = group;
  }
};

/**
 * Dequeue the highest-priority job matching the given target.
 * Returns null if no matching jobs are found.
 */
exports.dequeueGroup = (target) => {
  for (const [appVersionId, jobs] of Object.entries(groupedQueues)) {
    const index = jobs.findIndex(job => job.target === target && job.status === 'queued');

    if (index !== -1) {
      const [job] = jobs.splice(index, 1);
      if (jobs.length === 0) {
        delete groupedQueues[appVersionId]; // Clean up empty group
      }
      return [job];
    }
  }
  return null;
};

/**
 * Requeue job if it hasn't exceeded max attempts.
 */
exports.requeueIfRetryable = (job) => {
  if (job.attempts < MAX_ATTEMPTS) {
    job.status = 'queued';
    exports.enqueue(job);
    return true;
  }
  return false;
};

/**
 * Optional helper to inspect current queue state.
 */
exports.listQueuedJobs = () => {
  return Object.fromEntries(
    Object.entries(groupedQueues).map(([version, jobs]) => [
      version,
      jobs.map(j => ({
        job_id: j.job_id,
        priority: j.priority,
        status: j.status,
        target: j.target,
        attempts: j.attempts || 0,
      })),
    ])
  );
};
