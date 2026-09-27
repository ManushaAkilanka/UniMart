import React from 'react';
import { cn } from '../../utils/cn';

export const Select = React.forwardRef(
  (
    {
      label,
      required = false,
      error,
      helperText,
      options = [],
      children,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="font-headline-sm text-headline-sm text-on-surface select-none"
          >
            {label} {required && <span className="text-error">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full h-11 pl-space-md pr-10 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md appearance-none border border-transparent shadow-sm cursor-pointer focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all',
              error && 'border-error focus:ring-error/20 focus:border-error bg-error-container/10',
              className
            )}
            {...props}
          >
            {children ? (
              children
            ) : (
              options.map((opt) => {
                const optValue = typeof opt === 'object' ? opt.value : opt;
                const optLabel = typeof opt === 'object' ? opt.label : opt;
                return (
                  <option key={optValue} value={optValue}>
                    {optLabel}
                  </option>
                );
              })
            )}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-xl leading-none">
            expand_more
          </span>
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

Select.displayName = 'Select';
