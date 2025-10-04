const axios = require('axios');

const BASE_URL = process.env.JOB_SERVER_URL || 'http://192.168.49.2:31741'; // Or your backend URL

exports.submitJob = async (jobPayload) => {
  const res = await axios.post(`${BASE_URL}/jobs`, jobPayload);
  return res.data;
};

async function getJobStatus(jobId) {
  try {
    const response = await axios.get(`${BASE_URL}/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get job status: ${error.message}`);
  }
}

exports.getJobStatus = getJobStatus;
