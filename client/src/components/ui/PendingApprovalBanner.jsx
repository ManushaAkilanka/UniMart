import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * PendingApprovalBanner
 *
 * Renders a sticky amber warning strip just below the navbar for any user
 * whose accountStatus is 'pending_approval'. Dismissible for the current
 * browser session only.
 */
export const PendingApprovalBanner = () => {
  const { isPendingApproval } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!isPendingApproval || dismissed) return null;

  return (
    <div
      id="pending-approval-banner"
      role="alert"
      aria-live="polite"
      style={{
        background: 'linear-gradient(90deg, #92400e 0%, #b45309 50%, #92400e 100%)',
        borderBottom: '1px solid rgba(251,191,36,0.3)',
      }}
      className="w-full z-40 px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-between gap-3">
        {/* Icon + Message */}
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
          <span
            className="material-symbols-outlined text-amber-300 flex-shrink-0 mt-0.5 sm:mt-0"
            style={{ fontSize: '1.25rem' }}
            aria-hidden="true"
          >
            pending_actions
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <span className="text-amber-100 font-semibold text-sm whitespace-nowrap">
              Account pending approval
            </span>
            <span className="hidden sm:inline text-amber-300/60">·</span>
            <span className="text-amber-200/80 text-sm leading-snug">
              Your account is awaiting admin review. You can browse listings, but you cannot{' '}
              <strong className="text-amber-100 font-medium">post listings</strong>,{' '}
              <strong className="text-amber-100 font-medium">claim free items</strong>, or{' '}
              <strong className="text-amber-100 font-medium">message sellers</strong> until
              approved.
            </span>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss pending approval notice"
          className="flex-shrink-0 text-amber-300 hover:text-amber-100 transition-colors p-1 rounded-md hover:bg-amber-800/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
            close
          </span>
        </button>
      </div>
    </div>
  );
};
