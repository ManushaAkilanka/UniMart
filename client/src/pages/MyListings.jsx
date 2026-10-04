import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getMyListings, updateListingStatus, deleteListing, releaseClaim } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

const STATUS_TABS = [
  { key: 'all', label: 'All Listings' },
  { key: 'active', label: 'Active on Campus' },
  { key: 'pending', label: 'Pending Approval' },
  { key: 'sold', label: 'Sold / Fulfilled' },
  { key: 'claimed', label: 'Claimed (Free)' },
];

export const MyListings = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [successBanner, setSuccessBanner] = useState(location.state?.message || null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Status updating state map: { [id]: boolean }
  const [statusUpdating, setStatusUpdating] = useState({});
  // Release-claim state map: { [id]: boolean }
  const [releaseUpdating, setReleaseUpdating] = useState({});

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyListings({ limit: 50 });
      setListings(res.data?.listings || []);
    } catch (err) {
      setError(err.message || 'Failed to load your listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Clear success banner after 5 seconds
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  // Handle Mark Sold / Fulfilled / Reactivate
  const handleToggleStatus = async (item) => {
    const isWanted = item.listingType === 'wanted';
    let newStatus;
    if (item.status === 'sold' || item.status === 'fulfilled') {
      newStatus = 'active';
    } else {
      newStatus = isWanted ? 'fulfilled' : 'sold';
    }

    try {
      setStatusUpdating((prev) => ({ ...prev, [item._id]: true }));
      await updateListingStatus(item._id, newStatus);
      setListings((prev) =>
        prev.map((l) => (l._id === item._id ? { ...l, status: newStatus } : l))
      );
      setSuccessBanner(
        newStatus === 'sold'
          ? `"${item.title.substring(0, 30)}..." marked as sold!`
          : newStatus === 'fulfilled'
          ? `"${item.title.substring(0, 30)}..." marked as fulfilled!`
          : `"${item.title.substring(0, 30)}..." reactivated on campus!`
      );
    } catch (err) {
      setError(err.message || 'Failed to update listing status.');
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [item._id]: false }));
    }
  };

  // Handle Delete
  const confirmDelete = async () => {
    if (!listingToDelete) return;
    try {
      setActionLoading(true);
      await deleteListing(listingToDelete._id);
      setListings((prev) => prev.filter((l) => l._id !== listingToDelete._id));
      setDeleteModalOpen(false);
      setListingToDelete(null);
      setSuccessBanner('Listing was deleted successfully.');
    } catch (err) {
      setError(err.message || 'Failed to delete listing.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Release Claim (owner releases a claimed free item)
  const handleReleaseClaim = async (item) => {
    try {
      setReleaseUpdating((prev) => ({ ...prev, [item._id]: true }));
      await releaseClaim(item._id);
      setListings((prev) =>
        prev.map((l) => (l._id === item._id ? { ...l, status: 'active', claimedBy: null } : l))
      );
      setSuccessBanner(`"${item.title.substring(0, 30)}..." claim released — back on campus!`);
    } catch (err) {
      setError(err.message || 'Failed to release claim.');
    } finally {
      setReleaseUpdating((prev) => ({ ...prev, [item._id]: false }));
    }
  };

  // Filter listings by tab
  const filteredListings = listings.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return item.status === 'active';
    if (activeTab === 'pending') return item.status === 'pending';
    if (activeTab === 'sold') return item.status === 'sold' || item.status === 'fulfilled';
    if (activeTab === 'claimed') return item.status === 'claimed';
    return true;
  });

  // Calculate statistics
  const activeCount = listings.filter((l) => l.status === 'active').length;
  const pendingCount = listings.filter((l) => l.status === 'pending').length;
  const soldCount = listings.filter((l) => l.status === 'sold' || l.status === 'fulfilled').length;
  const claimedCount = listings.filter((l) => l.status === 'claimed').length;
  const totalViews = listings.reduce((sum, l) => sum + (l.viewCount || 0), 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg py-space-xl">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md mb-space-xl">
        <div>
          <nav
            aria-label="Breadcrumbs"
            className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant mb-1"
          >
            <Link to="/" className="hover:text-on-surface transition-colors">
              Home
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-on-surface font-semibold">My Listings</span>
          </nav>
          <h1 className="font-display-hero text-display-hero text-on-surface tracking-tight">
            Manage My Listings
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Track views, mark items sold, or edit listings posted under{' '}
            <strong className="text-on-surface font-semibold">@{user?.email?.split('@')[1]}</strong>.
          </p>
        </div>

        <Link to="/sell" className="shrink-0">
          <Button variant="primary" size="md" leftIcon="add">
            Post New Listing
          </Button>
        </Link>
      </div>

      {/* ── Notification Banners ────────────────────────────────────────── */}
      {successBanner && (
        <div className="mb-space-lg p-space-md rounded-xl bg-secondary-container/30 border border-secondary text-on-surface flex items-center justify-between gap-space-md animate-fadeIn">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-xl">check_circle</span>
            <span className="font-headline-sm text-headline-sm font-semibold">{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {error && (
        <div className="mb-space-lg p-space-md rounded-xl bg-error-container text-on-error-container border border-error/30 flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-error text-xl">error_outline</span>
            <span className="font-body-md text-body-md">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-on-error-container hover:opacity-75"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* ── Stats Metric Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex items-center gap-space-sm">
          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-on-surface shrink-0">
            <span className="material-symbols-outlined text-2xl">inventory_2</span>
          </div>
          <div>
            <p className="font-display-hero text-headline-xl text-on-surface leading-tight font-bold">
              {listings.length}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Total Created</p>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex items-center gap-space-sm">
          <div className="w-12 h-12 rounded-xl bg-secondary-container/30 flex items-center justify-center text-secondary shrink-0">
            <span className="material-symbols-outlined text-2xl">storefront</span>
          </div>
          <div>
            <p className="font-display-hero text-headline-xl text-secondary leading-tight font-bold">
              {activeCount}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Active on Campus</p>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex items-center gap-space-sm">
          <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shrink-0">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <div>
            <p className="font-display-hero text-headline-xl text-on-surface leading-tight font-bold">
              {soldCount}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Marked Sold</p>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex items-center gap-space-sm">
          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-secondary shrink-0">
            <span className="material-symbols-outlined text-2xl">visibility</span>
          </div>
          <div>
            <p className="font-display-hero text-headline-xl text-on-surface leading-tight font-bold">
              {totalViews}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Student Views</p>
          </div>
        </div>
      </div>

      {/* ── Status Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-space-xs border-b border-outline-variant/20 mb-space-lg overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const isSelected = activeTab === tab.key;
          let count = listings.length;
          if (tab.key === 'active') count = activeCount;
          if (tab.key === 'pending') count = pendingCount;
          if (tab.key === 'sold') count = soldCount;
          if (tab.key === 'claimed') count = claimedCount;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-space-md py-2.5 rounded-lg font-headline-sm text-headline-sm transition-all flex items-center gap-2 whitespace-nowrap',
                isSelected
                  ? 'bg-secondary text-on-secondary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-bold',
                  isSelected
                    ? 'bg-on-secondary/20 text-on-secondary'
                    : 'bg-surface-container text-on-surface-variant'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Listings Container ──────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-space-md animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-space-md flex gap-space-md"
            >
              <div className="w-32 h-full bg-surface-container rounded-lg shrink-0" />
              <div className="flex-1 flex flex-col justify-between py-1">
                <div className="h-5 w-2/3 bg-surface-container rounded" />
                <div className="h-4 w-1/3 bg-surface-container rounded" />
                <div className="h-4 w-1/4 bg-surface-container rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="py-space-3xl flex flex-col items-center justify-center text-center gap-space-md bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-space-2xl">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl">inventory</span>
          </div>
          <div className="max-w-md">
            <h3 className="font-headline-xl text-headline-xl text-on-surface">No Listings Found</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              {activeTab === 'all'
                ? "You haven't posted any campus listings yet. Start selling or giving away gear to fellow students!"
                : `You don't have any items in the "${activeTab}" tab.`}
            </p>
          </div>
          <Link to="/sell" className="mt-2">
            <Button variant="primary" size="md" leftIcon="add">
              Post Your First Listing
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-space-md">
          {filteredListings.map((item) => {
            const isUpdating = statusUpdating[item._id];
            const coverImage = item.images?.[0]?.url;

            return (
              <div
                key={item._id}
                className={cn(
                  'bg-surface-container-lowest rounded-xl border p-space-md sm:p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md',
                  item.status === 'sold' || item.status === 'fulfilled'
                    ? 'border-outline-variant/20 opacity-80 bg-surface-container-low/40'
                    : 'border-outline-variant/30'
                )}
              >
                {/* Left: Thumbnail & Info */}
                <div className="flex items-start gap-space-md flex-1 min-w-0">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-surface-container shrink-0 border border-outline-variant/20">
                    {coverImage ? (
                      <img src={coverImage} alt={item.title} className="w-full h-full object-cover" />
                    ) : item.listingType === 'wanted' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-amber-500/10 text-amber-600">
                        <span className="material-symbols-outlined text-2xl">campaign</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-2xl">photo_camera</span>
                      </div>
                    )}

                    {/* Status Pill */}
                    <span
                      className={cn(
                        'absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                        item.status === 'active'
                          ? 'bg-secondary text-on-secondary'
                          : item.status === 'sold'
                          ? 'bg-primary-container text-on-primary'
                          : item.status === 'fulfilled'
                          ? 'bg-amber-600 text-white'
                          : item.status === 'claimed'
                          ? 'bg-violet-600 text-white'
                          : 'bg-amber-500 text-white'
                      )}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {item.listingType === 'wanted' && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 font-label-sm text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          WANTED
                        </span>
                      )}
                      {item.listingType === 'free' && (
                        <span className="px-2 py-0.5 rounded bg-secondary/10 font-label-sm text-[11px] font-bold text-secondary">
                          FREE
                        </span>
                      )}
                      {item.status === 'claimed' && (
                        <span className="px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/40 font-label-sm text-[11px] font-bold text-violet-700 dark:text-violet-300">
                          CLAIMED
                        </span>
                      )}
                      {item.condition && (
                        <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm text-[11px] font-semibold text-secondary">
                          {item.condition}
                        </span>
                      )}
                      <span className="font-label-sm text-[11px] text-on-surface-variant">
                        {item.campus}
                      </span>
                    </div>

                    <Link
                      to={`/listings/${item._id}`}
                      className="font-headline-sm text-headline-sm sm:text-headline-md text-on-surface font-semibold hover:text-secondary transition-colors line-clamp-1"
                    >
                      {item.title}
                    </Link>

                    {/* Price */}
                    <div className="mt-1 flex items-baseline gap-2">
                      {item.listingType === 'free' ? (
                        <span className="font-headline-md text-headline-md text-secondary font-bold">
                          FREE
                        </span>
                      ) : item.listingType === 'wanted' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-headline-sm text-headline-sm text-amber-600 font-semibold">
                            Wanted Request
                          </span>
                          <span className="text-xs text-on-surface-variant font-medium">
                            {item.budgetMax
                              ? `Budget: Up to Rs. ${item.budgetMax.toLocaleString('en-LK')}`
                              : 'Budget: Open to Offers'}
                          </span>
                        </div>
                      ) : (
                        <span className="font-headline-md text-headline-md text-on-surface font-bold">
                          Rs. {item.price?.toLocaleString('en-LK')}
                          {item.priceMode === 'negotiable' && (
                            <span className="text-xs font-normal text-secondary ml-1 font-semibold">
                              (Negotiable)
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Meta views + date */}
                    <div className="flex items-center gap-space-md text-on-surface-variant font-body-sm text-xs mt-2">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <span>{item.viewCount || 0} views</span>
                      </span>
                      <span>•</span>
                      <span>
                        Posted on{' '}
                        {new Date(item.createdAt).toLocaleDateString('en-LK', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-space-xs w-full sm:w-auto justify-end border-t sm:border-t-0 border-outline-variant/20 pt-space-xs sm:pt-0">
                  {/* Claimed free listing: show Release Claim instead of Mark Sold */}
                  {item.status === 'claimed' && item.listingType === 'free' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={releaseUpdating[item._id]}
                      onClick={() => handleReleaseClaim(item)}
                      leftIcon="lock_open"
                    >
                      Release Claim
                    </Button>
                  ) : (() => {
                    const isFulfilled = item.status === 'fulfilled';
                    const isSold = item.status === 'sold';
                    const isDone = isSold || isFulfilled;
                    const isWanted = item.listingType === 'wanted';
                    const label = isDone
                      ? 'Reactivate'
                      : isWanted
                      ? 'Mark Fulfilled'
                      : 'Mark Sold';

                    return (
                      <Button
                        variant={isDone ? 'secondary' : 'outline'}
                        size="sm"
                        loading={isUpdating}
                        onClick={() => handleToggleStatus(item)}
                        leftIcon={isDone ? 'replay' : 'check'}
                      >
                        {label}
                      </Button>
                    );
                  })()}

                  {/* Edit */}
                  <Link to={`/listings/${item._id}/edit`}>
                    <Button variant="outline" size="sm" leftIcon="edit">
                      Edit
                    </Button>
                  </Link>

                  {/* View public */}
                  <Link to={`/listings/${item._id}`}>
                    <Button variant="ghost" size="sm" leftIcon="visibility">
                      View
                    </Button>
                  </Link>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => {
                      setListingToDelete(item);
                      setDeleteModalOpen(true);
                    }}
                    className="p-2 rounded-lg text-error hover:bg-error-container transition-colors"
                    title="Delete listing"
                  >
                    <span className="material-symbols-outlined text-lg leading-none">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Confirmation Modal for Delete ────────────────────────────────── */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Listing"
        subtitle="This action cannot be undone. Photos will be deleted from campus servers."
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={confirmDelete}
              loading={actionLoading}
              leftIcon="delete"
            >
              Confirm Delete
            </Button>
          </>
        }
      >
        <p className="font-body-md text-body-md text-on-surface py-2">
          Are you sure you want to permanently delete{' '}
          <strong className="font-semibold">"{listingToDelete?.title}"</strong>?
        </p>
      </Modal>
    </div>
  );
};
