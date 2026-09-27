import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  primary:
    'bg-secondary text-on-secondary hover:bg-secondary/90 active:scale-[0.99] shadow-level1 focus-visible:ring-2 focus-visible:ring-secondary/40',
  secondary:
    'bg-brand-navy text-white hover:bg-brand-navy-light active:scale-[0.99] shadow-level1 focus-visible:ring-2 focus-visible:ring-brand-navy/40',
  outline:
    'bg-surface-container-lowest border border-outline-variant/40 text-on-surface hover:bg-surface-container-low hover:border-outline-variant active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-secondary/20',
  ghost:
    'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface active:scale-[0.99]',
  danger:
    'bg-error text-on-error hover:bg-error/90 active:scale-[0.99] shadow-level1 focus-visible:ring-2 focus-visible:ring-error/30',
  surface:
    'bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors',
};

const sizes = {
  sm: 'h-8 px-space-sm text-label-md rounded-md gap-1',
  md: 'h-10 px-space-md text-headline-sm rounded-lg gap-1.5',
  lg: 'h-12 px-space-lg text-headline-md rounded-lg gap-2',
};

export const Button = React.forwardRef(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all select-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variants[variant] || variants.primary,
          sizes[size] || sizes.md,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="material-symbols-outlined text-base animate-spin">
            progress_activity
          </span>
        ) : (
          leftIcon && <span className="material-symbols-outlined text-base leading-none">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="material-symbols-outlined text-base leading-none">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
