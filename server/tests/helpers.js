const request = require('supertest');
const app = require('../app');
const { getOutbox } = require('../services/email.service');

const API = '/api/v1';
const DEFAULT_PASSWORD = 'StrongPass1';

function uniqueEmail(prefix = 'athlete') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.com`;
}

function latestEmailTo(email, subjectIncludes) {
  const messages = getOutbox().filter(
    (message) =>
      message.to === email &&
      (!subjectIncludes || message.subject.toLowerCase().includes(subjectIncludes.toLowerCase())),
  );
  return messages[messages.length - 1];
}

function extractToken(message) {
  const match = message.text.match(/token=([a-f0-9]{64})/i);
  if (!match) {
    throw new Error('Token not found in email');
  }
  return match[1];
}

async function register({ name = 'Jane Athlete', email, password = DEFAULT_PASSWORD, role = 'athlete' } = {}) {
  const payload = { name, email: email || uniqueEmail(role), password, role };
  const response = await request(app).post(`${API}/auth/register`).send(payload);
  return { response, payload };
}

async function registerAndLogin(overrides = {}) {
  const { response: registerResponse, payload } = await register(overrides);
  const agent = request.agent(app);
  const loginResponse = await agent
    .post(`${API}/auth/login`)
    .send({ email: payload.email, password: payload.password });

  return {
    agent,
    registerResponse,
    loginResponse,
    payload,
    accessToken: loginResponse.body.data && loginResponse.body.data.accessToken,
  };
}

async function verifyUserEmail(email) {
  const message = latestEmailTo(email, 'verify');
  const token = extractToken(message);
  return request(app).post(`${API}/auth/verify-email`).send({ token });
}

function authHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

module.exports = {
  app,
  API,
  DEFAULT_PASSWORD,
  uniqueEmail,
  latestEmailTo,
  extractToken,
  register,
  registerAndLogin,
  verifyUserEmail,
  authHeader,
};
