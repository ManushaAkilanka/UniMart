import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { Avatar } from './Avatar';
import { ConditionBadge } from './Badge';

export const Card = ({ children, className, hover = false, ...props }) => {
  return (
    <div
      className={cn(
        'bg-surface-container-lowest rounded-xl shadow-level1 border border-outline-variant/20 transition-all duration-200',
        hover && 'hover:shadow-level2 hover:-translate-y-0.5 hover:border-outline-variant/40',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const ListingCard = ({
  id,
  title,
  price,
  isNegotiable = false,
  isFree = false,
  condition = 'Good',
  location = 'Main Campus',
  timeAgo = 'Just now',
  imageUrl,
  seller = {
    name: 'Colombo Student',
    avatar: null,
    isVerified: true,
    emailDomain: '@cmb.ac.lk',
  },
  onFavoriteToggle,
  isFavorited = false,
  onClick,
  className,
}) => {
  const [favorite, setFavorite] = useState(isFavorited);

  const handleFav = (e) => {
    e.stopPropagation();
    const next = !favorite;
    setFavorite(next);
    if (onFavoriteToggle) onFavoriteToggle(next);
  };

  const formattedPrice = isFree
    ? 'Free (Rs. 0)'
    : typeof price === 'number'
      ? `Rs. ${price.toLocaleString()}`
      : price;

  return (
    <div
      onClick={onClick}
      data-listing-id={id}
      className={cn(
        'group flex flex-col bg-surface-container-lowest rounded-xl shadow-level1 hover:shadow-level2 hover:-translate-y-0.5 border border-outline-variant/20 transition-all duration-200 overflow-hidden cursor-pointer',
        className
      )}
    >
      {/* 4:3 Aspect Ratio Image Container */}
      <div className="relative w-full aspect-[4/3] bg-surface-container overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-low">
            <span className="material-symbols-outlined text-4xl mb-1 opacity-50">image</span>
            <span className="font-label-sm text-label-sm opacity-70">No image uploaded</span>
          </div>
        )}

        {/* Condition / Tag Badge */}
        <div className="absolute top-2.5 left-2.5">
          <ConditionBadge condition={condition} />
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          onClick={handleFav}
          aria-label={favorite ? 'Remove from favorites' : 'Save to favorites'}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm shadow-level1 flex items-center justify-center text-on-surface-variant hover:text-error hover:scale-110 active:scale-95 transition-all"
        >
          <span
            className={cn(
              'material-symbols-outlined text-lg leading-none transition-colors',
              favorite && 'text-error'
            )}
            style={{ fontVariationSettings: favorite ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
        </button>
      </div>

      {/* Card Content Bay */}
      <div className="p-space-md flex flex-col flex-1 justify-between gap-space-xs">
        <div>
          {/* Location & Time Stamp */}
          <div className="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm mb-space-2xs">
            <span className="material-symbols-outlined text-xs leading-none">location_on</span>
            <span className="truncate">{location}</span>
            <span className="text-on-surface-variant opacity-60">· {timeAgo}</span>
          </div>

          {/* Title */}
          <h3 className="font-headline-md text-headline-md text-on-surface line-clamp-2 group-hover:text-secondary transition-colors mb-space-xs">
            {title}
          </h3>
        </div>

        {/* Price & Seller Info */}
        <div className="pt-space-xs border-t border-outline-variant/15 flex items-center justify-between gap-2 mt-auto">
          <div className="flex flex-col">
            <span className="font-price-md text-price-md text-on-surface tabular-nums">
              {formattedPrice}
            </span>
            {isNegotiable && !isFree && (
              <span className="font-body-sm text-[11px] text-on-surface-variant">Negotiable</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded-full shrink-0">
            <Avatar
              src={seller.avatar}
              name={seller.name}
              size="sm"
              isVerified={false}
            />
            <span className="font-label-sm text-label-sm text-on-surface font-medium truncate max-w-[80px]">
              {seller.name}
            </span>
            {seller.isVerified && (
              <span
                className="material-symbols-outlined text-secondary text-sm leading-none"
                title={`${seller.emailDomain || '@cmb.ac.lk'} verified`}
              >
                verified
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
