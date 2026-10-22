const { z } = require('zod');
const { CONNECTION_MESSAGE_MAX } = require('../config/constants');

const sendConnectionSchema = z.object({
  userId: z.string().trim().min(1, 'Choose an account to connect with.'),
  message: z.string().trim().max(CONNECTION_MESSAGE_MAX).optional(),
});

module.exports = { sendConnectionSchema };
