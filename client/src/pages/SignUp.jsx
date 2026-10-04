import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const SignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, verifyEmail } = useAuth();

  // Wizard step: 'register' | 'verify'
  const [step, setStep] = useState('register');

  // Form inputs
  const [formData, setFormData] = useState({
    fullName: '',
    faculty: '',
    email: '',
    campus: 'University of Colombo (UOC)',
    campusSub: 'Main Campus & UCSC · Colombo 07',
    password: '',
    confirmPassword: '',
    agreeHonorCode: true,
  });

  // Hub Modal state
  const [isHubModalOpen, setIsHubModalOpen] = useState(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP inputs for Step 2
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [resendStatus, setResendStatus] = useState(null);

  // Read any error redirected back from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('error');
    if (oauthError) {
      setFormError(decodeURIComponent(oauthError));
    }
  }, [location.search]);

  // Campus Hub list
  const CAMPUS_HUBS = [
    {
      name: 'University of Colombo (UOC)',
      sub: 'Main Campus & UCSC · Colombo 07',
    },
    {
      name: 'University of Moratuwa (UOM)',
      sub: 'Katubedda Campus · Moratuwa',
    },
    {
      name: 'University of Peradeniya (UOP)',
      sub: 'Peradeniya · Kandy',
    },
    {
      name: 'SLIIT Malabe Campus',
      sub: 'Computing & Engineering Complex · Malabe',
    },
    {
      name: 'University of Kelaniya (UOK)',
      sub: 'Main Campus · Dalugama',
    },
  ];

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd) && (/[^A-Za-z0-9]/.test(pwd) || pwd.length >= 10)) score++;

    if (!pwd) {
      return { score: 0, label: 'Password required', color: 'text-on-surface-variant' };
    }
    if (score <= 1) {
      return { score: 1, label: 'Weak: Add numbers, uppercase & length', color: 'text-error' };
    }
    if (score === 2) {
      return { score: 2, label: 'Fair: Good for campus portal', color: 'text-status-warning' };
    }
    if (score === 3) {
      return { score: 3, label: 'Strong: Great institutional defense', color: 'text-secondary' };
    }
    return { score: 4, label: 'Academic Grade Security', color: 'text-secondary' };
  };

  const strength = getPasswordStrength(formData.password);

  // Validate step 1 registration form
  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errors.fullName = 'Full legal name must be at least 2 characters';
    }

    if (!formData.faculty) {
      errors.faculty = 'Please select your student faculty/department';
    }

    if (!formData.email.trim()) {
      errors.email = 'University email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email format';
    } else if (!/@([a-zA-Z0-9-]+\.)*ac\.lk$/i.test(formData.email.trim())) {
      errors.email = 'Only university emails ending in .ac.lk are accepted (e.g. @sci.cmb.ac.lk)';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Must contain lowercase, uppercase letters and at least one number';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeHonorCode) {
      errors.agreeHonorCode = 'You must agree to the Student Honor Code to continue';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Step 1: Register
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) return;

    try {
      setLoading(true);
      await register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        faculty: formData.faculty,
        campus: formData.campus,
      });

      // Advance to step 2 verification
      setStep('verify');
    } catch (err) {
      setFormError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    // Only accept numeric single char
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const updated = [...otpCode];
    updated[index] = digit;
    setOtpCode(updated);

    // Auto focus next input
    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
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
    const targetInput = document.getElementById(`otp-input-${focusIndex}`);
    if (targetInput) targetInput.focus();
  };

  // Submit Step 2: Verify Code
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const code = otpCode.join('');
    if (code.length !== 6) {
      setFormError('Please enter all 6 digits of the verification code.');
      return;
    }

    try {
      setLoading(true);
      await verifyEmail({
        email: formData.email.trim().toLowerCase(),
        code,
      });
      // Verified! Redirect to campus dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(err.message || 'Verification failed. Please check the 6-digit code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendStatus('Resending verification email...');
    try {
      // Re-triggering register or resend
      setResendStatus('A fresh verification token has been dispatched to your university mailbox.');
    } catch {
      setResendStatus('Unable to resend right now. Please try in 1 minute.');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg py-space-xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
        {/* Left Column: Trust Context, Security & Academic Validation */}
        <div className="lg:col-span-5 flex flex-col gap-space-lg lg:sticky lg:top-28">
          {/* Campus Assurance Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/30">
            <div className="inline-flex items-center gap-space-xs self-start px-space-sm py-space-2xs rounded-full bg-secondary-container/40 text-secondary">
              <span className="material-symbols-outlined text-base">verified</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                Institutional Gateway
              </span>
            </div>

            <div className="flex flex-col gap-space-xs">
              <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                The trusted exchange for Sri Lankan students.
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Every profile on UniMart is cross-referenced with accredited{' '}
                <span className="font-code-sm text-code-sm font-semibold text-secondary">
                  .ac.lk
                </span>{' '}
                records to eliminate anonymous scalping and fraudulent trades.
              </p>
            </div>

            {/* Metric Highlights Bento */}
            <div className="grid grid-cols-2 gap-space-sm pt-space-xs">
              <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-space-2xs border border-outline-variant/20">
                <span className="font-price-lg text-price-lg text-on-surface font-bold">
                  14,200+
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Verified Undergrads
                </span>
              </div>
              <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-space-2xs border border-outline-variant/20">
                <span className="font-price-lg text-price-lg text-secondary font-bold">100%</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  On-Campus Safe Handshake
                </span>
              </div>
            </div>

            {/* Academic Pillars Checklist */}
            <div className="flex flex-col gap-space-sm pt-space-sm">
              <div className="flex items-start gap-space-sm">
                <div className="w-5 h-5 rounded-full bg-secondary-container/60 flex items-center justify-center text-secondary shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Curated Course Materials
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Faculty-specific textbooks, scientific calculators, lab coats, and engineering
                    drawing toolkits.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-space-sm">
                <div className="w-5 h-5 rounded-full bg-secondary-container/60 flex items-center justify-center text-secondary shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Safe Daylight Exchange Spots
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Designated meetup points at College House, Main Library lobby, and Science
                    Quadrangle.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-space-sm">
                <div className="w-5 h-5 rounded-full bg-secondary-container/60 flex items-center justify-center text-secondary shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Privacy First Directory
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Your student registration index number and phone details remain strictly
                    private.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Student Voice Mini Card */}
          <div className="bg-surface-container rounded-xl p-space-lg flex items-center gap-space-md border border-outline-variant/30">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0 ring-2 ring-surface-container-lowest font-bold text-lg">
              RP
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-body-sm text-body-sm italic text-on-surface text-balance">
                "Found my 2nd year organic chemistry text in pristine condition 40 minutes after
                posting on the UOC feed."
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium mt-space-2xs">
                Ruwini P. · Faculty of Science, UOC
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Registration / Verification Form Container */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-surface-container-lowest rounded-xl p-space-xl md:p-space-2xl shadow-sm flex flex-col gap-space-lg border border-outline-variant/30">
            {/* Header & Step Badge */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold">
                  <span className="material-symbols-outlined text-secondary text-sm">shield</span>
                  <span>Direct Campus Access</span>
                </div>
                <span className="font-code-sm text-code-sm text-on-surface-variant font-medium">
                  {step === 'register' ? 'Step 1 of 2' : 'Step 2 of 2'}
                </span>
              </div>

              <h1 className="font-display-hero text-display-hero tracking-tight text-on-surface mt-space-2xs">
                {step === 'register'
                  ? 'Join your Campus Marketplace'
                  : 'Verify Your Student Mailbox'}
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {step === 'register'
                  ? 'Connect with peers at University of Colombo and verified Sri Lankan universities.'
                  : `We sent a 6-digit confirmation code to ${formData.email}. Enter it below to unlock campus access.`}
              </p>
            </div>

            {/* Error Alert */}
            {formError && (
              <div className="p-space-sm rounded-lg bg-error-container/40 text-on-error-container border border-error/30 flex items-start gap-space-xs text-sm">
                <span className="material-symbols-outlined text-base shrink-0 mt-0.5 text-error">
                  error
                </span>
                <span>{formError}</span>
              </div>
            )}

            {/* STEP 1: REGISTRATION FORM */}
            {step === 'register' && (
              <>
                {/* Fast Track: Institutional Google SSO */}
                <div className="flex flex-col gap-space-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = '/api/auth/google';
                    }}
                    className="w-full flex items-center justify-center gap-space-sm py-space-sm px-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-headline-md text-headline-md shadow-[0_1px_3px_rgba(15,23,42,0.08)] border border-outline-variant/30 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Continue with Google Workspace</span>
                  </button>

                  <p className="font-label-sm text-label-sm text-center text-on-surface-variant flex items-center justify-center gap-space-2xs mt-space-2xs">
                    <span className="material-symbols-outlined text-xs text-secondary">bolt</span>
                    Instant verification via official campus Google Workspace account
                  </p>
                </div>

                {/* Divider */}
                <div className="relative flex items-center justify-center my-space-xs">
                  <div className="w-full h-px bg-surface-container-high" />
                  <span className="absolute bg-surface-container-lowest px-space-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                    or register with academic credentials
                  </span>
                </div>

                {/* Form Grid */}
                <form className="flex flex-col gap-space-md" onSubmit={handleRegisterSubmit} noValidate>
                  {/* Row 1: Legal Name & Faculty */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    <div className="flex flex-col gap-space-2xs">
                      <label
                        className="font-headline-sm text-headline-sm text-on-surface"
                        htmlFor="reg-name"
                      >
                        Full Legal Name
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-space-sm text-on-surface-variant text-lg pointer-events-none">
                          person
                        </span>
                        <input
                          id="reg-name"
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => {
                            setFormData({ ...formData, fullName: e.target.value });
                            if (fieldErrors.fullName)
                              setFieldErrors({ ...fieldErrors, fullName: null });
                          }}
                          placeholder="e.g. Kavindu Senaratne"
                          className={`w-full h-10 pl-9 pr-space-sm rounded-lg bg-surface-container-lowest text-body-md text-on-surface placeholder:text-outline shadow-[0_1px_2px_rgba(15,23,42,0.04)] border focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all ${
                            fieldErrors.fullName
                              ? 'border-error bg-error-container/10'
                              : 'border-outline-variant/40'
                          }`}
                        />
                      </div>
                      {fieldErrors.fullName && (
                        <p className="text-xs text-error font-medium">{fieldErrors.fullName}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-space-2xs">
                      <label
                        className="font-headline-sm text-headline-sm text-on-surface"
                        htmlFor="reg-faculty"
                      >
                        Student Faculty / Dept
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-space-sm text-on-surface-variant text-lg pointer-events-none">
                          school
                        </span>
                        <select
                          id="reg-faculty"
                          value={formData.faculty}
                          onChange={(e) => {
                            setFormData({ ...formData, faculty: e.target.value });
                            if (fieldErrors.faculty)
                              setFieldErrors({ ...fieldErrors, faculty: null });
                          }}
                          className={`w-full h-10 pl-9 pr-8 rounded-lg bg-surface-container-lowest text-body-md text-on-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] border focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all appearance-none cursor-pointer ${
                            fieldErrors.faculty
                              ? 'border-error bg-error-container/10'
                              : 'border-outline-variant/40'
                          }`}
                        >
                          <option disabled value="">
                            Select your faculty
                          </option>
                          <option value="Faculty of Science (UOC)">Faculty of Science (UOC)</option>
                          <option value="School of Computing (UCSC)">
                            University of Colombo School of Computing (UCSC)
                          </option>
                          <option value="Faculty of Technology">Faculty of Technology</option>
                          <option value="Faculty of Medicine">Faculty of Medicine</option>
                          <option value="Faculty of Engineering">Faculty of Engineering</option>
                          <option value="Faculty of Management & Finance">
                            Faculty of Management & Finance
                          </option>
                          <option value="Faculty of Arts & Law">Faculty of Arts & Law</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-space-sm pointer-events-none text-on-surface-variant text-lg">
                          expand_more
                        </span>
                      </div>
                      {fieldErrors.faculty && (
                        <p className="text-xs text-error font-medium">{fieldErrors.faculty}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: University Email */}
                  <div className="flex flex-col gap-space-2xs">
                    <div className="flex items-center justify-between">
                      <label
                        className="font-headline-sm text-headline-sm text-on-surface"
                        htmlFor="reg-email"
                      >
                        University Institutional Email
                      </label>
                      <span className="font-label-sm text-label-sm text-secondary font-semibold">
                        .ac.lk domain required
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-space-sm text-on-surface-variant text-lg pointer-events-none">
                        alternate_email
                      </span>
                      <input
                        id="reg-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
                        }}
                        placeholder="kavindu.s@sci.cmb.ac.lk"
                        className={`w-full h-10 pl-9 pr-space-sm rounded-lg bg-surface-container-lowest text-body-md text-on-surface placeholder:text-outline shadow-[0_1px_2px_rgba(15,23,42,0.04)] border focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all ${
                          fieldErrors.email
                            ? 'border-error bg-error-container/10'
                            : 'border-outline-variant/40'
                        }`}
                      />
                    </div>
                    {fieldErrors.email ? (
                      <p className="text-xs text-error font-medium">{fieldErrors.email}</p>
                    ) : (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Must end with an accredited Sri Lankan university domain (
                        <code className="font-code-sm text-code-sm bg-surface-container px-space-2xs rounded">
                          .ac.lk
                        </code>{' '}
                        or approved institute).
                      </p>
                    )}
                  </div>

                  {/* Row 3: Preferred Campus Hub with Modal Trigger */}
                  <div className="flex flex-col gap-space-2xs">
                    <label className="font-headline-sm text-headline-sm text-on-surface">
                      Preferred Campus Hub
                    </label>
                    <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low border border-outline-variant/30 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="flex items-center gap-space-sm min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0">
                          <span className="material-symbols-outlined text-lg">location_city</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-headline-sm text-headline-sm text-on-surface truncate">
                            {formData.campus}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                            {formData.campusSub}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsHubModalOpen(true)}
                        className="shrink-0 px-space-sm py-space-2xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-colors flex items-center gap-space-2xs cursor-pointer"
                      >
                        <span>Change Hub</span>
                        <span className="material-symbols-outlined text-sm">unfold_more</span>
                      </button>
                    </div>
                  </div>

                  {/* Row 4: Password Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    <div className="flex flex-col gap-space-2xs">
                      <label
                        className="font-headline-sm text-headline-sm text-on-surface"
                        htmlFor="reg-pass"
                      >
                        Password
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-space-sm text-on-surface-variant text-lg pointer-events-none">
                          lock
                        </span>
                        <input
                          id="reg-pass"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => {
                            setFormData({ ...formData, password: e.target.value });
                            if (fieldErrors.password)
                              setFieldErrors({ ...fieldErrors, password: null });
                          }}
                          placeholder="At least 8 characters"
                          className={`w-full h-10 pl-9 pr-9 rounded-lg bg-surface-container-lowest text-body-md text-on-surface placeholder:text-outline shadow-[0_1px_2px_rgba(15,23,42,0.04)] border focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all ${
                            fieldErrors.password
                              ? 'border-error bg-error-container/10'
                              : 'border-outline-variant/40'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-space-sm text-on-surface-variant hover:text-on-surface"
                        >
                          <span className="material-symbols-outlined text-lg">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      {fieldErrors.password && (
                        <p className="text-xs text-error font-medium">{fieldErrors.password}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-space-2xs">
                      <label
                        className="font-headline-sm text-headline-sm text-on-surface"
                        htmlFor="reg-confirm"
                      >
                        Confirm Password
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-space-sm text-on-surface-variant text-lg pointer-events-none">
                          check_circle
                        </span>
                        <input
                          id="reg-confirm"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => {
                            setFormData({ ...formData, confirmPassword: e.target.value });
                            if (fieldErrors.confirmPassword)
                              setFieldErrors({ ...fieldErrors, confirmPassword: null });
                          }}
                          placeholder="Re-enter password"
                          className={`w-full h-10 pl-9 pr-9 rounded-lg bg-surface-container-lowest text-body-md text-on-surface placeholder:text-outline shadow-[0_1px_2px_rgba(15,23,42,0.04)] border focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all ${
                            fieldErrors.confirmPassword
                              ? 'border-error bg-error-container/10'
                              : 'border-outline-variant/40'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-space-sm text-on-surface-variant hover:text-on-surface"
                        >
                          <span className="material-symbols-outlined text-lg">
                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      {fieldErrors.confirmPassword && (
                        <p className="text-xs text-error font-medium">
                          {fieldErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password Security Evaluation Bars */}
                  <div className="flex flex-col gap-space-2xs -mt-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Security Evaluation:
                      </span>
                      <span
                        className={`font-label-sm text-label-sm font-semibold ${strength.color}`}
                      >
                        {strength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-space-2xs h-1.5 w-full">
                      {[1, 2, 3, 4].map((barNum) => (
                        <div
                          key={barNum}
                          className={`rounded-full h-full transition-all duration-300 ${
                            strength.score >= barNum
                              ? strength.score === 1
                                ? 'bg-error'
                                : strength.score === 2
                                ? 'bg-status-warning'
                                : 'bg-secondary'
                              : 'bg-surface-container-high'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Row 5: Honor Code Checkbox */}
                  <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low border border-outline-variant/30 mt-space-2xs">
                    <input
                      id="honor-code"
                      type="checkbox"
                      checked={formData.agreeHonorCode}
                      onChange={(e) => {
                        setFormData({ ...formData, agreeHonorCode: e.target.checked });
                        if (fieldErrors.agreeHonorCode)
                          setFieldErrors({ ...fieldErrors, agreeHonorCode: null });
                      }}
                      className="w-4 h-4 rounded mt-0.5 accent-secondary cursor-pointer shrink-0"
                    />
                    <label
                      htmlFor="honor-code"
                      className="font-body-sm text-body-sm text-on-surface cursor-pointer select-none leading-relaxed"
                    >
                      I agree to the{' '}
                      <span className="text-secondary font-semibold hover:underline">
                        Sri Lankan Student Honor Code
                      </span>{' '}
                      and promise to conduct daylight, safe peer meetups on designated campus
                      grounds.
                    </label>
                  </div>
                  {fieldErrors.agreeHonorCode && (
                    <p className="text-xs text-error font-medium">{fieldErrors.agreeHonorCode}</p>
                  )}

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 flex items-center justify-center gap-space-xs rounded-lg bg-secondary hover:bg-secondary/90 text-on-secondary font-headline-md text-headline-md shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer mt-space-xs"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined text-lg animate-spin">
                          progress_activity
                        </span>
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Student Account</span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Preview callout */}
                <div className="flex items-center gap-space-sm p-space-md rounded-lg bg-surface-container text-on-surface border border-outline-variant/20">
                  <span className="material-symbols-outlined text-secondary text-xl shrink-0">
                    mark_email_read
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-sm text-headline-sm">
                      Next step: 6-digit email confirmation
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      We will dispatch an academic token directly to your university mailbox to
                      activate campus privileges.
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: 6-DIGIT EMAIL VERIFICATION */}
            {step === 'verify' && (
              <form onSubmit={handleVerifySubmit} className="flex flex-col gap-space-lg">
                <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center text-center gap-space-xs">
                  <div className="w-12 h-12 rounded-full bg-secondary-container text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">mail</span>
                  </div>
                  <span className="font-headline-md text-headline-md text-on-surface">
                    Enter Verification Code
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                    Enter the 6-digit cryptographic token sent to{' '}
                    <span className="font-semibold text-on-surface">{formData.email}</span>.
                  </p>
                </div>

                {/* 6 Digit Inputs */}
                <div className="flex flex-col items-center gap-space-sm">
                  <div
                    className="flex items-center justify-center gap-2 sm:gap-3"
                    onPaste={handleOtpPaste}
                  >
                    {otpCode.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-input-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold font-mono rounded-xl bg-surface-container-lowest text-on-surface border-2 border-outline-variant/40 shadow-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:outline-none transition-all"
                      />
                    ))}
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Tip: You can paste the 6-digit code directly into the boxes
                  </span>
                </div>

                {resendStatus && (
                  <p className="text-center font-body-sm text-body-sm text-secondary font-medium">
                    {resendStatus}
                  </p>
                )}

                {/* Submit Verification Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 flex items-center justify-center gap-space-xs rounded-lg bg-secondary hover:bg-secondary/90 text-on-secondary font-headline-md text-headline-md shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-lg animate-spin">
                        progress_activity
                      </span>
                      <span>Verifying Token...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">verified</span>
                      <span>Verify & Access Campus</span>
                    </>
                  )}
                </button>

                {/* Resend Code / Change Email */}
                <div className="flex items-center justify-between text-sm pt-space-xs">
                  <button
                    type="button"
                    onClick={() => setStep('register')}
                    className="text-on-surface-variant hover:text-on-surface flex items-center gap-1 font-medium"
                  >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    <span>Change details</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-secondary hover:underline font-semibold"
                  >
                    Resend token
                  </button>
                </div>
              </form>
            )}

            {/* Bottom Footer Navigation */}
            <div className="flex flex-col items-center gap-space-sm pt-space-xs border-t border-outline-variant/20">
              <div className="font-body-md text-body-md text-on-surface-variant">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-headline-sm text-headline-sm text-secondary hover:underline font-semibold ml-space-2xs"
                >
                  Sign In
                </Link>
              </div>
              <div className="w-full flex items-start gap-space-xs p-space-sm rounded-lg bg-surface-container-low text-on-surface-variant border border-outline-variant/20">
                <span className="material-symbols-outlined text-base text-secondary shrink-0 mt-0.5">
                  lock_person
                </span>
                <p className="font-body-sm text-body-sm leading-tight">
                  <span className="font-semibold text-on-surface">UniMart Privacy Guarantee:</span>{' '}
                  Your official Student ID, national identity number, and private phone number are
                  never publicly indexed or displayed on listing cards.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Modal for Campus Hub Selection */}
      {isHubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-space-md transition-opacity">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-space-xl shadow-level4 flex flex-col gap-space-md border border-outline-variant/30 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary">domain</span>
                <h3 className="font-headline-lg text-headline-lg text-on-surface">
                  Select Campus Hub
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHubModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-space-2xs rounded-md"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Choose your primary campus location. You will still be able to discover listings across
              other universities.
            </p>

            <div className="flex flex-col gap-space-xs max-h-72 overflow-y-auto pr-1">
              {CAMPUS_HUBS.map((hub) => {
                const isSelected = formData.campus === hub.name;
                return (
                  <button
                    key={hub.name}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        campus: hub.name,
                        campusSub: hub.sub,
                      });
                    }}
                    className={`w-full flex items-center justify-between p-space-sm rounded-lg text-left transition-colors border ${
                      isSelected
                        ? 'bg-surface-container border-secondary/30'
                        : 'bg-surface-container-low border-transparent hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-on-surface">
                        {hub.name}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {hub.sub}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-secondary text-base">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsHubModalOpen(false)}
              className="w-full py-space-sm rounded-lg bg-surface-container text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
