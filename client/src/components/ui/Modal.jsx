import React, { useEffect } from 'react';
import { cn } from '../../utils/cn';

export const Modal = ({
  isOpen = false,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-lg',
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop Scrim */}
      <div
        className="fixed inset-0 bg-brand-navy/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-surface-container-lowest rounded-2xl shadow-level4 border border-outline-variant/30 flex flex-col max-h-[90vh] overflow-hidden z-10 animate-in zoom-in-95 duration-200',
          maxWidth,
          className
        )}
      >
        {/* Header */}
        <div className="px-space-lg py-space-md border-b border-outline-variant/20 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-xl leading-none">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="px-space-lg py-space-md overflow-y-auto font-body-md text-body-md text-on-surface">
          {children}
        </div>

        {/* Footer Actions */}
        {footer && (
          <div className="px-space-lg py-space-sm bg-surface-container-low/50 border-t border-outline-variant/20 flex items-center justify-end gap-space-xs">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
