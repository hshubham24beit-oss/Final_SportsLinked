const User = require('../models/User');
const AthleteProfile = require('../models/AthleteProfile');
const CoachProfile = require('../models/CoachProfile');
const Organization = require('../models/Organization');
const Achievement = require('../models/Achievement');
const SavedCandidate = require('../models/SavedCandidate');
const BlockedUser = require('../models/BlockedUser');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const SavedOpportunity = require('../models/SavedOpportunity');
const Notification = require('../models/Notification');
const Connection = require('../models/Connection');
const Follow = require('../models/Follow');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Team = require('../models/Team');
const TeamMembership = require('../models/TeamMembership');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const {
  generateOpaqueToken,
  hashToken,
  safeCompareHash,
  issueTokenPair,
  verifyRefreshToken,
} = require('../utils/tokens');
const {
  ROLES,
  USER_STATUS,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
} = require('../config/constants');
const emailService = require('./email.service');
const { safeDeleteImage, deleteDocument } = require('./media.service');
const { deleteVerificationDataForUser } = require('./verification.service');
const { deleteReportsForUser } = require('./report.service');
const postService = require('./post.service');

function assertActiveAccount(user) {
  if (user.status === USER_STATUS.SUSPENDED) {
    throw new ApiError(
      403,
      'This account is suspended. Contact SportLinked support if you believe this is a mistake.',
      'ACCOUNT_SUSPENDED',
    );
  }
  if (user.status === USER_STATUS.DEACTIVATED) {
    throw new ApiError(
      403,
      'This account has been deactivated and can no longer be used.',
      'ACCOUNT_DEACTIVATED',
    );
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function registerUser({ name, email, password, role }) {
  if (role === ROLES.ADMIN) {
    throw ApiError.forbidden(
      'Admin accounts cannot be created through public registration.',
      'ADMIN_REGISTRATION_FORBIDDEN',
    );
  }

  const normalizedEmail = normalizeEmail(email);
  const existing = await User.exists({ email: normalizedEmail });
  if (existing) {
    throw ApiError.conflict(
      'An account with this email already exists. Try signing in instead.',
      'EMAIL_IN_USE',
    );
  }

  const verificationToken = generateOpaqueToken();

  const user = new User({
    name: name.trim(),
    email: normalizedEmail,
    role,
    emailVerificationTokenHash: hashToken(verificationToken),
    emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });

  await user.setPassword(password);
  await user.save();

  let emailSent = true;
  try {
    await emailService.sendVerificationEmail(user, verificationToken);
  } catch (error) {
    emailSent = false;
    logger.error(`Failed to send verification email to ${user.email}`, error);
  }

  return { user, emailSent };
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ email: normalizeEmail(email) }).select('+passwordHash');
  const passwordMatches = user ? await user.comparePassword(password) : false;

  if (!user || !passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  assertActiveAccount(user);

  const { accessToken, refreshToken } = issueTokenPair(user);
  user.refreshTokenHash = hashToken(refreshToken);
  user.lastLoginAt = new Date();
  await user.save();

  return { user, accessToken, refreshToken };
}

async function rotateSession(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw ApiError.unauthorized('No active session was found. Please sign in.', 'REFRESH_TOKEN_MISSING');
  }

  const payload = verifyRefreshToken(rawRefreshToken);
  const user = await User.findById(payload.sub).select('+refreshTokenHash');

  if (!user) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.', 'REFRESH_TOKEN_INVALID');
  }

  assertActiveAccount(user);

  if (!safeCompareHash(hashToken(rawRefreshToken), user.refreshTokenHash)) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.', 'REFRESH_TOKEN_INVALID');
  }

  const { accessToken, refreshToken } = issueTokenPair(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  return { user, accessToken, refreshToken };
}

async function logoutUser(rawRefreshToken) {
  if (!rawRefreshToken) {
    return;
  }

  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    return;
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (
    user &&
    user.refreshTokenHash &&
    safeCompareHash(hashToken(rawRefreshToken), user.refreshTokenHash)
  ) {
    user.refreshTokenHash = null;
    await user.save();
  }
}

async function verifyEmail(rawToken) {
  const user = await User.findOne({
    emailVerificationTokenHash: hashToken(rawToken),
    emailVerificationExpiresAt: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');

  if (!user) {
    throw ApiError.badRequest(
      'This verification link is invalid or has expired. Request a new one from your account settings.',
      'INVALID_VERIFICATION_TOKEN',
    );
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  await user.save();

  return user;
}

async function resendVerification(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('Your account could not be found. Please sign in again.', 'USER_NOT_FOUND');
  }

  if (user.isEmailVerified) {
    throw ApiError.badRequest('Your email is already verified.', 'EMAIL_ALREADY_VERIFIED');
  }

  const verificationToken = generateOpaqueToken();
  user.emailVerificationTokenHash = hashToken(verificationToken);
  user.emailVerificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await user.save();

  try {
    await emailService.sendVerificationEmail(user, verificationToken);
  } catch (error) {
    logger.error(`Failed to resend verification email to ${user.email}`, error);
    throw new ApiError(
      502,
      'We could not send the verification email right now. Please try again shortly.',
      'EMAIL_SEND_FAILED',
    );
  }

  return user;
}

async function forgotPassword(email) {
  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user || user.status !== USER_STATUS.ACTIVE) {
    return;
  }

  const resetToken = generateOpaqueToken();
  user.passwordResetTokenHash = hashToken(resetToken);
  user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();

  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
  } catch (error) {
    logger.error(`Failed to send password reset email to ${user.email}`, error);
  }
}

async function resetPassword(rawToken, newPassword) {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(rawToken),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt');

  if (!user) {
    throw ApiError.badRequest(
      'This password reset link is invalid or has expired. Request a new one.',
      'INVALID_RESET_TOKEN',
    );
  }

  await user.setPassword(newPassword);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  user.refreshTokenHash = null;
  await user.save();

  return user;
}

async function deactivateAccount(userId, password) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw ApiError.unauthorized('Your account could not be found. Please sign in again.', 'USER_NOT_FOUND');
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    throw ApiError.unauthorized('The password you entered is incorrect.', 'INVALID_PASSWORD');
  }

  user.status = USER_STATUS.DEACTIVATED;
  user.refreshTokenHash = null;
  await user.save();

  return user;
}

async function cascadeEventData(userId) {
  const ownedEventIds = await Event.find({ organizer: userId }).distinct('_id');
  const registrations = await EventRegistration.find({
    user: userId,
    status: { $in: ['registered', 'waitlisted'] },
    event: { $nin: ownedEventIds },
  })
    .populate('event', 'title status startAt')
    .select('event status createdAt');

  for (const registration of registrations) {
    const event = registration.event;
    await registration.deleteOne();

    if (!event || event.status !== 'published' || new Date(event.startAt) <= new Date()) {
      continue;
    }

    if (registration.status === 'registered') {
      const promoted = await EventRegistration.findOneAndUpdate(
        { event: event._id, status: 'waitlisted' },
        { $set: { status: 'registered', promotedAt: new Date() } },
        { new: true, sort: { createdAt: 1, _id: 1 } },
      );

      if (promoted) {
        await Event.updateOne(
          { _id: event._id, waitlistCount: { $gt: 0 } },
          { $inc: { waitlistCount: -1 } },
        );
        await Notification.create({
          user: promoted.user,
          type: 'event_waitlist_promoted',
          title: 'You are off the waitlist',
          message: `A place opened up for ${event.title}. Your registration is now confirmed.`,
          link: `/events/${event._id}`,
          metadata: { eventId: String(event._id) },
        });
      } else {
        await Event.updateOne(
          { _id: event._id, registrationCount: { $gt: 0 } },
          { $inc: { registrationCount: -1 } },
        );
      }
    } else {
      await Event.updateOne(
        { _id: event._id, waitlistCount: { $gt: 0 } },
        { $inc: { waitlistCount: -1 } },
      );
    }
  }

  await EventRegistration.deleteMany({
    $or: [{ user: userId }, { event: { $in: ownedEventIds } }],
  });
  await Event.deleteMany({ organizer: userId });
}

async function cascadeTeamData(userId) {
  const ownedTeamIds = await Team.find({ owner: userId }).distinct('_id');
  const activeMemberships = await TeamMembership.find({
    user: userId,
    status: 'active',
    team: { $nin: ownedTeamIds },
  })
    .select('team')
    .lean();

  if (activeMemberships.length > 0) {
    await Team.bulkWrite(
      activeMemberships.map((membership) => ({
        updateOne: {
          filter: { _id: membership.team, memberCount: { $gt: 0 } },
          update: { $inc: { memberCount: -1 } },
        },
      })),
    );
  }

  await Team.updateMany(
    { 'updates.author': userId },
    { $pull: { updates: { author: userId } } },
  );
  await TeamMembership.deleteMany({
    $or: [{ user: userId }, { team: { $in: ownedTeamIds } }],
  });
  await Team.deleteMany({ owner: userId });
}

async function deleteAccount(userId, password) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw ApiError.unauthorized('Your account could not be found. Please sign in again.', 'USER_NOT_FOUND');
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    throw ApiError.unauthorized('The password you entered is incorrect.', 'INVALID_PASSWORD');
  }

  const [profiles, ownedOpportunityIds] = await Promise.all([
    Promise.all([
      AthleteProfile.find({ user: user._id }),
      CoachProfile.find({ user: user._id }),
      Organization.find({ user: user._id }),
    ]),
    Opportunity.find({ publisher: user._id }).distinct('_id'),
  ]);

  const applications = await Application.find({
    $or: [{ athlete: user._id }, { opportunity: { $in: ownedOpportunityIds } }],
  }).select('documents');

  await AthleteProfile.deleteMany({ user: user._id });
  await CoachProfile.deleteMany({ user: user._id });
  await Organization.deleteMany({ user: user._id });
  await Achievement.deleteMany({ user: user._id });
  await SavedCandidate.deleteMany({
    $or: [{ savedBy: user._id }, { athlete: user._id }],
  });
  await BlockedUser.deleteMany({
    $or: [{ blocker: user._id }, { blocked: user._id }],
  });
  await Application.deleteMany({
    $or: [{ athlete: user._id }, { opportunity: { $in: ownedOpportunityIds } }],
  });
  await SavedOpportunity.deleteMany({
    $or: [{ user: user._id }, { opportunity: { $in: ownedOpportunityIds } }],
  });
  await Opportunity.deleteMany({ publisher: user._id });
  await Notification.deleteMany({ user: user._id });
  await Connection.deleteMany({
    $or: [{ requester: user._id }, { recipient: user._id }],
  });
    await Follow.deleteMany({
      $or: [{ follower: user._id }, { following: user._id }],
    });
    const conversationIds = await Conversation.find({
      participants: user._id,
    }).distinct('_id');
    await Message.deleteMany({
      $or: [
        { conversation: { $in: conversationIds } },
        { sender: user._id },
      ],
    });
    await Conversation.deleteMany({ _id: { $in: conversationIds } });
    await postService.deletePostsForUser(user._id);
  await cascadeEventData(user._id);
  await cascadeTeamData(user._id);
  await deleteVerificationDataForUser(user._id);
  await deleteReportsForUser(user._id);
  await user.deleteOne();

  for (const profile of profiles.flat()) {
    const assets = [profile.avatar, profile.cover, ...(profile.mediaGallery || [])];
    for (const asset of assets) {
      await safeDeleteImage(asset);
    }
  }

  for (const application of applications) {
    for (const document of application.documents || []) {
      await deleteDocument(document).catch((error) => {
        logger.warn('Could not delete an application document during account deletion', error);
      });
    }
  }
}

module.exports = {
  registerUser,
  loginUser,
  rotateSession,
  logoutUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  deactivateAccount,
  deleteAccount,
  assertActiveAccount,
};
