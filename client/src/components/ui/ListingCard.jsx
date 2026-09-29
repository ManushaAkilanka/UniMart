import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

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

const TYPE_LABELS = {
  sale: 'For Sale',
  free: 'FREE',
  rent: 'Rent',
  exchange: 'Exchange',
  wanted: 'Wanted',
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
    condition,
    campus,
    images,
    sellerId,
    createdAt,
    viewCount,
  } = listing;

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

  return (
    <Link
      to={`/listings/${_id}`}
      className="group flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 overflow-hidden"
    >
      {/* Image */}
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

        {/* Title */}
        <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-2 mb-2 group-hover:text-secondary transition-colors leading-snug">
          {title}
        </h3>

        {/* Price */}
        {listingType === 'free' ? (
          <p className="text-[20px] font-bold text-secondary mb-1 leading-tight">FREE</p>
        ) : listingType === 'wanted' ? (
          <p className="text-[14px] font-semibold text-on-surface-variant mb-1">Wanted</p>
        ) : (
          <p className="text-[17px] font-bold text-on-surface mb-1 leading-tight tabular-nums">
            Rs.&nbsp;{price?.toLocaleString('en-LK')}
            {priceMode === 'negotiable' && (
              <span className="text-[12px] font-normal text-on-surface-variant ml-1">(Neg.)</span>
            )}
          </p>
        )}

        {/* Seller footer */}
        <div className="mt-auto pt-2 flex items-center justify-between border-t border-outline-variant/20">
          <div className="flex items-center gap-1 min-w-0">
            {sellerVerified && (
              <span className="material-symbols-outlined text-secondary text-sm leading-none">
                verified
              </span>
            )}
            <span className="font-label-sm text-[11px] font-semibold text-on-surface truncate">
              {sellerName.split(' ')[0]}
            </span>
          </div>
          <span className="font-label-sm text-[11px] text-on-surface-variant truncate">
            @{sellerDomain || 'ac.lk'}
          </span>
        </div>
      </div>
    </Link>
  );
};
