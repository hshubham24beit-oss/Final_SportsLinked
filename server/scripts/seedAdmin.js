const config = require('../config/env');
const logger = require('../utils/logger');
const { connectDatabase, disconnectDatabase } = require('../config/db');
const User = require('../models/User');
const { ROLES, USER_STATUS } = require('../config/constants');

async function seedAdmin() {
  const email = (config.admin.email || '').trim().toLowerCase();
  const password = config.admin.password || '';
  const name = (config.admin.name || 'SportLinked Admin').trim();
  const force = process.argv.includes('--force');

  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be set in server/.env before seeding an admin.',
    );
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long.');
  }

  await connectDatabase(config.mongodbUri);

  let user = await User.findOne({ email });

  if (user) {
    if (user.role !== ROLES.ADMIN) {
      throw new Error(
        `A non-admin account already exists for ${email}. Use a different ADMIN_EMAIL or resolve the account manually.`,
      );
    }

    if (!force) {
      logger.info(`Admin ${email} already exists. Use --force to reset its password and status.`);
      return;
    }

    await user.setPassword(password);
    user.name = name;
    user.role = ROLES.ADMIN;
    user.status = USER_STATUS.ACTIVE;
    user.isEmailVerified = true;
    user.onboardingCompleted = true;
    await user.save();
    logger.info(`Admin ${email} updated (password reset by --force).`);
    return;
  }

  user = new User({
    name,
    email,
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    isEmailVerified: true,
    onboardingCompleted: true,
  });
  await user.setPassword(password);
  await user.save();

  logger.info(`Admin ${email} created successfully.`);
}

seedAdmin()
  .catch((error) => {
    logger.error('Admin seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
