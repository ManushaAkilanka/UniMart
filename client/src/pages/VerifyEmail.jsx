import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, user } = useAuth();

  const [email, setEmail] = useState(location.state?.email || user?.email || '');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const updated = [...otpCode];
    updated[index] = digit;
    setOtpCode(updated);

    if (digit && index < 5) {
      const nextInput = document.getElementById(`verify-otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`verify-otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasteData) return;

    const updated = [...otpCode];
    for (let i = 0; i < pasteData.length; i++) {
      updated[i] = pasteData[i];
    }
    setOtpCode(updated);

    const focusIndex = Math.min(pasteData.length, 5);
    const targetInput = document.getElementById(`verify-otp-${focusIndex}`);
    if (targetInput) targetInput.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please provide your university email address.');
      return;
    }

    const code = otpCode.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the confirmation token.');
      return;
    }

    try {
      setLoading(true);
      await verifyEmail({
        email: email.trim().toLowerCase(),
        code,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1200);
    } catch (err) {
      setError(err.message || 'Verification token invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full py-space-xl md:py-space-2xl px-margin md:px-margin-md flex flex-col items-center justify-center overflow-hidden min-h-[calc(100vh-5rem)]">
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-surface-container-high/60 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] p-space-xl sm:p-space-2xl border border-outline-variant/30 flex flex-col gap-space-lg">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-secondary-container text-secondary flex items-center justify-center shadow-sm mb-space-sm">
            <span className="material-symbols-outlined text-3xl">mark_email_read</span>
          </div>

          <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-surface-container-low text-secondary mb-space-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="font-label-sm text-label-sm font-semibold tracking-wide uppercase">
              Email Verification
            </span>
          </div>

          <h1 className="font-headline-xl text-headline-xl text-on-surface">
            Confirm Your Student Account
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Enter the 6-digit confirmation code dispatched to your university inbox.
          </p>
        </div>

        {error && (
          <div className="p-space-sm rounded-lg bg-error-container/40 text-on-error-container border border-error/30 flex items-start gap-space-xs text-sm">
            <span className="material-symbols-outlined text-base shrink-0 mt-0.5 text-error">
              error
            </span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-space-sm rounded-lg bg-secondary-container/80 text-on-secondary-container border border-secondary/30 flex items-center gap-space-xs text-sm font-medium">
            <span className="material-symbols-outlined text-base text-secondary">
              check_circle
            </span>
            <span>Email verified successfully! Entering campus portal...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          {/* Email input if not prepopulated */}
          <div className="flex flex-col gap-1.5">
            <label className="font-headline-sm text-headline-sm text-on-surface" htmlFor="verify-email">
              University Email
            </label>
            <input
              id="verify-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. s19482@sci.cmb.ac.lk"
              required
              className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all"
            />
          </div>

          {/* 6 Digits */}
          <div className="flex flex-col items-center gap-space-xs my-space-xs">
            <label className="font-headline-sm text-headline-sm text-on-surface self-start">
              6-Digit Code
            </label>
            <div
              className="flex items-center justify-center gap-2 sm:gap-2.5 w-full"
              onPaste={handleOtpPaste}
            >
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  id={`verify-otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-bold font-mono rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/40 focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:bg-surface-container-lowest focus:outline-none transition-all"
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full h-11 rounded-lg bg-secondary hover:bg-secondary/90 text-on-secondary font-headline-md text-headline-md flex items-center justify-center gap-space-xs shadow-sm hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer mt-space-xs"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">
                  progress_activity
                </span>
                <span>Authenticating Token...</span>
              </>
            ) : (
              <>
                <span>Complete Verification</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-sm pt-space-xs border-t border-outline-variant/20">
          <Link to="/login" className="text-on-surface-variant hover:text-on-surface flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Back to Sign In</span>
          </Link>
          <Link to="/register" className="text-secondary hover:underline font-semibold">
            Create New Account
          </Link>
        </div>
      </div>
    </div>
  );
};
