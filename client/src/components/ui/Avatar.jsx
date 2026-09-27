import React, { useState } from 'react';
import { cn } from '../../utils/cn';

const avatarSizes = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-label-sm',
  lg: 'w-10 h-10 text-body-md',
  xl: 'w-14 h-14 text-headline-md',
};

export const Avatar = ({
  src,
  alt = 'Student Avatar',
  name = 'UniMart Student',
  size = 'md',
  isVerified = false,
  verificationTitle = '@cmb.ac.lk verified',
  className,
}) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <div className={cn('relative inline-flex shrink-0 select-none', className)}>
      {src && !imageError ? (
        <img
          src={src}
          alt={alt}
          onError={() => setImageError(true)}
          className={cn(
            'rounded-full object-cover border border-surface-container-high',
            avatarSizes[size] || avatarSizes.md
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold tracking-tight',
            avatarSizes[size] || avatarSizes.md
          )}
        >
          {getInitials(name)}
        </div>
      )}

      {isVerified && (
        <span
          title={verificationTitle}
          className="material-symbols-outlined absolute -bottom-1 -right-1 text-secondary text-sm bg-surface rounded-full shadow-level1 leading-none select-none"
        >
          verified
        </span>
      )}
    </div>
  );
};
