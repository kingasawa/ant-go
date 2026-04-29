/**
 * api.js — HTTP client gọi tới ant-go Next.js API
 */

const axios = require('axios');

function createClient(apiUrl, authToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return axios.create({
    baseURL: apiUrl.replace(/\/$/, ''),
    headers,
    timeout: 30_000,
  });
}

// POST /api/builds — tạo build job, nhận signed URL
async function createBuild(client, payload = {}) {
  const { data } = await client.post('/api/builds', payload);
  return data; // { jobId, uploadUrl }
}

// GET /api/builds/:id — lấy status
async function getBuildStatus(client, jobId) {
  const { data } = await client.get(`/api/builds/${jobId}`);
  return data;
}

module.exports = { createClient, createBuild, getBuildStatus };
