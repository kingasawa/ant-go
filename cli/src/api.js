/**
 * api.js — HTTP client gọi tới ant Next.js API
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

// Lấy user info + devices list (fresh từ Firestore)
async function fetchUserInfo(client) {
  const { data } = await client.get('/api/user/me');
  return data;
}

// Lưu device mới vào Firestore sau khi enroll thành công
async function saveDevice(client, { udid, name, deviceProduct, deviceSerial }) {
  const { data } = await client.post('/api/devices', {
    udid,
    name,
    deviceProduct,
    deviceSerial,
    source: 'cli',
  });
  return data;
}

// Upload ASC API Key lên dashboard (per-user, per-team)
async function uploadAscKey(client, { teamId, keyId, issuerId, privateKeyP8 }) {
  const { data } = await client.post('/api/user/asc-key', {
    teamId,
    keyId,
    issuerId,
    privateKeyP8,
  });
  return data;
}

module.exports = { createClient, createBuild, getBuildStatus, fetchUserInfo, saveDevice, uploadAscKey };
