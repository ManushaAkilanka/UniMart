import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyProfile, updateMyProfile } from '../utils/api';
import { cn } from '../utils/cn';

const FACULTIES = [
  'Faculty of Science',
  'Faculty of Arts',
  'Faculty of Medicine',
  'Faculty of Engineering',
  'Faculty of Law',
  'Faculty of Management',
  'Faculty of Technology',
  'Faculty of Education',
  'Faculty of Graduate Studies',
  'Other',
];

const CAMPUSES = [
  'University of Colombo',
  'University of Peradeniya',
  'University of Sri Jayewardenepura',
  'University of Kelaniya',
  'University of Moratuwa',
  'University of Jaffna',
  'University of Ruhuna',
  'Eastern University',
  'South Eastern University',
  'Rajarata University',
  'Sabaragamuwa University',
  'Wayamba University',
  'Uva Wellassa University',
  'University of the Visual & Performing Arts',
  'Open University of Sri Lanka',
  'Other',
];

const timeAgo = (date) => {
  if (!date) return 'Unknown';
  const d = new Date(date);
  return d.toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, loading: authLoading, checkSession } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [form, setForm] = useState({ fullName: '', faculty: '', campus: '', avatarUrl: '' });
  const [formErrors, setFormErrors] = useState({});
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setLoadingProfile(true);

    getMyProfile()
      .then((res) => {
        if (!cancelled) {
          const u = res.data?.user;
          setProfile(u);
          setForm({
            fullName: u?.fullName ?? '',
            faculty: u?.faculty ?? '',
            campus: u?.campus ?? '',
            avatarUrl: u?.avatarUrl ?? '',
          });
        }
      })
      .catch(() => {
        // Fall back to auth context user if profile fetch fails
        if (!cancelled && authUser) {
          setProfile(authUser);
          setForm({
            fullName: authUser.fullName ?? '',
            faculty: authUser.faculty ?? '',
            campus: authUser.campus ?? '',
            avatarUrl: authUser.avatarUrl ?? '',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, authUser]);

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      errs.fullName = 'Full name must be at least 2 characters.';
    }
    if (form.fullName.trim().length > 100) {
      errs.fullName = 'Full name must not exceed 100 characters.';
    }
    if (form.avatarUrl && form.avatarUrl.trim()) {
      try { new URL(form.avatarUrl); } catch {
        errs.avatarUrl = 'Please enter a valid image URL.';
      }
    }
    return errs;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    setFormErrors({});

    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        ...(form.faculty && { faculty: form.faculty }),
        ...(form.campus && { campus: form.campus }),
        ...(form.avatarUrl?.trim() && { avatarUrl: form.avatarUrl.trim() }),
      };

      const res = await updateMyProfile(payload);
      setProfile(res.data?.user);
      setSaveSuccess(true);
      setEditing(false);
      // Refresh auth context so navbar avatar updates
      await checkSession();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName ?? '',
      faculty: profile.faculty ?? '',
      campus: profile.campus ?? '',
      avatarUrl: profile.avatarUrl ?? '',
    });
    setFormErrors({});
    setSaveError(null);
    setEditing(false);
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-surface pt-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-secondary/30 border-t-secondary animate-spin" />
          <p className="font-body-md text-on-surface-variant">Loading profile…</p>
        </div>
      </div>
    );
  }

  const displayUser = profile || authUser;
  const initials = displayUser?.fullName
    ? displayUser.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="min-h-screen bg-surface pt-20">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/dashboard"
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface">My Profile</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Manage your public student identity
            </p>
          </div>
        </div>

        {/* Success banner */}
        {saveSuccess && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary mb-6 animate-fadeIn">
            <span className="material-symbols-outlined">check_circle</span>
            <p className="font-body-md font-semibold">Profile updated successfully!</p>
          </div>
        )}

        {/* Main card */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-level1 overflow-hidden">
          {/* Avatar section */}
          <div className="relative bg-gradient-to-br from-secondary/20 via-secondary/10 to-surface-container h-32">
            <div className="absolute -bottom-10 left-8">
              {displayUser?.avatarUrl ? (
                <img
                  src={displayUser.avatarUrl}
                  alt={displayUser.fullName}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-surface-container-lowest shadow-level2"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center text-2xl font-bold border-4 border-surface-container-lowest shadow-level2">
                  {initials}
                </div>
              )}
              {displayUser?.isVerified && (
                <span
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-secondary flex items-center justify-center shadow-level1"
                  title="Verified university student"
                >
                  <span className="material-symbols-outlined text-on-secondary text-sm leading-none">verified</span>
                </span>
              )}
            </div>

            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-surface/80 backdrop-blur-sm text-on-surface font-headline-sm text-headline-sm hover:bg-surface transition-colors shadow-level1"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Edit Profile
              </button>
            )}
          </div>

          {/* Profile info / form */}
          <div className="px-8 pt-14 pb-8">
            {!editing ? (
              // ── View mode ──────────────────────────────────────────────────
              <div>
                <div className="flex items-start gap-3 mb-1">
                  <h2 className="font-headline-xl text-headline-xl text-on-surface">
                    {displayUser?.fullName || '—'}
                  </h2>
                  {displayUser?.isVerified && (
                    <span className="mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary/10 text-secondary border border-secondary/20">
                      Verified
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-on-surface-variant font-body-md">
                  {displayUser?.faculty && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">school</span>
                      {displayUser.faculty}
                    </div>
                  )}
                  {displayUser?.campus && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {displayUser.campus}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">calendar_month</span>
                    Joined {timeAgo(displayUser?.createdAt)}
                  </div>
                </div>

                {/* Privacy note */}
                <div className="mt-6 p-4 rounded-xl bg-surface-container flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary text-base mt-0.5">shield</span>
                  <div>
                    <p className="font-label-md font-semibold text-on-surface mb-0.5">Privacy Protected</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Your email address and student ID are never shown on your public profile.
                      Only your name, faculty, and campus are visible to other students.
                    </p>
                  </div>
                </div>

                {/* Links */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/my-listings"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">storefront</span>
                    My Listings
                  </Link>
                  <Link
                    to="/saved"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">favorite</span>
                    Saved Items
                  </Link>
                </div>
              </div>
            ) : (
              // ── Edit mode ──────────────────────────────────────────────────
              <form onSubmit={handleSave} noValidate className="flex flex-col gap-5">
                {saveError && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-error-container text-on-error-container">
                    <span className="material-symbols-outlined">error</span>
                    <p className="font-body-md">{saveError}</p>
                  </div>
                )}

                {/* Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md font-semibold text-on-surface" htmlFor="profile-fullName">
                    Full Name <span className="text-error">*</span>
                  </label>
                  <input
                    id="profile-fullName"
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="Your full name"
                    className={cn(
                      'w-full h-12 px-4 rounded-xl border bg-surface-container-lowest font-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 transition-all',
                      formErrors.fullName
                        ? 'border-error focus:ring-error/20'
                        : 'border-outline-variant/40 focus:ring-secondary/20 focus:border-secondary'
                    )}
                  />
                  {formErrors.fullName && (
                    <p className="text-error font-label-sm text-[12px]">{formErrors.fullName}</p>
                  )}
                </div>

                {/* Faculty */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md font-semibold text-on-surface" htmlFor="profile-faculty">
                    Faculty
                  </label>
                  <select
                    id="profile-faculty"
                    value={form.faculty}
                    onChange={(e) => setForm((f) => ({ ...f, faculty: e.target.value }))}
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                  >
                    <option value="">Select faculty…</option>
                    {FACULTIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                {/* Campus */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md font-semibold text-on-surface" htmlFor="profile-campus">
                    Campus
                  </label>
                  <select
                    id="profile-campus"
                    value={form.campus}
                    onChange={(e) => setForm((f) => ({ ...f, campus: e.target.value }))}
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                  >
                    <option value="">Select campus…</option>
                    {CAMPUSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Avatar URL */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md font-semibold text-on-surface" htmlFor="profile-avatar">
                    Avatar URL
                  </label>
                  <input
                    id="profile-avatar"
                    type="url"
                    value={form.avatarUrl}
                    onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                    placeholder="https://example.com/your-photo.jpg"
                    className={cn(
                      'w-full h-12 px-4 rounded-xl border bg-surface-container-lowest font-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 transition-all',
                      formErrors.avatarUrl
                        ? 'border-error focus:ring-error/20'
                        : 'border-outline-variant/40 focus:ring-secondary/20 focus:border-secondary'
                    )}
                  />
                  {formErrors.avatarUrl && (
                    <p className="text-error font-label-sm text-[12px]">{formErrors.avatarUrl}</p>
                  )}
                  {form.avatarUrl && !formErrors.avatarUrl && (
                    <div className="flex items-center gap-2 mt-1">
                      <img
                        src={form.avatarUrl}
                        alt="Avatar preview"
                        className="w-10 h-10 rounded-xl object-cover border border-outline-variant/20"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <span className="font-label-sm text-on-surface-variant text-[11px]">Preview</span>
                    </div>
                  )}
                </div>

                {/* Privacy note in edit mode */}
                <div className="p-3 rounded-xl bg-surface-container flex items-start gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm mt-0.5">info</span>
                  <p className="font-body-sm text-[12px]">
                    Email and student ID cannot be changed here. Only your name, faculty, campus, and avatar are editable.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-colors shadow-level1 disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-on-secondary/30 border-t-on-secondary animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">save</span>
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-6 py-3 rounded-xl border border-outline-variant/40 text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
