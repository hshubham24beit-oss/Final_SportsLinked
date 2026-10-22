const express = require('express');
const request = require('supertest');
const {
  API,
  DEFAULT_PASSWORD,
  register,
  registerAndLogin,
  latestEmailTo,
  extractToken,
  verifyUserEmail,
  authHeader,
} = require('./helpers');
const app = require('../app');
const User = require('../models/User');
const { getOutbox } = require('../services/email.service');
const { authorizeRoles, requireVerifiedEmail } = require('../middleware/auth');
const { errorHandler } = require('../middleware/error');

describe('Health', () => {
  it('reports a healthy API and database', async () => {
    const response = await request(app).get(`${API}/health`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.database).toBe('connected');
  });
});

describe('Registration', () => {
  it('registers a valid athlete and sends a verification email', async () => {
    const { response, payload } = await register();

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.emailSent).toBe(true);
    expect(response.body.data.user).toMatchObject({
      name: 'Jane Athlete',
      email: payload.email,
      role: 'athlete',
      isEmailVerified: false,
      status: 'active',
      onboardingCompleted: false,
    });
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(getOutbox()).toHaveLength(1);
    expect(getOutbox()[0].subject).toContain('Verify');

    const storedUser = await User.findOne({ email: payload.email });
    expect(storedUser).not.toBeNull();
    expect(storedUser.passwordHash).not.toBe(payload.password);
  });

  it('rejects duplicate email addresses', async () => {
    const { payload } = await register();

    const duplicate = await request(app).post(`${API}/auth/register`).send({
      name: 'Another Athlete',
      email: payload.email,
      password: 'AnotherPass2',
      role: 'athlete',
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.success).toBe(false);
    expect(duplicate.body.code).toBe('EMAIL_IN_USE');
  });

  it('prevents public admin registration', async () => {
    const { response } = await register({ role: 'admin' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('ADMIN_REGISTRATION_FORBIDDEN');
    expect(await User.countDocuments()).toBe(0);
  });

  it('validates registration input and returns field errors', async () => {
    const response = await request(app).post(`${API}/auth/register`).send({
      name: 'J',
      email: 'not-an-email',
      password: 'short',
      role: 'superadmin',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(response.body.errors)).toBe(true);
    const fields = response.body.errors.map((error) => error.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password', 'role']));
  });
});

describe('Login', () => {
  it('signs in with valid credentials and sets an httpOnly refresh cookie', async () => {
    const { payload } = await register();

    const response = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: payload.email, password: DEFAULT_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data.accessToken).toBe('string');
    expect(response.body.data.user.email).toBe(payload.email);

    const cookies = response.headers['set-cookie'] || [];
    const refreshCookie = cookies.find((cookie) => cookie.startsWith('sportlinked_refresh='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
    expect(cookies.join(';')).not.toContain('accessToken');
  });

  it('rejects a wrong password with a generic error', async () => {
    const { payload } = await register();

    const response = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: payload.email, password: 'WrongPass9' });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
    expect(response.body.message).toBe('Invalid email or password.');
  });

  it('rejects an unknown email', async () => {
    const response = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'missing@example.com', password: DEFAULT_PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('Email verification', () => {
  it('verifies an email with the emailed token and cannot be reused', async () => {
    const { payload } = await register();
    const message = latestEmailTo(payload.email, 'verify');
    const token = extractToken(message);

    const response = await request(app).post(`${API}/auth/verify-email`).send({ token });

    expect(response.status).toBe(200);
    expect(response.body.data.user.isEmailVerified).toBe(true);

    const storedUser = await User.findOne({ email: payload.email }).select(
      '+emailVerificationTokenHash',
    );
    expect(storedUser.isEmailVerified).toBe(true);
    expect(storedUser.emailVerificationTokenHash).toBeNull();

    const reuse = await request(app).post(`${API}/auth/verify-email`).send({ token });
    expect(reuse.status).toBe(400);
    expect(reuse.body.code).toBe('INVALID_VERIFICATION_TOKEN');
  });

  it('rejects an invalid verification token', async () => {
    const response = await request(app)
      .post(`${API}/auth/verify-email`)
      .send({ token: 'a'.repeat(64) });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_VERIFICATION_TOKEN');
  });

  it('resends verification only for authenticated, unverified users', async () => {
    const { agent, accessToken, payload } = await registerAndLogin();

    const resend = await agent
      .post(`${API}/auth/resend-verification`)
      .set(authHeader(accessToken))
      .send({});
    expect(resend.status).toBe(200);

    const latest = latestEmailTo(payload.email, 'verify');
    await request(app).post(`${API}/auth/verify-email`).send({ token: extractToken(latest) });

    const afterVerification = await agent
      .post(`${API}/auth/resend-verification`)
      .set(authHeader(accessToken))
      .send({});
    expect(afterVerification.status).toBe(400);
    expect(afterVerification.body.code).toBe('EMAIL_ALREADY_VERIFIED');
  });
});

describe('Session refresh and logout', () => {
  it('refreshes an access token from the refresh cookie and logs out', async () => {
    const { agent, loginResponse } = await registerAndLogin();
    expect(loginResponse.status).toBe(200);

    const refresh = await agent.post(`${API}/auth/refresh`).send({});
    expect(refresh.status).toBe(200);
    expect(typeof refresh.body.data.accessToken).toBe('string');

    const me = await request(app)
      .get(`${API}/auth/me`)
      .set(authHeader(refresh.body.data.accessToken));
    expect(me.status).toBe(200);

    const logout = await agent.post(`${API}/auth/logout`).send({});
    expect(logout.status).toBe(200);

    const refreshAfterLogout = await agent.post(`${API}/auth/refresh`).send({});
    expect(refreshAfterLogout.status).toBe(401);
  });

  it('rejects refresh without a cookie', async () => {
    const response = await request(app).post(`${API}/auth/refresh`).send({});

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('REFRESH_TOKEN_MISSING');
  });
});

describe('Password reset', () => {
  it('resets a password through the emailed token and invalidates old credentials', async () => {
    const { payload } = await register();
    await verifyUserEmail(payload.email);

    const forgot = await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({ email: payload.email });
    expect(forgot.status).toBe(200);

    const message = latestEmailTo(payload.email, 'reset');
    expect(message).toBeDefined();
    const token = extractToken(message);

    const reset = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token, password: 'BrandNewPass2' });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: payload.email, password: DEFAULT_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: payload.email, password: 'BrandNewPass2' });
    expect(newLogin.status).toBe(200);

    const reuse = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token, password: 'YetAnotherPass3' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.code).toBe('INVALID_RESET_TOKEN');
  });

  it('does not reveal whether an email is registered', async () => {
    const response = await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({ email: 'unknown@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(getOutbox()).toHaveLength(0);
  });
});

describe('Protected routes and account status', () => {
  it('requires an access token for /me', async () => {
    const missing = await request(app).get(`${API}/auth/me`);
    expect(missing.status).toBe(401);

    const { accessToken } = await registerAndLogin();
    const response = await request(app).get(`${API}/auth/me`).set(authHeader(accessToken));

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBeDefined();
  });

  it('blocks suspended users from authenticated endpoints', async () => {
    const { accessToken, payload } = await registerAndLogin();
    await User.updateOne({ email: payload.email }, { status: 'suspended' });

    const response = await request(app).get(`${API}/auth/me`).set(authHeader(accessToken));

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('enforces role-based access', async () => {
    const roleApp = express();
    roleApp.get(
      '/coach-only',
      (req, _res, next) => {
        req.user = { role: req.headers['x-role'] };
        next();
      },
      authorizeRoles('coach', 'admin'),
      (_req, res) => res.json({ success: true, data: null, message: 'Allowed.' }),
    );
    roleApp.use(errorHandler);

    const athlete = await request(roleApp).get('/coach-only').set('x-role', 'athlete');
    expect(athlete.status).toBe(403);
    expect(athlete.body.code).toBe('ROLE_FORBIDDEN');

    const coach = await request(roleApp).get('/coach-only').set('x-role', 'coach');
    expect(coach.status).toBe(200);

    const anonymous = await request(roleApp).get('/coach-only');
    expect(anonymous.status).toBe(403);
  });

  it('enforces verified email where required', async () => {
    const verifiedApp = express();
    verifiedApp.get(
      '/verified-only',
      (req, _res, next) => {
        req.user = { isEmailVerified: req.headers['x-verified'] === 'true' };
        next();
      },
      requireVerifiedEmail,
      (_req, res) => res.json({ success: true, data: null, message: 'Allowed.' }),
    );
    verifiedApp.use(errorHandler);

    const unverified = await request(verifiedApp).get('/verified-only').set('x-verified', 'false');
    expect(unverified.status).toBe(403);
    expect(unverified.body.code).toBe('EMAIL_NOT_VERIFIED');

    const verified = await request(verifiedApp).get('/verified-only').set('x-verified', 'true');
    expect(verified.status).toBe(200);
  });
});

describe('Account deactivation and deletion', () => {
  it('deactivates an account after password confirmation and blocks login', async () => {
    const { agent, accessToken, payload } = await registerAndLogin();

    const wrongPassword = await agent
      .post(`${API}/auth/deactivate`)
      .set(authHeader(accessToken))
      .send({ password: 'WrongPass9' });
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.code).toBe('INVALID_PASSWORD');

    const deactivate = await agent
      .post(`${API}/auth/deactivate`)
      .set(authHeader(accessToken))
      .send({ password: DEFAULT_PASSWORD });
    expect(deactivate.status).toBe(200);

    const login = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: payload.email, password: DEFAULT_PASSWORD });
    expect(login.status).toBe(403);
    expect(login.body.code).toBe('ACCOUNT_DEACTIVATED');
  });

  it('deletes an account after password confirmation', async () => {
    const { accessToken, payload } = await registerAndLogin();

    const response = await request(app)
      .delete(`${API}/auth/account`)
      .set(authHeader(accessToken))
      .send({ password: DEFAULT_PASSWORD });

    expect(response.status).toBe(200);
    expect(await User.countDocuments({ email: payload.email })).toBe(0);

    const me = await request(app).get(`${API}/auth/me`).set(authHeader(accessToken));
    expect(me.status).toBe(401);
  });
});

describe('Error handling', () => {
  it('returns a consistent shape for unknown routes', async () => {
    const response = await request(app).get(`${API}/does-not-exist`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.data).toBeNull();
    expect(response.body.code).toBe('ROUTE_NOT_FOUND');
    expect(response.body.stack).toBeUndefined();
  });
});
