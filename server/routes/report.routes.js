const express = require('express');
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { reportCreateSchema } = require('../validators/verification.validator');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);
router.get('/mine', asyncHandler(reportController.listMyReports));
router.post(
  '/',
  validate(reportCreateSchema),
  asyncHandler(reportController.createReport),
);

module.exports = router;
