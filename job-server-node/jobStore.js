const jobs = new Map();

exports.saveJob = (job) => jobs.set(job.job_id, job);

exports.getJob = (id) => jobs.get(id);

exports.updateJobStatus = (id, status) => {
  const job = jobs.get(id);
  if (job) job.status = status;
};
