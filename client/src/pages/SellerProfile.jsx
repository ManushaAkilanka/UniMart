import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSellerProfile, getSellerListings } from '../utils/api';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

const CONDITION_LABELS = {
  new: 'Brand New',
  'like-new': 'Like New',
  'used-good': 'Used · Good',
  'used-fair': 'Used · Fair',
};

const CONDITION_STYLES = {
  new: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  'like-new': 'bg-blue-50 text-blue-700 border border-blue-200/60',
  'used-good': 'bg-amber-50 text-amber-700 border border-amber-200/60',
  'used-fair': 'bg-orange-50 text-orange-700 border border-orange-200/60',
};

const timeAgo = (date) => {
  if (!date) return '';
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const joinDate = (date) => {
  if (!date) return 'Unknown';
  return new Date(date).toLocaleDateString('en-LK', { year: 'numeric', month: 'long' });
};

// ── Listing card for seller profile ─────────────────────────────────────────
const SellerListingCard = ({ listing }) => {
  const { isAuthenticated } = useAuth();
  const { isFavorited, toggle } = useFavorites();
  const saved = isFavorited(listing._id);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    setToggling(true);
    try { await toggle(listing._id); } catch { /**/ }
    finally { setToggling(false); }
  };

  return (
    <div className="group relative flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 overflow-hidden">
      {/* Heart */}
      {isAuthenticated && (
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={cn(
            'absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all shadow-level1',
            saved
              ? 'bg-error text-on-error'
              : 'bg-surface/80 backdrop-blur-sm text-on-surface-variant hover:bg-error/10 hover:text-error'
          )}
          aria-label={saved ? 'Remove from favorites' : 'Save listing'}
        >
          <span className={cn('material-symbols-outlined text-xl leading-none', toggling && 'animate-pulse')}>
            {saved ? 'favorite' : 'favorite_border'}
          </span>
        </button>
      )}

      <Link to={`/listings/${listing._id}`} className="flex flex-col flex-1">
        <div className="relative w-full aspect-[4/3] bg-surface-container overflow-hidden">
          {listing.images?.[0]?.url ? (
            <img
              src={listing.images[0].url}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl">image</span>
            </div>
          )}
          {listing.condition && (
            <span
              className={cn(
                'absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide backdrop-blur-sm',
                CONDITION_STYLES[listing.condition] || 'bg-surface-container-highest text-on-surface'
              )}
            >
              {CONDITION_LABELS[listing.condition] || listing.condition}
            </span>
          )}
          {listing.listingType === 'free' && (
            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-bold bg-secondary text-on-secondary">
              FREE
            </span>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center gap-1 text-secondary font-label-sm text-[11px] font-semibold mb-1 truncate">
            <span className="material-symbols-outlined text-xs">location_on</span>
            <span className="truncate">{listing.campus || 'Campus'}{` · ${timeAgo(listing.createdAt)}`}</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-2 mb-2 group-hover:text-secondary transition-colors leading-snug">
            {listing.title}
          </h3>
          {listing.listingType === 'free' ? (
            <p className="text-[20px] font-bold text-secondary mb-1 leading-tight">FREE</p>
          ) : listing.listingType === 'wanted' ? (
            <p className="text-[14px] font-semibold text-on-surface-variant mb-1">Wanted</p>
          ) : (
            <p className="text-[17px] font-bold text-on-surface mb-1 leading-tight tabular-nums">
              Rs.&nbsp;{listing.price?.toLocaleString('en-LK')}
              {listing.priceMode === 'negotiable' && (
                <span className="text-[12px] font-normal text-on-surface-variant ml-1">(Neg.)</span>
              )}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
};

// ── Seller Profile Page ──────────────────────────────────────────────────────
export const SellerProfile = () => {
  const { id } = useParams();
  const { user: authUser } = useAuth();

  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [loadingListings, setLoadingListings] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const isOwnProfile = authUser?._id === id;

  useEffect(() => {
    let cancelled = false;
    setLoadingSeller(true);
    setError(null);

    getSellerProfile(id)
      .then((res) => {
        if (!cancelled) {
          setSeller(res.data?.seller);
          setLoadingSeller(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.status === 404 ? 'Seller not found.' : err.message || 'Failed to load profile.');
          setLoadingSeller(false);
        }
      });

    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoadingListings(true);

    getSellerListings(id, { page, limit: 12 })
      .then((res) => {
        if (!cancelled) {
          setListings(res.data?.listings ?? []);
          setPagination(res.data?.pagination ?? { total: 0, page: 1, totalPages: 1 });
          setLoadingListings(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingListings(false);
      });

    return () => { cancelled = true; };
  }, [id, page]);

  if (loadingSeller) {
    return (
      <div className="min-h-screen bg-surface pt-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-secondary/30 border-t-secondary animate-spin" />
          <p className="font-body-md text-on-surface-variant">Loading seller profile…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface pt-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-error-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-error-container text-3xl">person_off</span>
          </div>
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">{error}</h2>
            <p className="font-body-md text-on-surface-variant">
              This seller may have been removed or their account is unavailable.
            </p>
          </div>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-on-secondary font-headline-sm hover:bg-secondary/90 transition-colors"
          >
            Browse Listings
          </Link>
        </div>
      </div>
    );
  }

  const initials = seller?.fullName
    ? seller.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="min-h-screen bg-surface pt-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-10">

        {/* Seller header card */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-level1 overflow-hidden mb-8">
          <div className="relative bg-gradient-to-br from-secondary/20 via-secondary/10 to-surface-container h-28">
            <div className="absolute -bottom-10 left-8">
              {seller?.avatarUrl ? (
                <img
                  src={seller.avatarUrl}
                  alt={seller.fullName}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-surface-container-lowest shadow-level2"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center text-2xl font-bold border-4 border-surface-container-lowest shadow-level2">
                  {initials}
                </div>
              )}
              {seller?.isVerified && (
                <span
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-secondary flex items-center justify-center shadow-level1"
                  title="Verified university student"
                >
                  <span className="material-symbols-outlined text-on-secondary text-sm leading-none">verified</span>
                </span>
              )}
            </div>

            {isOwnProfile && (
              <Link
                to="/profile"
                className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-surface/80 backdrop-blur-sm text-on-surface font-headline-sm text-headline-sm hover:bg-surface transition-colors shadow-level1"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Edit Profile
              </Link>
            )}
          </div>

          <div className="px-8 pt-14 pb-8">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-headline-xl text-headline-xl text-on-surface">
                    {seller?.fullName || 'Unknown Seller'}
                  </h1>
                  {seller?.isVerified && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary/10 text-secondary border border-secondary/20">
                      Verified Student
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-on-surface-variant font-body-md">
                  {seller?.faculty && (
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">school</span>
                      {seller.faculty}
                    </span>
                  )}
                  {seller?.campus && (
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {seller.campus}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">calendar_month</span>
                    Member since {joinDate(seller?.createdAt)}
                  </span>
                </div>
              </div>

              {/* Stats chip */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-secondary/10 border border-secondary/20">
                  <span className="font-headline-xl text-headline-xl text-secondary font-bold">
                    {pagination.total}
                  </span>
                  <span className="font-label-sm text-[11px] text-secondary/80">
                    Active Listing{pagination.total !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              Active Listings
            </h2>
            {pagination.total > 0 && (
              <span className="font-body-sm text-on-surface-variant">
                {pagination.total} item{pagination.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loadingListings ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden animate-pulse">
                  <div className="w-full aspect-[4/3] bg-surface-container-high" />
                  <div className="p-4 flex flex-col gap-2">
                    <div className="h-3 w-2/3 bg-surface-container-high rounded" />
                    <div className="h-4 w-full bg-surface-container-high rounded" />
                    <div className="h-5 w-1/3 bg-surface-container-high rounded mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
              <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant">inventory_2</span>
              </div>
              <div className="max-w-sm">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-1">No active listings</h3>
                <p className="font-body-md text-on-surface-variant">
                  {isOwnProfile
                    ? "You don't have any active listings. Post something to start selling!"
                    : 'This seller has no active listings at the moment.'}
                </p>
              </div>
              {isOwnProfile && (
                <Link
                  to="/sell"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-on-secondary font-headline-sm hover:bg-secondary/90 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  Post Listing
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-4">
                {listings.map((listing) => (
                  <SellerListingCard key={listing._id} listing={listing} />
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-10">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <span className="font-body-md text-body-md text-on-surface-variant">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="p-2 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
