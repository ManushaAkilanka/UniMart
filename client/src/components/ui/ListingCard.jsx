import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useFavorites } from '../../context/FavoritesContext';
import { useAuth } from '../../context/AuthContext';

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

export const ListingCard = ({ listing, skeleton = false }) => {
  if (skeleton) {
    return (
      <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden animate-pulse">
        <div className="w-full aspect-[4/3] bg-surface-container-high" />
        <div className="p-4 flex flex-col gap-2">
          <div className="h-3 w-2/3 bg-surface-container-high rounded" />
          <div className="h-4 w-full bg-surface-container-high rounded" />
          <div className="h-4 w-4/5 bg-surface-container-high rounded" />
          <div className="h-5 w-1/3 bg-surface-container-high rounded mt-1" />
          <div className="flex items-center justify-between mt-auto pt-2">
            <div className="h-3 w-1/3 bg-surface-container-high rounded" />
            <div className="h-3 w-1/4 bg-surface-container-high rounded" />
          </div>
        </div>
      </div>
    );
  }

  const {
    _id,
    title,
    price,
    priceMode,
    listingType,
    budgetMin,
    budgetMax,
    urgency,
    condition,
    campus,
    images,
    sellerId,
    createdAt,
    viewCount,
  } = listing;

  const { isAuthenticated, user } = useAuth();
  const { isFavorited, toggle } = useFavorites();
  const navigate = useNavigate();

  const [toggling, setToggling] = useState(false);
  const saved = isFavorited(_id);

  const isWanted = listingType === 'wanted';

  // Don't show heart on own listings
  const isOwn = user && sellerId && user._id === (sellerId._id ?? sellerId).toString();
  const showHeart = isAuthenticated && !isOwn;

  const handleHeartClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (toggling) return;
    setToggling(true);
    try { await toggle(_id); } catch { /**/ }
    finally { setToggling(false); }
  };

  const imageUrl = images?.[0]?.url;
  const sellerName = sellerId?.fullName || 'Student';
  const sellerVerified = sellerId?.isVerified;
  const sellerDomain = sellerId?.email?.split('@')[1] || '';

  const timeAgo = (() => {
    if (!createdAt) return '';
    const diff = (Date.now() - new Date(createdAt)) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  })();

  const targetBudget = budgetMax || (price && price > 0 ? price : null);

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 overflow-hidden',
        isWanted
          ? 'bg-surface-container-lowest border-amber-300/80 hover:border-amber-500'
          : 'bg-surface-container-lowest border-outline-variant/20'
      )}
    >
      {/* Heart toggle */}
      <button
        onClick={handleHeartClick}
        className={cn(
          'absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all shadow-level1',
          showHeart
            ? saved
              ? 'bg-error text-on-error opacity-100'
              : 'bg-surface/80 backdrop-blur-sm text-on-surface-variant opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:text-error'
            : 'hidden'
        )}
        aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
      >
        <span
          className={cn(
            'material-symbols-outlined text-xl leading-none',
            toggling && 'animate-pulse'
          )}
        >
          {saved ? 'favorite' : 'favorite_border'}
        </span>
      </button>

      <Link
        to={`/listings/${_id}`}
        className="flex flex-col flex-1"
      >
        {/* Header Visual */}
        {isWanted ? (
          <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-amber-50 via-amber-100/60 to-orange-50 flex flex-col items-center justify-center p-4 text-center border-b border-amber-200/50">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-amber-200/90 text-amber-800 flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">campaign</span>
                </div>
                <span className="font-headline-sm text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Campus Wanted Request
                </span>
                <span className="font-body-sm text-[11px] text-amber-800/80 mt-0.5 line-clamp-1">
                  Peer looking to acquire
                </span>
              </>
            )}

            {/* Wanted Badge */}
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-600 text-white shadow-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">campaign</span>
              WANTED
            </span>

            {/* Urgency Badge */}
            {urgency && (
              <span
                className={cn(
                  'absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm',
                  urgency === 'urgent'
                    ? 'bg-error text-on-error'
                    : urgency === 'this-week'
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-emerald-100 text-emerald-800'
                )}
              >
                {urgency === 'urgent' ? '⚡ Urgent' : urgency === 'this-week' ? '📅 This Week' : '🌱 Flexible'}
              </span>
            )}
          </div>
        ) : (
          <div className="relative w-full aspect-[4/3] bg-surface-container overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl">image</span>
              </div>
            )}

            {/* Condition Badge */}
            {condition && (
              <span
                className={cn(
                  'absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide backdrop-blur-sm',
                  CONDITION_STYLES[condition] || 'bg-surface-container-highest text-on-surface'
                )}
              >
                {CONDITION_LABELS[condition] || condition}
              </span>
            )}

            {/* Free badge */}
            {listingType === 'free' && (
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-bold bg-secondary text-on-secondary backdrop-blur-sm">
                FREE
              </span>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-4 flex flex-col flex-1">
          {/* Location + time */}
          <div className="flex items-center gap-1 text-secondary font-label-sm text-[11px] font-semibold mb-1 truncate">
            <span className="material-symbols-outlined text-xs">location_on</span>
            <span className="truncate">
              {campus || 'Campus'}
              {timeAgo ? ` · ${timeAgo}` : ''}
            </span>
          </div>

          {/* Wanted "Looking for" Framing */}
          {isWanted && (
            <span className="font-label-sm text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">search</span>
              Looking for:
            </span>
          )}

          {/* Title */}
          <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-2 mb-2 group-hover:text-secondary transition-colors leading-snug">
            {title}
          </h3>

          {/* Price / Budget Framing (No sale price tag for wanted listings) */}
          {isWanted ? (
            <div className="mt-auto mb-2 pt-1 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-headline-sm text-xs font-semibold">
                <span className="material-symbols-outlined text-xs text-amber-700">payments</span>
                {targetBudget
                  ? `Budget: Up to Rs. ${targetBudget.toLocaleString('en-LK')}`
                  : 'Budget: Open to Offers'}
              </span>
              <span className="text-secondary font-headline-sm text-xs font-semibold hover:underline flex items-center gap-0.5">
                <span>Offer</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>
          ) : listingType === 'free' ? (
            <p className="text-[20px] font-bold text-secondary mb-1 leading-tight">FREE</p>
          ) : (
            <p className="text-[17px] font-bold text-on-surface mb-1 leading-tight tabular-nums">
              Rs.&nbsp;{price?.toLocaleString('en-LK')}
              {priceMode === 'negotiable' && (
                <span className="text-[12px] font-normal text-on-surface-variant ml-1">(Neg.)</span>
              )}
            </p>
          )}

          {/* Seller / Requester footer */}
          <div className="mt-auto pt-2 flex items-center justify-between border-t border-outline-variant/20">
            <div className="flex items-center gap-1 min-w-0">
              {sellerVerified && (
                <span className="material-symbols-outlined text-secondary text-sm leading-none">
                  verified
                </span>
              )}
              <span className="font-label-sm text-[11px] font-semibold text-on-surface truncate">
                {isWanted ? 'Requested by ' : ''}{sellerName.split(' ')[0]}
              </span>
            </div>
            <span className="font-label-sm text-[11px] text-on-surface-variant truncate">
              @{sellerDomain || 'ac.lk'}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
};
