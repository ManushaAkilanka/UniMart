import { z } from 'zod';

// ── Register ──────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  body: z.object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must not exceed 100 characters'),

    email: z
      .string({ required_error: 'Email is required' })
      .email('Please provide a valid email address')
      .toLowerCase()
      .trim(),

    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),

    faculty: z.string().trim().max(100).optional().nullable(),
    campus: z.string().trim().max(100).optional().nullable(),
  }),
});

// ── Login ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Please provide a valid email address')
      .toLowerCase()
      .trim(),

    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  }),
});

// ── Verify Email ──────────────────────────────────────────────────────────────
export const verifyEmailSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Please provide a valid email address')
      .toLowerCase()
      .trim(),

    code: z
      .string({ required_error: 'Verification code is required' })
      .length(6, 'Verification code must be exactly 6 digits')
      .regex(/^\d{6}$/, 'Verification code must contain only digits'),
  }),
});
