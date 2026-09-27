import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../utils/cn';

import { useAuth } from '../../context/AuthContext';

export const Navbar = ({ onOpenCampusModal }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const navLinks = [
    { label: 'Browse', path: '/browse' },
    { label: 'Categories', path: '/categories' },
    { label: 'Wanted', path: '/wanted' },
    { label: 'Free Items', path: '/free' },
    { label: 'UI System', path: '/design-check' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-level1 border-b border-outline-variant/20">
      <div className="h-20 max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg flex items-center justify-between gap-space-md">
        {/* Brand & Campus Switcher */}
        <div className="flex items-center gap-space-md shrink-0">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.svg" alt="UniMart Brand Logo" className="h-8 w-auto object-contain" />
            <span className="font-headline-md text-headline-md tracking-tight text-on-surface">
              UniMart
            </span>
          </Link>

          <button
            type="button"
            onClick={onOpenCampusModal}
            className="hidden xl:flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-left"
          >
            <span className="material-symbols-outlined text-secondary text-base leading-none">
              location_on
            </span>
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              {user?.campus || 'University of Colombo · Main Campus'}
            </span>
            <span className="font-label-sm text-label-sm text-secondary hover:underline ml-space-xs font-semibold">
              Change
            </span>
          </button>
        </div>

        {/* Global Instant Search */}
        <div className="flex-1 max-w-lg hidden md:block">
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant pointer-events-none text-xl leading-none">
              search
            </span>
            <input
              type="text"
              placeholder="Search textbooks, laptops, calculators, hostel items..."
              className="w-full h-10 pl-11 pr-14 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/70 font-body-md text-body-md shadow-level1 border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
            />
            <kbd className="absolute right-3 hidden lg:inline-flex items-center justify-center h-5 px-1.5 rounded bg-surface-container-high text-on-surface-variant font-code-sm text-code-sm">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="hidden lg:flex items-center gap-space-md xl:gap-space-lg shrink-0">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'font-headline-sm text-headline-sm transition-colors',
                  isActive
                    ? 'text-on-surface font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-space-sm shrink-0">
          <Link to="/sell" className="hidden sm:inline-flex">
            <Button variant="primary" size="md" leftIcon="add">
              Post Listing
            </Button>
          </Link>

          {isAuthenticated ? (
            <>
              {/* Action icon links */}
              <div className="flex items-center gap-1">
                {/* Favorites */}
                <Link
                  to="/saved"
                  aria-label="Saved Favorites"
                  className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-xl leading-none">favorite</span>
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-[10px] font-bold">
                    4
                  </span>
                </Link>

                {/* Messages */}
                <Link
                  to="/messages"
                  aria-label="Messages"
                  className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-xl leading-none">chat_bubble</span>
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error font-label-sm text-[10px] font-bold">
                    2
                  </span>
                </Link>

                {/* Notifications */}
                <button
                  type="button"
                  aria-label="Notifications"
                  className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-xl leading-none">notifications</span>
                </button>
              </div>

              {/* User Profile Avatar linking to Dashboard */}
              <Link to="/dashboard" className="ml-1 shrink-0" aria-label="Student Dashboard">
                <Avatar
                  name={user?.fullName || 'Student'}
                  size="md"
                  isVerified={Boolean(user?.isVerified)}
                  verificationTitle={user?.email ? `@${user.email.split('@')[1]} verified student` : 'Verified student'}
                />
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-2xl leading-none">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-outline-variant/20 bg-surface-container-lowest px-margin py-space-md flex flex-col gap-space-sm shadow-level3">
          <div className="flex items-center gap-space-xs px-space-sm py-2 rounded-lg bg-surface-container text-on-surface font-label-sm">
            <span className="material-symbols-outlined text-secondary text-base">location_on</span>
            <span className="font-semibold">University of Colombo · Main Campus</span>
          </div>

          <div className="flex flex-col gap-1 py-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="px-space-sm py-2 rounded-lg font-headline-sm text-headline-sm hover:bg-surface-container transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <Link to="/sell" onClick={() => setMobileMenuOpen(false)} className="w-full">
            <Button variant="primary" size="md" leftIcon="add" className="w-full">
              Post Listing
            </Button>
          </Link>
        </div>
      )}
    </header>
  );
};
