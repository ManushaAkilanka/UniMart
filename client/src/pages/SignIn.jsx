import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberDevice: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const from = location.state?.from?.pathname || '/dashboard';

  // Read any error redirected back from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('error');
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
    }
  }, [location.search]);

  const validate = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = 'University email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    } else if (!/@([a-zA-Z0-9-]+\.)*ac\.lk$/i.test(formData.email.trim())) {
      errors.email = 'Only university emails ending in .ac.lk are accepted';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
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
      await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      // Redirect to intended page or dashboard
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full py-space-xl md:py-space-2xl px-margin md:px-margin-md flex flex-col items-center justify-center overflow-hidden min-h-[calc(100vh-5rem)]">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-secondary-container/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-surface-container-high/60 blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10 flex flex-col items-center">
        {/* Main Card */}
        <div className="w-full bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] p-space-xl sm:p-space-2xl border border-outline-variant/30">
          {/* Card Header */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-sm mb-space-md">
              <svg
                className="w-8 h-8 text-secondary-fixed"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-surface-container-low text-secondary mb-space-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span className="font-label-sm text-label-sm font-semibold tracking-wide uppercase">
                Official Student Portal
              </span>
            </div>

            <h1 className="font-headline-xl text-headline-xl text-on-surface">
              Welcome back, Scholar
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs max-w-sm">
              Sign in to access student listings, peer messages, and verified campus deals.
            </p>
          </div>

          {/* Google SSO */}
          <div className="mt-space-lg">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/api/auth/google';
              }}
              className="w-full flex flex-col items-center justify-center p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container active:scale-[0.99] transition-all group text-left border border-outline-variant/30 cursor-pointer shadow-sm"
            >
              <div className="w-full flex items-center justify-center gap-space-sm">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.1C3.25 21.36 7.33 24 12 24z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.58H1.26A11.96 11.96 0 000 12c0 1.92.45 3.74 1.26 5.42l4.02-3.1z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.1c.95-2.83 3.6-4.93 6.72-4.93z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="font-headline-md text-headline-md text-on-surface">
                  Continue with Google Workspace
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant text-center mt-space-2xs">
                Recommended for institutional Google accounts (
                <span className="font-code-sm text-code-sm text-secondary">@cmb.ac.lk</span>,{' '}
                <span className="font-code-sm text-code-sm text-secondary">@mrt.ac.lk</span>,{' '}
                <span className="font-code-sm text-code-sm text-secondary">@pdn.ac.lk</span>)
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-space-lg">
            <div className="w-full h-px bg-surface-container-high" />
            <span className="absolute px-space-md bg-surface-container-lowest font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              or sign in with campus email
            </span>
          </div>

          {/* Global Error Banner */}
          {error && (
            <div className="mb-space-md p-space-sm rounded-lg bg-error-container/40 text-on-error-container border border-error/30 flex items-start gap-space-xs text-sm">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5 text-error">
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-space-md" onSubmit={handleSubmit} noValidate>
            {/* Campus Email */}
            <div>
              <div className="flex items-center justify-between mb-space-2xs">
                <label
                  className="font-headline-sm text-headline-sm text-on-surface"
                  htmlFor="campus-email"
                >
                  University Email Address
                </label>
                <span className="font-code-sm text-code-sm text-secondary flex items-center gap-space-2xs">
                  <span className="material-symbols-outlined text-sm">verified</span> @*.ac.lk
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-space-md text-on-surface-variant text-lg pointer-events-none">
                  school
                </span>
                <input
                  id="campus-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
                  }}
                  placeholder="e.g. s19482@sci.cmb.ac.lk"
                  className={`w-full h-11 pl-11 pr-space-md rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 font-body-md text-body-md outline-none focus:bg-surface-container-lowest shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,108,74,0.3)] border transition-all ${
                    fieldErrors.email ? 'border-error bg-error-container/10' : 'border-transparent'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-error flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-xs">info</span>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-space-2xs">
                <label
                  className="font-headline-sm text-headline-sm text-on-surface"
                  htmlFor="campus-pwd"
                >
                  Password
                </label>
                <Link
                  to="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset link will be sent to your verified student email.');
                  }}
                  className="font-label-md text-label-md text-secondary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-space-md text-on-surface-variant text-lg pointer-events-none">
                  lock
                </span>
                <input
                  id="campus-pwd"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null });
                  }}
                  placeholder="••••••••••••"
                  className={`w-full h-11 pl-11 pr-16 rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 font-body-md text-body-md outline-none focus:bg-surface-container-lowest shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,108,74,0.3)] border transition-all ${
                    fieldErrors.password
                      ? 'border-error bg-error-container/10'
                      : 'border-transparent'
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
            </div>

            {/* Remember device checkbox */}
            <div className="flex items-center justify-between pt-space-2xs">
              <label className="flex items-center gap-space-sm cursor-pointer select-none">
                <input
                  id="remember-device"
                  type="checkbox"
                  checked={formData.rememberDevice}
                  onChange={(e) =>
                    setFormData({ ...formData, rememberDevice: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-secondary accent-secondary focus:ring-0 cursor-pointer"
                />
                <span className="font-body-sm text-body-sm text-on-surface">
                  Remember this trusted campus device for 30 days
                </span>
              </label>
            </div>

            {/* Submit button */}
            <div className="pt-space-xs">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-headline-md text-headline-md flex items-center justify-center gap-space-xs shadow-sm hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">
                      progress_activity
                    </span>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Campus</span>
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* New to UniMart Box */}
          <div className="mt-space-xl pt-space-md flex flex-col items-center justify-center text-center gap-space-xs bg-surface-container-low rounded-lg p-space-md">
            <p className="font-body-md text-body-md text-on-surface">
              New to UniMart?
              <Link
                to="/register"
                className="font-headline-sm text-headline-sm text-secondary hover:underline ml-space-2xs font-semibold"
              >
                Create an account / Sign Up
              </Link>
            </p>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Matriculated university students receive free verification & priority badges.
            </span>
          </div>
        </div>

        {/* Verified Student Network Shield Callout */}
        <div className="w-full mt-space-lg bg-surface-container rounded-xl p-space-lg shadow-sm border border-outline-variant/30">
          <div className="flex items-start gap-space-md">
            <div className="w-9 h-9 rounded-full bg-secondary-container text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">shield_person</span>
            </div>
            <div className="flex-1">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Verified Student Network Shield
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs leading-relaxed">
                UniMart authenticates institutional domain credentials to prevent off-campus spam,
                commercial bots, and unauthorized brokers. Direct peer exchange strictly for campus
                affiliates.
              </p>
              <div className="mt-space-md flex flex-wrap items-center gap-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mr-space-xs">
                  Recognized:
                </span>
                <span className="px-space-sm py-space-2xs rounded-full bg-surface-container-lowest font-code-sm text-code-sm text-on-surface shadow-level1">
                  UOC Colombo
                </span>
                <span className="px-space-sm py-space-2xs rounded-full bg-surface-container-lowest font-code-sm text-code-sm text-on-surface shadow-level1">
                  UOM Moratuwa
                </span>
                <span className="px-space-sm py-space-2xs rounded-full bg-surface-container-lowest font-code-sm text-code-sm text-on-surface shadow-level1">
                  UOP Peradeniya
                </span>
                <span className="px-space-sm py-space-2xs rounded-full bg-surface-container-lowest font-code-sm text-code-sm text-on-surface shadow-level1">
                  UOK Kelaniya
                </span>
                <span className="px-space-sm py-space-2xs rounded-full bg-surface-container-lowest font-code-sm text-code-sm text-on-surface shadow-level1">
                  SLIIT
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Support Footnote */}
        <div className="w-full mt-space-lg flex items-center justify-center gap-space-lg font-body-sm text-body-sm text-on-surface-variant">
          <span className="flex items-center gap-space-2xs">
            <span className="material-symbols-outlined text-sm text-secondary">lock</span>
            256-Bit SSL Campus Encryption
          </span>
          <span>•</span>
          <span className="hover:text-on-surface transition-colors cursor-pointer">
            IT Helpdesk & SSO Support
          </span>
        </div>
      </div>
    </div>
  );
};
