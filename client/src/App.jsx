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
import { Home } from './pages/Home';
import { Browse } from './pages/Browse';
import { ListingDetail } from './pages/ListingDetail';
import { CreateListing } from './pages/CreateListing';
import { EditListing } from './pages/EditListing';
import { MyListings } from './pages/MyListings';

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
    </div>
  </div>
);

const HomeRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  // Don't redirect to dashboard; always show the marketplace home
  return <Home />;
};

export default function App() {
  return (
    <AuthProvider>
      {/* Pages that need full-bleed layout (no max-w padding wrapper) */}
      <Routes>
        {/* Auth pages – no layout chrome */}
        <Route path="/login" element={<SignIn />} />
        <Route path="/register" element={<SignUp />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Full-bleed marketplace pages */}
        <Route
          path="/"
          element={
            <PageLayout fullWidth>
              <HomeRedirect />
            </PageLayout>
          }
        />
        <Route
          path="/browse"
          element={
            <PageLayout fullWidth>
              <Browse />
            </PageLayout>
          }
        />
        <Route
          path="/listings/:id"
          element={
            <PageLayout fullWidth>
              <ListingDetail />
            </PageLayout>
          }
        />

        {/* Protected padded pages */}
        <Route
          path="/dashboard"
          element={
            <PageLayout>
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </PageLayout>
          }
        />
        {/* Sell / Create Listing */}
        <Route
          path="/sell"
          element={
            <PageLayout fullWidth>
              <ProtectedRoute requireVerified={true}>
                <CreateListing />
              </ProtectedRoute>
            </PageLayout>
          }
        />
        <Route
          path="/listings/create"
          element={
            <PageLayout fullWidth>
              <ProtectedRoute requireVerified={true}>
                <CreateListing />
              </ProtectedRoute>
            </PageLayout>
          }
        />

        {/* Edit Listing */}
        <Route
          path="/listings/:id/edit"
          element={
            <PageLayout fullWidth>
              <ProtectedRoute requireVerified={true}>
                <EditListing />
              </ProtectedRoute>
            </PageLayout>
          }
        />

        {/* My Listings */}
        <Route
          path="/my-listings"
          element={
            <PageLayout>
              <ProtectedRoute>
                <MyListings />
              </ProtectedRoute>
            </PageLayout>
          }
        />
        <Route
          path="/messages"
          element={
            <PageLayout>
              <ProtectedRoute>
                <PlaceholderPage
                  title="Student Chat & Meetup Messages"
                  description="Direct peer-to-peer messaging coming soon."
                />
              </ProtectedRoute>
            </PageLayout>
          }
        />

        {/* Public padded pages */}
        <Route path="/design-check" element={<PageLayout><DesignCheck /></PageLayout>} />
        <Route
          path="/categories"
          element={
            <PageLayout>
              <PlaceholderPage title="Campus Categories" description="Browse by academic faculty, exam courses, and hostel equipment." />
            </PageLayout>
          }
        />
        <Route
          path="/wanted"
          element={
            <PageLayout>
              <PlaceholderPage title="Student Wanted Board" description="Peer request board for syllabus books, calculators, and exam materials." />
            </PageLayout>
          }
        />
        <Route
          path="/free"
          element={
            <PageLayout fullWidth>
              <Browse />
            </PageLayout>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/browse" replace />} />
      </Routes>
    </AuthProvider>
  );
}
