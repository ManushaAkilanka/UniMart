import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../utils/api';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState(null);

  const validate = () => {
    if (!email.trim()) {
      setFieldError('Email address is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Please enter a valid email address');
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    try {
      setLoading(true);
      await forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full py-space-xl md:py-space-2xl px-margin md:px-margin-md flex flex-col items-center justify-center overflow-hidden min-h-[calc(100vh-5rem)]">
      {/* Ambient glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-secondary-container/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-surface-container-high/60 blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10 flex flex-col items-center">
        <div className="w-full bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] p-space-xl sm:p-space-2xl border border-outline-variant/30">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-sm mb-space-md">
              <span className="material-symbols-outlined text-3xl text-on-primary">lock_reset</span>
            </div>

            <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-surface-container-low text-secondary mb-space-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span className="font-label-sm text-label-sm font-semibold tracking-wide uppercase">
                Password Recovery
              </span>
            </div>

            <h1 className="font-headline-xl text-headline-xl text-on-surface">Forgot your password?</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs max-w-sm">
              Enter your email and we'll send you a secure reset link if an account exists.
            </p>
          </div>

          {submitted ? (
            /* Success state */
            <div className="mt-space-xl flex flex-col items-center gap-space-md text-center">
              <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-secondary">mark_email_read</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Check your inbox
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-xs">
                  If an account is linked to <span className="font-semibold text-on-surface">{email}</span>,
                  you'll receive a reset link within a few minutes. Check your spam folder too.
                </p>
              </div>
              <Link
                to="/login"
                className="mt-space-sm inline-flex items-center gap-space-xs font-headline-sm text-headline-sm text-secondary hover:underline"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back to Sign In
              </Link>
            </div>
          ) : (
            /* Form */
            <>
              {error && (
                <div className="mt-space-lg mb-space-md p-space-sm rounded-lg bg-error-container/40 text-on-error-container border border-error/30 flex items-start gap-space-xs text-sm">
                  <span className="material-symbols-outlined text-base shrink-0 mt-0.5 text-error">error</span>
                  <span>{error}</span>
                </div>
              )}

              <form className="mt-space-lg space-y-space-md" onSubmit={handleSubmit} noValidate>
                <div>
                  <label
                    htmlFor="reset-email"
                    className="font-headline-sm text-headline-sm text-on-surface block mb-space-2xs"
                  >
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-space-md text-on-surface-variant text-lg pointer-events-none">
                      mail
                    </span>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldError) setFieldError(null);
                      }}
                      placeholder="e.g. student@university.ac.lk"
                      className={`w-full h-11 pl-11 pr-space-md rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 font-body-md text-body-md outline-none focus:bg-surface-container-lowest shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,108,74,0.3)] border transition-all ${
                        fieldError ? 'border-error bg-error-container/10' : 'border-transparent'
                      }`}
                    />
                  </div>
                  {fieldError && (
                    <p className="mt-1 text-xs text-error flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-xs">info</span>
                      {fieldError}
                    </p>
                  )}
                </div>

                <div className="pt-space-xs">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-headline-md text-headline-md flex items-center justify-center gap-space-xs shadow-sm hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                        <span>Sending Reset Link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Reset Link</span>
                        <span className="material-symbols-outlined text-lg">send</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-space-xl pt-space-md flex items-center justify-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer note */}
        <div className="w-full mt-space-lg flex items-center justify-center gap-space-lg font-body-sm text-body-sm text-on-surface-variant">
          <span className="flex items-center gap-space-2xs">
            <span className="material-symbols-outlined text-sm text-secondary">lock</span>
            Reset links expire in 30 minutes
          </span>
          <span>•</span>
          <span className="flex items-center gap-space-2xs">
            <span className="material-symbols-outlined text-sm text-secondary">verified_user</span>
            Single-use &amp; secure
          </span>
        </div>
      </div>
    </div>
  );
};
