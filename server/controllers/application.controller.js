const applicationService = require('../services/application.service');
const { uploadDocument } = require('../services/media.service');
const ApiError = require('../utils/ApiError');
const { success, paginated } = require('../utils/apiResponse');

async function applyToOpportunity(req, res) {
  const application = await applicationService.applyToOpportunity(
    req.user,
    req.params.id,
    req.body,
  );
  return success(res, {
    statusCode: 201,
    data: { application },
    message: 'Application submitted.',
  });
}

async function getApplication(req, res) {
  const application = await applicationService.getApplication(req.user, req.params.id);
  return success(res, { data: { application }, message: 'Application retrieved.' });
}

async function listMyApplications(req, res) {
  const result = await applicationService.listMyApplications(req.user, req.query);
  return paginated(res, {
    data: { applications: result.applications },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Applications retrieved.',
  });
}

async function listApplicants(req, res) {
  const result = await applicationService.listApplicants(
    req.user,
    req.params.id,
    req.query,
  );
  return paginated(res, {
    data: {
      applications: result.applications,
      statusCounts: result.statusCounts,
    },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Applicants retrieved.',
  });
}

async function withdrawApplication(req, res) {
  const application = await applicationService.withdrawApplication(req.user, req.params.id);
  return success(res, { data: { application }, message: 'Application withdrawn.' });
}

async function updateApplicationStatus(req, res) {
  const application = await applicationService.updateApplicationStatus(
    req.user,
    req.params.id,
    req.body,
  );
  return success(res, { data: { application }, message: 'Application status updated.' });
}

async function shortlistApplication(req, res) {
  const application = await applicationService.shortlistApplication(
    req.user,
    req.params.id,
    req.body,
  );
  return success(res, { data: { application }, message: 'Applicant shortlisted.' });
}

async function uploadApplicationDocument(req, res) {
  if (!req.file) {
    throw ApiError.badRequest('Choose a document to upload.', 'DOCUMENT_REQUIRED');
  }

  const uploaded = await uploadDocument(req.file, { folder: 'application-documents' });
  return success(res, {
    statusCode: 201,
    message: 'Document uploaded.',
    data: {
      document: {
        name: req.file.originalname,
        ...uploaded,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    },
  });
}

module.exports = {
  applyToOpportunity,
  getApplication,
  listMyApplications,
  listApplicants,
  withdrawApplication,
  updateApplicationStatus,
  shortlistApplication,
  uploadApplicationDocument,
};
