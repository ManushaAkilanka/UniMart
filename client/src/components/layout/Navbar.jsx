import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useUnreadCount } from '../../context/useUnreadCount';
import { useNotifications } from '../../context/useNotifications';

// ── Relative timestamp helper ────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Notification type icon map ───────────────────────────────────────────────
const TYPE_ICON = {
  message: 'chat_bubble',
  favorite: 'favorite',
  listing_sold: 'sell',
  report_resolved: 'verified_user',
  claim: 'redeem',
};
const TYPE_COLOR = {
  message: 'text-secondary',
  favorite: 'text-error',
  listing_sold: 'text-warning',
  report_resolved: 'text-secondary',
  claim: 'text-secondary',
};

// ── NotificationDropdown ─────────────────────────────────────────────────────
const NotificationDropdown = ({ notifications, unreadCount, onMarkOne, onMarkAll, onClose }) => {
  const navigate = useNavigate();

  const handleClick = (n) => {
    if (!n.isRead) onMarkOne(n._id);
    if (n.linkTo) {
      navigate(n.linkTo);
      onClose();
    }
  };

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-xl shadow-level3 border border-outline-variant/20 overflow-hidden z-50"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-error text-on-error font-label-sm text-[10px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAll}
            className="font-label-sm text-label-sm text-secondary hover:text-secondary/70 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto divide-y divide-outline-variant/10">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl opacity-40">notifications_none</span>
            <span className="font-body-sm text-body-sm">All caught up!</span>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n._id}
              onClick={() => handleClick(n)}
              className={cn(
                'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-container group',
                !n.isRead && 'bg-secondary-container/20'
              )}
            >
              {/* Icon */}
              <span
                className={cn(
                  'material-symbols-outlined text-xl shrink-0 mt-0.5',
                  TYPE_COLOR[n.type] || 'text-on-surface-variant'
                )}
              >
                {TYPE_ICON[n.type] || 'notifications'}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-label-md text-label-md text-on-surface truncate',
                  !n.isRead && 'font-semibold'
                )}>
                  {n.title}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">
                  {n.body}
                </p>
                <p className="font-code-sm text-code-sm text-on-surface-variant/60 mt-1">
                  {timeAgo(n.createdAt)}
                </p>
              </div>

              {/* Unread dot */}
              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0 mt-1.5" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-outline-variant/20 px-4 py-2">
          <Link
            to="/notifications"
            onClick={onClose}
            className="block text-center font-label-sm text-label-sm text-secondary hover:text-secondary/70 transition-colors py-1"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
};

// ── Navbar ───────────────────────────────────────────────────────────────────
export const Navbar = ({ onOpenCampusModal }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const { user, isAuthenticated } = useAuth();
  const { count: favCount } = useFavorites();
  const unreadCount = useUnreadCount();
  const { notifications, unreadCount: notifUnread, markOneRead, markAllRead } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const closeNotif = useCallback(() => setNotifOpen(false), []);

  const navLinks = [
    { label: 'Browse', path: '/browse' },
    { label: 'Categories', path: '/categories' },
    { label: 'Wanted', path: '/wanted' },
    { label: 'Free Items', path: '/free' },
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
                  {favCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error font-label-sm text-[10px] font-bold">
                      {favCount > 99 ? '99+' : favCount}
                    </span>
                  )}
                </Link>

                {/* Messages */}
                <Link
                  to="/messages"
                  aria-label="Messages"
                  className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-xl leading-none">chat_bubble</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error font-label-sm text-[10px] font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    id="notifications-bell"
                    aria-label="Notifications"
                    aria-expanded={notifOpen}
                    onClick={() => setNotifOpen((o) => !o)}
                    className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl leading-none">
                      {notifUnread > 0 ? 'notifications_active' : 'notifications'}
                    </span>
                    {notifUnread > 0 && (
                      <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error font-label-sm text-[10px] font-bold">
                        {notifUnread > 99 ? '99+' : notifUnread}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <NotificationDropdown
                      notifications={notifications}
                      unreadCount={notifUnread}
                      onMarkOne={markOneRead}
                      onMarkAll={markAllRead}
                      onClose={closeNotif}
                    />
                  )}
                </div>

                {/* Moderation Console (moderator / admin only) */}
                {(user?.role === 'moderator' || user?.role === 'admin') && (
                  <Link
                    to="/moderation"
                    aria-label="Moderation Console"
                    title="Moderation Console"
                    className="p-2 rounded-lg text-secondary hover:bg-secondary-container/30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl leading-none">admin_panel_settings</span>
                  </Link>
                )}
              </div>

              {/* User Profile Avatar */}
              <Link to="/profile" className="ml-1 shrink-0" aria-label="My Profile">
                <Avatar
                  name={user?.fullName || 'Student'}
                  size="md"
                  isVerified={Boolean(user?.isVerified)}
                  verificationTitle={user?.email ? `@${user.email.split('@')[1]} verified student` : 'Verified student'}
                />
              </Link>
            </>
          ) : (
            // ── Unauthenticated: Sign In + Register ─────────────────────────────
            // Before: Register used variant="secondary" → dark brand-navy pill, illegible
            // After:  Register uses variant="outline" with secondary text colour — readable
            //         on the light navbar, clearly distinct from "Sign In" (which uses
            //         outline too but without the colour override so it reads as the primary
            //         CTA via its left-to-right order). A subtle border-secondary ring makes
            //         it visually pop without going dark.
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-secondary/40 text-secondary hover:bg-secondary/8 hover:border-secondary"
                >
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

            {isAuthenticated ? (
              <>
                <Link
                  to="/saved"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-space-sm py-2 rounded-lg font-headline-sm text-headline-sm hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl text-error">favorite</span>
                    <span>Saved Items</span>
                  </div>
                  {favCount > 0 && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-error text-on-error font-label-sm text-[11px] font-bold">
                      {favCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-space-sm py-2 rounded-lg font-headline-sm text-headline-sm hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-xl text-secondary">person</span>
                  <span>My Profile</span>
                </Link>
                {(user?.role === 'moderator' || user?.role === 'admin') && (
                  <Link
                    to="/moderation"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-space-sm py-2 rounded-lg font-headline-sm text-headline-sm text-secondary hover:bg-secondary-container/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                    <span>Moderation Console</span>
                  </Link>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/20">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-secondary/40 text-secondary hover:bg-secondary/8 hover:border-secondary"
                  >
                    Register
                  </Button>
                </Link>
              </div>
            )}
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
