import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFavorites } from '../utils/api';
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

const FavoriteCard = ({ item, onRemove }) => {
  const { listing } = item;
  const { toggle, isFavorited } = useFavorites();
  const [removing, setRemoving] = useState(false);
  const saved = isFavorited(listing._id);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(true);
    try {
      await toggle(listing._id);
      if (onRemove) onRemove(listing._id);
    } catch {
      /* noop */
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="group relative flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 overflow-hidden">
      {/* Heart button — top right */}
      <button
        onClick={handleToggle}
        disabled={removing}
        className={cn(
          'absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all shadow-level1',
          saved
            ? 'bg-error text-on-error'
            : 'bg-surface/80 backdrop-blur-sm text-on-surface-variant hover:bg-error/10 hover:text-error'
        )}
        aria-label={saved ? 'Remove from favorites' : 'Add to favorites'}
      >
        <span className={cn('material-symbols-outlined text-xl leading-none', removing && 'animate-pulse')}>
          {saved ? 'favorite' : 'favorite_border'}
        </span>
      </button>

      <Link to={`/listings/${listing._id}`} className="flex flex-col flex-1">
        {/* Image */}
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

        {/* Body */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center gap-1 text-secondary font-label-sm text-[11px] font-semibold mb-1 truncate">
            <span className="material-symbols-outlined text-xs">location_on</span>
            <span className="truncate">
              {listing.campus || 'Campus'}
              {item.savedAt ? ` · Saved ${timeAgo(item.savedAt)}` : ''}
            </span>
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

          <div className="mt-auto pt-2 flex items-center gap-1 border-t border-outline-variant/20">
            {listing.sellerId?.isVerified && (
              <span className="material-symbols-outlined text-secondary text-sm leading-none">verified</span>
            )}
            <span className="font-label-sm text-[11px] font-semibold text-on-surface truncate">
              {listing.sellerId?.fullName?.split(' ')[0] || 'Student'}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden animate-pulse">
    <div className="w-full aspect-[4/3] bg-surface-container-high" />
    <div className="p-4 flex flex-col gap-2">
      <div className="h-3 w-2/3 bg-surface-container-high rounded" />
      <div className="h-4 w-full bg-surface-container-high rounded" />
      <div className="h-4 w-4/5 bg-surface-container-high rounded" />
      <div className="h-5 w-1/3 bg-surface-container-high rounded mt-1" />
    </div>
  </div>
);

export const Favorites = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getFavorites({ page, limit: 20 })
      .then((res) => {
        if (!cancelled) {
          setFavorites(res.data?.favorites ?? []);
          setPagination(res.data?.pagination ?? { total: 0, page: 1, totalPages: 1 });
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load favorites.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, page]);

  const handleRemove = (listingId) => {
    setFavorites((prev) => prev.filter((f) => f.listing._id !== listingId));
    setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-surface pt-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-error text-xl">favorite</span>
            </div>
            <div>
              <h1 className="font-headline-xl text-headline-xl text-on-surface">Saved Listings</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {loading
                  ? 'Loading…'
                  : `${pagination.total} item${pagination.total !== 1 ? 's' : ''} saved`}
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-error-container text-on-error-container mb-6">
            <span className="material-symbols-outlined">error</span>
            <p className="font-body-md">{error}</p>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant">favorite_border</span>
            </div>
            <div className="max-w-sm">
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">No saved listings yet</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Tap the heart on any listing to save it here for quick access.
              </p>
            </div>
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-colors shadow-level1"
            >
              <span className="material-symbols-outlined text-base">explore</span>
              Browse Listings
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {favorites.map((item) => (
                <FavoriteCard key={item.favoriteId} item={item} onRemove={handleRemove} />
              ))}
            </div>

            {/* Pagination */}
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
  );
};
