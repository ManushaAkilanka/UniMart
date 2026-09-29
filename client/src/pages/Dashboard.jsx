import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg py-space-xl">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-container via-brand-navy to-secondary/80 text-white p-space-xl sm:p-space-2xl shadow-level2 mb-space-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-secondary/20 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg">
          <div className="flex items-center gap-space-md">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest text-primary flex items-center justify-center font-bold text-2xl shadow-level2 shrink-0">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs flex-wrap">
                <h1 className="font-headline-xl text-headline-xl font-bold tracking-tight">
                  Ayubowan, {user?.fullName}!
                </h1>
                {user?.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary text-white text-xs font-semibold">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    <span>Verified Student</span>
                  </span>
                )}
              </div>
              <p className="text-white/80 font-body-md text-body-md mt-1">
                {user?.faculty || 'Undergraduate'} · {user?.campus || 'University of Colombo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-space-sm self-stretch md:self-auto flex-wrap">
            <Link to="/sell" className="flex-1 md:flex-none">
              <Button variant="primary" size="md" leftIcon="add" className="w-full">
                Post Listing
              </Button>
            </Link>
            <Link to="/my-listings" className="flex-1 md:flex-none">
              <Button
                variant="outline"
                size="md"
                leftIcon="inventory_2"
                className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                My Listings
              </Button>
            </Link>
            <Button
              variant="outline"
              size="md"
              leftIcon="logout"
              onClick={handleLogout}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Grid of Profile Details & Session Persistence Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-lg">
        {/* User Identity Card */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/30 shadow-level1 flex flex-col gap-space-md">
          <div className="flex items-center gap-space-xs text-secondary">
            <span className="material-symbols-outlined text-xl">badge</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Student Identity
            </h2>
          </div>

          <div className="flex flex-col gap-space-sm divide-y divide-outline-variant/20">
            <div className="pt-space-xs flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Full Legal Name</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                {user?.fullName}
              </span>
            </div>
            <div className="pt-space-xs flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Campus Email</span>
              <span className="font-code-sm text-code-sm text-secondary font-mono">
                {user?.email}
              </span>
            </div>
            <div className="pt-space-xs flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Faculty Department</span>
              <span className="font-body-md text-body-md text-on-surface">
                {user?.faculty || 'Not specified'}
              </span>
            </div>
            <div className="pt-space-xs flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Primary Campus Hub</span>
              <span className="font-body-md text-body-md text-on-surface">
                {user?.campus || 'University of Colombo'}
              </span>
            </div>
            <div className="pt-space-xs flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Access Role</span>
              <span className="px-2 py-0.5 rounded bg-surface-container font-code-sm text-code-sm text-on-surface capitalize">
                {user?.role || 'student'}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Verification Telemetry */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/30 shadow-level1 flex flex-col gap-space-md">
          <div className="flex items-center gap-space-xs text-secondary">
            <span className="material-symbols-outlined text-xl">verified_user</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Verification Status
            </h2>
          </div>

          <div className="flex flex-col gap-space-md">
            <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-secondary text-2xl mt-0.5">
                {user?.isVerified ? 'check_circle' : 'pending'}
              </span>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {user?.isVerified ? 'Institutional Email Verified' : 'Pending Confirmation'}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {user?.isVerified
                    ? 'Your university mailbox has been authenticated. You have unrestricted campus marketplace trading privileges.'
                    : 'Please enter the 6-digit code sent to your academic inbox to unlock listing access.'}
                </span>
              </div>
            </div>

            <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 flex flex-col gap-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                Session Persistence
              </span>
              <div className="flex items-center gap-2 text-secondary font-medium text-sm">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span>Active via HTTP-Only JWT Cookie</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Reloading or refreshing this browser tab will maintain your authenticated session
                automatically through secure cookies.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Marketplace Actions */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/30 shadow-level1 flex flex-col gap-space-md">
          <div className="flex items-center gap-space-xs text-secondary">
            <span className="material-symbols-outlined text-xl">storefront</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Campus Shortcuts
            </h2>
          </div>

          <div className="flex flex-col gap-space-xs">
            <Link
              to="/browse"
              className="p-space-sm rounded-lg hover:bg-surface-container transition-colors flex items-center justify-between group border border-outline-variant/20"
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors">
                  search
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Browse Campus Marketplace
                </span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-0.5 transition-transform">
                chevron_right
              </span>
            </Link>

            <Link
              to="/my-listings"
              className="p-space-sm rounded-lg hover:bg-surface-container transition-colors flex items-center justify-between group border border-outline-variant/20"
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors">
                  inventory_2
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Manage My Listings
                </span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-0.5 transition-transform">
                chevron_right
              </span>
            </Link>

            <Link
              to="/sell"
              className="p-space-sm rounded-lg hover:bg-surface-container transition-colors flex items-center justify-between group border border-outline-variant/20"
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors">
                  post_add
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Sell an Item / Create Listing
                </span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-0.5 transition-transform">
                chevron_right
              </span>
            </Link>

            <Link
              to="/design-check"
              className="p-space-sm rounded-lg hover:bg-surface-container transition-colors flex items-center justify-between group border border-outline-variant/20"
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors">
                  palette
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Phase 2 UI Design Showcase
                </span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-0.5 transition-transform">
                chevron_right
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
