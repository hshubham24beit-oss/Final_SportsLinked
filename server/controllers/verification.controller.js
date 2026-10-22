const verificationService = require('../services/verification.service');
const evidenceService = require('../services/evidence.service');
const ApiError = require('../utils/ApiError');
const { success, paginated } = require('../utils/apiResponse');

async function uploadEvidence(req, res) {
  if (!req.file) {
    throw ApiError.badRequest('Choose a file to upload.', 'EVIDENCE_REQUIRED');
  }
  const evidence = await verificationService.uploadVerificationEvidence(
    req.user,
    req.file,
    req.body.label || '',
  );
  return success(res, {
    statusCode: 201,
    message: 'Evidence uploaded privately.',
    data: { evidence },
  });
}

async function submitRequest(req, res) {
  const request = await verificationService.submitVerificationRequest(req.user, req.body);
  return success(res, {
    statusCode: 201,
    message: 'Verification request submitted.',
    data: { request },
  });
}

async function listRequests(req, res) {
  const result = await verificationService.listOwnVerificationRequests(req.user);
  return success(res, {
    data: {
      requests: result.requests,
      summary: result.summary,
      achievements: result.achievements,
    },
    message: 'Verification requests retrieved.',
  });
}

async function getRequest(req, res) {
  const request = await verificationService.getOwnVerificationRequest(
    req.user,
    req.params.id,
  );
  return success(res, { data: { request }, message: 'Verification request retrieved.' });
}

async function resubmitRequest(req, res) {
  const request = await verificationService.resubmitVerificationRequest(
    req.user,
    req.params.id,
    req.body,
  );
  return success(res, { data: { request }, message: 'Verification request resubmitted.' });
}

async function getEvidenceUrl(req, res) {
  const evidence = await verificationService.getEvidenceSignedUrl(
    req.user,
    req.params.id,
    req.params.evidenceId,
  );
  return success(res, { data: { evidence }, message: 'Evidence link created.' });
}

async function serveLocalEvidence(req, res) {
  const evidence = await verificationService.findEvidenceBySignedToken(req.params.token);
  const buffer = await evidenceService.readLocalEvidence(evidence);
  res.set({
    'Content-Type': evidence.mimeType,
    'Content-Disposition': `inline; filename="${String(evidence.originalName || 'evidence').replace(
      /["\\\r\n]/g,
      '',
    )}"`,
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  });
  return res.status(200).send(buffer);
}

async function adminListRequests(req, res) {
  const result = await verificationService.adminListVerificationRequests({
    ...req.query,
    adminId: req.user._id,
  });
  return paginated(res, {
    data: {
      requests: result.requests,
      statusCounts: result.statusCounts,
    },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Verification queue retrieved.',
  });
}

async function adminGetRequest(req, res) {
  const request = await verificationService.adminGetVerificationRequest(req.params.id);
  return success(res, { data: { request }, message: 'Verification request retrieved.' });
}

async function adminClaimRequest(req, res) {
  const request = await verificationService.claimVerificationRequest(
    req.user,
    req.params.id,
  );
  return success(res, { data: { request }, message: 'Verification request claimed.' });
}

async function adminDecideRequest(req, res) {
  const request = await verificationService.decideVerificationRequest(
    req.user,
    req.params.id,
    req.body,
  );
  return success(res, {
    data: { request },
    message:
      req.body.decision === 'approved'
        ? 'Verification approved.'
        : 'Verification rejected.',
  });
}

module.exports = {
  uploadEvidence,
  submitRequest,
  listRequests,
  getRequest,
  resubmitRequest,
  getEvidenceUrl,
  serveLocalEvidence,
  adminListRequests,
  adminGetRequest,
  adminClaimRequest,
  adminDecideRequest,
};
