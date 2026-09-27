/**
 * Email Service
 * - Production: uses real SMTP credentials from ENV
 * - Development: creates an Ethereal test account on first use and logs
 *   the preview URL so developers can inspect sent emails in the browser
 */
import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';

let _transporter = null;

/**
 * Lazily builds (and caches) the Nodemailer transporter.
 * In development, an Ethereal account is auto-provisioned.
 */
async function getTransporter() {
  if (_transporter) return _transporter;

  if (ENV.NODE_ENV !== 'production' && !ENV.SMTP_HOST) {
    // ── Ethereal (dev/test) ────────────────────────────────────────────────
    const testAccount = await nodemailer.createTestAccount();
    console.log('[Mailer] Using Ethereal test account:', testAccount.user);
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } else {
    // ── Real SMTP ──────────────────────────────────────────────────────────
    _transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_PORT === 465,
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });
  }

  return _transporter;
}

/**
 * Send an email verification code to a newly registered user.
 * @param {string} to   - Recipient email address
 * @param {string} code - 6-digit plaintext OTP
 */
export async function sendVerificationEmail(to, code) {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: ENV.EMAIL_FROM,
    to,
    subject: '🎓 Verify your UniMart account',
    text: `Your UniMart verification code is: ${code}\n\nThis code expires in ${ENV.VERIFICATION_CODE_EXPIRY_MINUTES} minutes.\n\nIf you did not create an account, you can safely ignore this email.`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
        <h1 style="color: #1e293b; font-size: 22px; margin-bottom: 8px;">🎓 Verify your UniMart account</h1>
        <p style="color: #64748b; margin-bottom: 24px;">Enter the code below in the app to complete your registration.</p>
        <div style="background: #fff; border: 2px solid #e2e8f0; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #6d28d9; font-family: monospace;">${code}</span>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">This code expires in <strong>${ENV.VERIFICATION_CODE_EXPIRY_MINUTES} minutes</strong>.</p>
        <p style="color: #94a3b8; font-size: 13px;">If you did not create a UniMart account, you can safely ignore this email.</p>
      </div>
    `,
  });

  // In development, log the Ethereal preview URL and verification code for easy inspection
  if (ENV.NODE_ENV !== 'production') {
    console.log(`[Mailer] ✉️  Verification code for ${to}: ${code}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Mailer] ✉️  Verification email preview: ${previewUrl}`);
    }
  }

  return info;
}
