import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../utils/api';

const requirements = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One digit', test: (p) => /\d/.test(p) },
];

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Redirect to sign in after successful reset
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('/login', { replace: true }), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  if (!token) {
    return (
      <div className="relative w-full py-space-xl md:py-space-2xl px-margin md:px-margin-md flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
        <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] p-space-xl border border-outline-variant/30 flex flex-col items-center text-center gap-space-md">
          <span className="material-symbols-outlined text-5xl text-error">link_off</span>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Invalid Reset Link</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
            This reset link is missing a token. Please request a new password reset.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-space-xs px-space-lg h-10 rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm hover:bg-primary-container transition-all shadow-sm"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  const validate = () => {
    const errors = {};
    const failed = requirements.filter((r) => !r.test(password));
    if (failed.length > 0) {
      errors.password = `Password must include: ${failed.map((r) => r.label.toLowerCase()).join(', ')}`;
    }
    if (!confirm) {
      errors.confirm = 'Please confirm your password';
    } else if (password !== confirm) {
      errors.confirm = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    try {
      setLoading(true);
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
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
              <span className="material-symbols-outlined text-3xl text-on-primary">key</span>
            </div>

            <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-surface-container-low text-secondary mb-space-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span className="font-label-sm text-label-sm font-semibold tracking-wide uppercase">
                Set New Password
              </span>
            </div>

            <h1 className="font-headline-xl text-headline-xl text-on-surface">Reset your password</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs max-w-sm">
              Choose a strong new password for your campus account.
            </p>
          </div>

          {success ? (
            /* Success state */
            <div className="mt-space-xl flex flex-col items-center gap-space-md text-center">
              <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-secondary">check_circle</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Password updated!
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
                  Your password has been reset successfully. Redirecting you to Sign In…
                </p>
              </div>
              <Link
                to="/login"
                className="mt-space-sm inline-flex items-center gap-space-xs font-headline-sm text-headline-sm text-secondary hover:underline"
              >
                <span className="material-symbols-outlined text-base">arrow_forward</span>
                Go to Sign In
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
                {/* New Password */}
                <div>
                  <div className="flex items-center justify-between mb-space-2xs">
                    <label
                      htmlFor="new-pwd"
                      className="font-headline-sm text-headline-sm text-on-surface"
                    >
                      New Password
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-space-md text-on-surface-variant text-lg pointer-events-none">
                      lock
                    </span>
                    <input
                      id="new-pwd"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null });
                      }}
                      placeholder="••••••••••••"
                      className={`w-full h-11 pl-11 pr-16 rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 font-body-md text-body-md outline-none focus:bg-surface-container-lowest shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,108,74,0.3)] border transition-all ${
                        fieldErrors.password ? 'border-error bg-error-container/10' : 'border-transparent'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-space-sm px-space-xs py-space-2xs rounded text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm transition-colors"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-xs text-error flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-xs">info</span>
                      {fieldErrors.password}
                    </p>
                  )}

                  {/* Password requirements */}
                  <div className="mt-space-sm grid grid-cols-2 gap-x-space-md gap-y-space-2xs">
                    {requirements.map((req) => {
                      const met = req.test(password);
                      return (
                        <span
                          key={req.label}
                          className={`flex items-center gap-space-2xs font-label-sm text-label-sm transition-colors ${
                            met ? 'text-secondary' : 'text-on-surface-variant'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {met ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          {req.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirm-pwd"
                    className="font-headline-sm text-headline-sm text-on-surface block mb-space-2xs"
                  >
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-space-md text-on-surface-variant text-lg pointer-events-none">
                      lock_check
                    </span>
                    <input
                      id="confirm-pwd"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value);
                        if (fieldErrors.confirm) setFieldErrors({ ...fieldErrors, confirm: null });
                      }}
                      placeholder="••••••••••••"
                      className={`w-full h-11 pl-11 pr-space-md rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 font-body-md text-body-md outline-none focus:bg-surface-container-lowest shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,108,74,0.3)] border transition-all ${
                        fieldErrors.confirm ? 'border-error bg-error-container/10' : 'border-transparent'
                      }`}
                    />
                  </div>
                  {fieldErrors.confirm && (
                    <p className="mt-1 text-xs text-error flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-xs">info</span>
                      {fieldErrors.confirm}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <div className="pt-space-xs">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-headline-md text-headline-md flex items-center justify-center gap-space-xs shadow-sm hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                        <span>Resetting Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <span className="material-symbols-outlined text-lg">lock_reset</span>
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
            256-Bit SSL Encryption
          </span>
          <span>•</span>
          <span className="flex items-center gap-space-2xs">
            <span className="material-symbols-outlined text-sm text-secondary">history</span>
            Tokens expire after 30 minutes
          </span>
        </div>
      </div>
    </div>
  );
};
