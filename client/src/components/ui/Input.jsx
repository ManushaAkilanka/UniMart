import React from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(
  (
    {
      label,
      required = false,
      error,
      helperText,
      leftIcon,
      rightIcon,
      kbdShortcut,
      maxLength,
      value,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const charCount = value !== undefined && typeof value === 'string' ? value.length : null;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {(label || maxLength) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={inputId}
                className="font-headline-sm text-headline-sm text-on-surface select-none"
              >
                {label} {required && <span className="text-error">*</span>}
              </label>
            )}
            {maxLength && charCount !== null && (
              <span
                className={cn(
                  'font-code-sm text-code-sm text-on-surface-variant',
                  charCount > maxLength * 0.9 && 'text-error font-semibold'
                )}
              >
                {charCount} / {maxLength}
              </span>
            )}
          </div>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant pointer-events-none text-xl">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            value={value}
            maxLength={maxLength}
            className={cn(
              'w-full h-11 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant/70 border border-transparent shadow-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all',
              leftIcon ? 'pl-11' : 'px-space-md',
              (rightIcon || kbdShortcut) ? 'pr-14' : 'pr-space-md',
              error && 'border-error focus:ring-error/20 focus:border-error bg-error-container/10',
              className
            )}
            {...props}
          />

          {kbdShortcut && (
            <kbd className="absolute right-3 hidden sm:inline-flex items-center justify-center h-5 px-1.5 rounded bg-surface-container-high text-on-surface-variant font-code-sm text-code-sm pointer-events-none select-none">
              {kbdShortcut}
            </kbd>
          )}

          {rightIcon && !kbdShortcut && (
            <span className="material-symbols-outlined absolute right-3 text-on-surface-variant pointer-events-none text-xl">
              {rightIcon}
            </span>
          )}
        </div>

        {error ? (
          <p className="font-body-sm text-body-sm text-error flex items-center gap-1">
            <span className="material-symbols-outlined text-sm leading-none">error</span>
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
