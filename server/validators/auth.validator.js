const { z } = require('zod');

const nameSchema = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(80, 'Name cannot exceed 80 characters.');

const emailSchema = z
  .string({ required_error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254, 'Email cannot exceed 254 characters.');

const passwordSchema = z
  .string({ required_error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password cannot exceed 72 characters.')
  .regex(/[A-Za-z]/, 'Password must include at least one letter.')
  .regex(/\d/, 'Password must include at least one number.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password cannot exceed 72 bytes.',
  });

const currentPasswordSchema = z
  .string({ required_error: 'Password is required.' })
  .min(1, 'Password is required.')
  .max(200, 'Password is too long.');

const tokenSchema = z
  .string({ required_error: 'A token is required.' })
  .trim()
  .regex(/^[a-f0-9]{64}$/i, 'This token is invalid.');

const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['athlete', 'coach', 'recruiter', 'admin'], {
    errorMap: () => ({ message: 'Choose a valid role.' }),
  }),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: 'Password is required.' })
    .min(1, 'Password is required.')
    .max(200, 'Password is too long.'),
});

const verifyEmailSchema = z.object({ token: tokenSchema });

const forgotPasswordSchema = z.object({ email: emailSchema });

const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

const passwordConfirmationSchema = z.object({ password: currentPasswordSchema });

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  passwordConfirmationSchema,
};
