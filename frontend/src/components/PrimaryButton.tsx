import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'purple' | 'sage' | 'accent' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  variant = 'solid',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm font-semibold rounded-xl gap-2',
    lg: 'px-6 py-3.5 text-base font-semibold rounded-xl gap-2.5',
  };

  const variantClasses = {
    solid: 'bg-deep-purple hover:bg-deep-purple-hover text-white shadow-sm hover:shadow active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2',
    purple: 'bg-accent-purple hover:bg-deep-purple text-white shadow-sm hover:shadow focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2',
    sage: 'bg-accent-purple hover:bg-deep-purple text-white shadow-sm hover:shadow focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2',
    accent: 'bg-accent-purple hover:bg-deep-purple text-white shadow-sm hover:shadow focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2',
    outline: 'border-2 border-deep-purple text-deep-purple hover:bg-pastel-lavender/50 focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2',
    danger: 'bg-app-error hover:bg-red-700 text-white shadow-sm focus-visible:ring-2 focus-visible:ring-app-error focus-visible:ring-offset-2',
  };

  return (
    <button
      className={`inline-flex items-center justify-center transition-all duration-200 outline-none select-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
