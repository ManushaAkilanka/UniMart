import React from 'react';
import { cn } from '../../utils/cn';

export const Pagination = ({
  currentPage = 1,
  totalPages = 12,
  totalItems = 148,
  itemsPerPage = 9,
  onPageChange,
  className,
}) => {
  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={cn(
        'w-full bg-surface-container-lowest rounded-xl shadow-level1 p-space-md flex flex-col sm:flex-row items-center justify-between gap-space-md border border-outline-variant/20',
        className
      )}
    >
      {/* Item Counter */}
      <div className="font-body-sm text-body-sm text-on-surface-variant">
        Showing{' '}
        <span className="font-semibold text-on-surface">
          {startItem} - {endItem}
        </span>{' '}
        of <span className="font-semibold text-on-surface">{totalItems}</span> listings
      </div>

      {/* Nav Controls */}
      <nav aria-label="Catalog Pagination" className="flex items-center gap-1.5 select-none">
        {/* Previous */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container text-body-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Numbered buttons */}
        {getPageNumbers().map((page, idx) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="w-8 text-center text-on-surface-variant font-bold text-sm select-none"
              >
                ...
              </span>
            );
          }

          const isActive = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange && onPageChange(page)}
              className={cn(
                'w-9 h-9 rounded-lg font-headline-sm text-headline-sm font-semibold transition-all flex items-center justify-center',
                isActive
                  ? 'bg-secondary text-on-secondary shadow-level1'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface font-medium'
              )}
            >
              {page}
            </button>
          );
        })}

        {/* Next */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container text-body-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <span className="hidden sm:inline">Next</span>
          <span className="material-symbols-outlined text-base leading-none">arrow_forward</span>
        </button>
      </nav>
    </div>
  );
};
