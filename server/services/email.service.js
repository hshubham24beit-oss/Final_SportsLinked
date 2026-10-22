const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');
const {
  verificationEmail,
  passwordResetEmail,
  notificationEmail,
} = require('../utils/emailTemplates');

let transporterPromise = null;
let outbox = [];

async function buildTransporter() {
  if (config.isTest) {
    return { transporter: nodemailer.createTransport({ jsonTransport: true }), ethereal: false };
  }

  if (config.mail.host && config.mail.user && config.mail.pass) {
    return {
      transporter: nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure,
        auth: { user: config.mail.user, pass: config.mail.pass },
      }),
      ethereal: false,
    };
  }

  try {
    const testAccount = await nodemailer.createTestAccount();
    logger.info(`Development email inbox: ${testAccount.user}`);
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      }),
      ethereal: true,
    };
  } catch (error) {
    logger.warn(
      'Could not create an Ethereal test inbox. Emails will be written to the console instead.',
      error.message,
    );
    return { transporter: nodemailer.createTransport({ jsonTransport: true }), ethereal: false };
  }
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = buildTransporter();
  }
  return transporterPromise;
}

async function sendMail({ to, subject, html, text }) {
  const { transporter, ethereal } = await getTransporter();

  const info = await transporter.sendMail({
    from: config.mail.from,
    to,
    subject,
    html,
    text,
  });

  if (config.isTest) {
    outbox.push({ to, subject, html, text, sentAt: new Date() });
  }

  const previewUrl = ethereal ? nodemailer.getTestMessageUrl(info) : null;
  if (previewUrl) {
    logger.info(`Email preview (${subject}): ${previewUrl}`);
  }

  return info;
}

async function sendVerificationEmail(user, rawToken) {
  const verificationUrl = `${config.clientUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
  if (!config.isProduction && !config.isTest) {
    logger.info(`Verification link for ${user.email}: ${verificationUrl}`);
  }
  const template = verificationEmail({ name: user.name, verificationUrl });
  return sendMail({ to: user.email, ...template });
}

async function sendPasswordResetEmail(user, rawToken) {
  const resetUrl = `${config.clientUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
  if (!config.isProduction && !config.isTest) {
    logger.info(`Password reset link for ${user.email}: ${resetUrl}`);
  }
  const template = passwordResetEmail({ name: user.name, resetUrl });
  return sendMail({ to: user.email, ...template });
}

async function sendNotificationEmail(user, notification) {
  const path = notification.link || '/notifications';
  const notificationUrl = `${config.clientUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const template = notificationEmail({
    name: user.name,
    heading: notification.title,
    intro: notification.message,
    notificationUrl,
  });
  return sendMail({ to: user.email, ...template });
}

function getOutbox() {
  return outbox;
}

function clearOutbox() {
  outbox = [];
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendNotificationEmail,
  getOutbox,
  clearOutbox,
};
