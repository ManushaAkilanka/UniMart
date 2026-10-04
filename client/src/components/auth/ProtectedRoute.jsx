import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children, requireVerified = false, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-space-md">
        <div className="w-12 h-12 rounded-xl bg-secondary-container text-secondary flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-2xl animate-spin">
            progress_activity
          </span>
        </div>
        <div className="flex flex-col items-center text-center gap-1">
          <span className="font-headline-sm text-headline-sm text-on-surface">
            Validating Campus Session...
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Verifying cryptographic university credentials
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerified && user && !user.isVerified) {
    return <Navigate to="/verify-email" state={{ email: user.email, from: location }} replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/browse" replace />;
  }

  return children;
};
