const express = require('express');
const teamController = require('../controllers/team.controller');
const {
  authenticate,
  authorizeRoles,
  requireUnrestrictedAccount,
} = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  teamCreateSchema,
  teamUpdateSchema,
  teamListQuerySchema,
  teamInviteSchema,
  teamInvitationResponseSchema,
  teamMemberRoleSchema,
  teamUpdateCreateSchema,
} = require('../validators/team.validator');
const { PUBLIC_ROLES } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get(
  '/discover',
  validate(teamListQuerySchema, 'query'),
  asyncHandler(teamController.discoverTeams),
);
router.get(
  '/mine',
  authorizeRoles(...PUBLIC_ROLES),
  asyncHandler(teamController.listMyTeams),
);
router.post(
  '/',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  validate(teamCreateSchema),
  asyncHandler(teamController.createTeam),
);

router.get('/:id', asyncHandler(teamController.getTeam));
router.patch(
  '/:id',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  validate(teamUpdateSchema),
  asyncHandler(teamController.updateTeam),
);
router.delete(
  '/:id',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  asyncHandler(teamController.deleteTeam),
);

router.post(
  '/:id/members',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  validate(teamInviteSchema),
  asyncHandler(teamController.inviteMember),
);
router.post(
  '/:id/respond',
  authorizeRoles(...PUBLIC_ROLES),
  validate(teamInvitationResponseSchema),
  asyncHandler(teamController.respondToInvitation),
);
router.get('/:id/members', asyncHandler(teamController.listMembers));
router.delete(
  '/:id/membership',
  authorizeRoles(...PUBLIC_ROLES),
  asyncHandler(teamController.leaveTeam),
);
router.delete(
  '/:id/members/:userId',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  asyncHandler(teamController.removeMember),
);
router.patch(
  '/:id/members/:userId',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  validate(teamMemberRoleSchema),
  asyncHandler(teamController.updateMemberRole),
);

router.get('/:id/updates', asyncHandler(teamController.listUpdates));
router.post(
  '/:id/updates',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  validate(teamUpdateCreateSchema),
  asyncHandler(teamController.postUpdate),
);

module.exports = router;
