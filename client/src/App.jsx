import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PageLayout } from './components/layout/PageLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { VerifyEmail } from './pages/VerifyEmail';
import { Dashboard } from './pages/Dashboard';
import { DesignCheck } from './pages/DesignCheck';

const PlaceholderPage = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center text-center py-space-3xl gap-space-md">
    <div className="w-16 h-16 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-level1">
      <span className="material-symbols-outlined text-3xl">construction</span>
    </div>
    <div className="max-w-md">
      <h2 className="font-headline-xl text-headline-xl text-on-surface mb-1">{title}</h2>
      <p className="font-body-md text-body-md text-on-surface-variant">{description}</p>
    </div>
    <div className="pt-space-xs flex items-center gap-space-sm">
      <a
        href="/browse"
        className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-all shadow-level1"
      >
        <span>Explore Marketplace</span>
        <span className="material-symbols-outlined text-base">arrow_forward</span>
      </a>
      <a
        href="/design-check"
        className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container-high transition-all"
      >
        <span>UI Showcase</span>
      </a>
    </div>
  </div>
);

const HomeRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/browse" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <PageLayout>
        <Routes>
          {/* Public & Auth Routes */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/register" element={<SignUp />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sell"
            element={
              <ProtectedRoute requireVerified={true}>
                <PlaceholderPage
                  title="Post a Campus Listing"
                  description="Listing creation wizard with verified student tag and daylight meetup selector."
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <PlaceholderPage
                  title="Student Chat & Meetup Messages"
                  description="Direct peer-to-peer communication between verified university students."
                />
              </ProtectedRoute>
            }
          />

          {/* Design showcase & Marketplace pages */}
          <Route path="/design-check" element={<DesignCheck />} />
          <Route
            path="/browse"
            element={
              <PlaceholderPage
                title="Browse Listings"
                description="Listing feed and campus filter interface will be mounted here in the next phase."
              />
            }
          />
          <Route
            path="/categories"
            element={
              <PlaceholderPage
                title="Campus Categories"
                description="Browse items segmented by academic faculty, exam courses, and hostel equipment."
              />
            }
          />
          <Route
            path="/wanted"
            element={
              <PlaceholderPage
                title="Student Wanted Board"
                description="Peer request board for syllabus books, calculators, and exam materials."
              />
            }
          />
          <Route
            path="/free"
            element={
              <PlaceholderPage
                title="Zero-Cost Peer Pool"
                description="Give away semester lecture notes and study lamps to junior students for free."
              />
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/browse" replace />} />
        </Routes>
      </PageLayout>
    </AuthProvider>
  );
}
