import React from 'react';
import { cn } from '../../utils/cn';

const badgeVariants = {
  default: 'bg-surface-container-high text-on-surface',
  emerald: 'bg-secondary-container text-on-secondary-container font-semibold',
  subtle: 'bg-brand-emerald-subtle text-secondary font-semibold border border-secondary/20',
  navy: 'bg-brand-navy text-white',
  outline: 'bg-transparent border border-outline-variant/50 text-on-surface',
  success: 'bg-status-success-bg text-status-success font-semibold border border-status-success/20',
  warning: 'bg-status-warning-bg text-status-warning font-semibold border border-status-warning/20',
  info: 'bg-status-info-bg text-status-info font-semibold border border-status-info/20',
  danger: 'bg-status-danger-bg text-status-danger font-semibold border border-status-danger/20',
  free: 'bg-secondary text-on-secondary font-bold uppercase tracking-wider',
};

const badgeSizes = {
  sm: 'text-[11px] px-2 py-0.5 rounded-full',
  md: 'text-label-sm px-2.5 py-1 rounded-full',
  lg: 'text-label-md px-3 py-1.5 rounded-full',
};

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  removable = false,
  onRemove,
  className,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-sans transition-colors',
        badgeVariants[variant] || badgeVariants.default,
        badgeSizes[size] || badgeSizes.md,
        className
      )}
      {...props}
    >
      {icon && <span className="material-symbols-outlined text-xs leading-none">{icon}</span>}
      <span>{children}</span>
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:opacity-75 focus:outline-none ml-0.5 inline-flex items-center"
          aria-label="Remove badge"
        >
          <span className="material-symbols-outlined text-xs leading-none">close</span>
        </button>
      )}
    </span>
  );
};

export const VerifiedStudentBadge = ({
  domain = '@cmb.ac.lk',
  verified = true,
  className,
}) => {
  if (!verified) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-secondary font-label-sm font-semibold select-none',
        className
      )}
      title={`${domain} verified student account`}
    >
      <span className="material-symbols-outlined text-sm leading-none">verified</span>
      <span>{domain} verified</span>
    </span>
  );
};

export const CampusBadge = ({
  campus = 'University of Colombo',
  faculty,
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm font-semibold',
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block"></span>
      <span>{faculty ? `${campus} · ${faculty}` : campus}</span>
    </span>
  );
};

export const ConditionBadge = ({ condition = 'Good', className }) => {
  let variant = 'default';
  const condLower = condition.toLowerCase();

  if (condLower.includes('new') || condLower.includes('like new')) {
    variant = 'emerald';
  } else if (condLower.includes('good') || condLower.includes('very good')) {
    variant = 'subtle';
  } else if (condLower.includes('fair') || condLower.includes('negotiable')) {
    variant = 'warning';
  }

  return (
    <Badge variant={variant} size="sm" className={className}>
      {condition}
    </Badge>
  );
};
