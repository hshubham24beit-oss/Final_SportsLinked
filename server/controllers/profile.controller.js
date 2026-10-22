const profileService = require('../services/profile.service');
const { success } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');

async function getMyProfile(req, res) {
  const profile = await profileService.getOwnProfile(req.user);

  return success(res, {
    message: profile ? 'Profile retrieved.' : 'No profile has been created yet.',
    data: {
      profile: profile ? profileService.serializeOwnProfile(req.user, profile) : null,
    },
  });
}

async function createProfile(req, res) {
  const profile = await profileService.createProfile(req.user, req.body);

  return success(res, {
    statusCode: 201,
    message: 'Profile created.',
    data: { profile },
  });
}

async function updateProfile(req, res) {
  const profile = await profileService.updateProfile(req.user, req.body);

  return success(res, {
    message: 'Profile updated.',
    data: { profile },
  });
}

async function completeOnboarding(req, res) {
  const profile = await profileService.completeOnboarding(req.user, req.body);

  return success(res, {
    message: 'Onboarding complete. Your profile is live.',
    data: { profile, user: req.user },
  });
}

async function getPublicProfile(req, res) {
  const profile = await profileService.getPublicProfile(req.params.slug, req.user);

  return success(res, {
    message: 'Profile retrieved.',
    data: { profile },
  });
}

async function uploadAvatar(req, res) {
  const profile = await profileService.setProfileImage(req.user, 'avatar', req.file);

  return success(res, {
    message: 'Profile photo updated.',
    data: { profile },
  });
}

async function uploadCover(req, res) {
  const profile = await profileService.setProfileImage(req.user, 'cover', req.file);

  return success(res, {
    message: 'Cover image updated.',
    data: { profile },
  });
}

async function clearAvatar(req, res) {
  const profile = await profileService.clearProfileImage(req.user, 'avatar');

  return success(res, {
    message: 'Profile photo removed.',
    data: { profile },
  });
}

async function clearCover(req, res) {
  const profile = await profileService.clearProfileImage(req.user, 'cover');

  return success(res, {
    message: 'Cover image removed.',
    data: { profile },
  });
}

async function addGalleryImage(req, res) {
  const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() : '';
  if (caption.length > 200) {
    throw ApiError.badRequest(
      'Gallery captions cannot exceed 200 characters.',
      'GALLERY_CAPTION_TOO_LONG',
    );
  }

  const profile = await profileService.addGalleryImage(req.user, req.file, caption);

  return success(res, {
    statusCode: 201,
    message: 'Gallery image added.',
    data: { profile },
  });
}

async function removeGalleryImage(req, res) {
  const profile = await profileService.removeGalleryImage(req.user, req.params.itemId);

  return success(res, {
    message: 'Gallery image removed.',
    data: { profile },
  });
}

module.exports = {
  getMyProfile,
  createProfile,
  updateProfile,
  completeOnboarding,
  getPublicProfile,
  uploadAvatar,
  uploadCover,
  clearAvatar,
  clearCover,
  addGalleryImage,
  removeGalleryImage,
};
