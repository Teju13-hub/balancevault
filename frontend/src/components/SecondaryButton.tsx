import React from 'react';

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  children,
  size = 'md',
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm font-medium rounded-xl gap-2',
    lg: 'px-5 py-3 text-base font-medium rounded-xl gap-2.5',
  };

  return (
    <button
      className={`inline-flex items-center justify-center bg-white hover:bg-pastel-lavender/40 text-primary-text border border-app-border hover:border-secondary-lilac transition-all duration-200 outline-none select-none shadow-subtle active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="shrink-0 text-secondary-text">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="shrink-0 text-secondary-text">{icon}</span>}
    </button>
  );
};
