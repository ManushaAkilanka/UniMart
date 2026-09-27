import React from 'react';
import { cn } from '../../utils/cn';

export const Checkbox = React.forwardRef(
  (
    {
      label,
      description,
      badge,
      icon,
      checked,
      onChange,
      disabled = false,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'flex items-start justify-between cursor-pointer gap-2 select-none group',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <div className="flex items-start gap-2 min-w-0">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="mt-1 w-4 h-4 accent-secondary rounded cursor-pointer transition-all shrink-0"
            {...props}
          />
          <div className="flex flex-col">
            {label && (
              <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1 group-hover:text-secondary transition-colors">
                {icon && (
                  <span className="material-symbols-outlined text-secondary text-base leading-none">
                    {icon}
                  </span>
                )}
                <span>{label}</span>
              </span>
            )}
            {description && (
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {description}
              </span>
            )}
          </div>
        </div>
        {badge !== undefined && (
          <span className="font-code-sm text-code-sm text-on-surface-variant opacity-70 shrink-0">
            {badge}
          </span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
