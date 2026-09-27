import React from 'react';
import { cn } from '../../utils/cn';

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse rounded bg-surface-container-high', className)}
      {...props}
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-level1 border border-outline-variant/20 overflow-hidden">
      <Skeleton className="w-full aspect-[4/3] rounded-none" />
      <div className="p-space-md flex flex-col gap-space-xs">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <div className="pt-space-xs flex items-center justify-between border-t border-outline-variant/15 mt-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
};
