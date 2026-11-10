import React from 'react';

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  variant?: 'white' | 'mint' | 'lavender' | 'outline';
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  subtitle,
  action,
  icon,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  variant = 'white',
}) => {
  const variantClasses = {
    white: 'bg-white border-app-border shadow-subtle',
    mint: 'bg-primary-lavender/40 border-soft-lavender shadow-subtle',
    lavender: 'bg-primary-lavender/40 border-soft-lavender shadow-subtle',
    outline: 'bg-transparent border-dashed border-app-border',
  };

  return (
    <div className={`rounded-2xl border transition-all duration-200 ${variantClasses[variant]} ${className}`}>
      {(title || subtitle || action || icon) && (
        <div className={`px-6 pt-5 pb-4 flex items-center justify-between border-b border-app-border/70 ${headerClassName}`}>
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-pastel-lavender border border-secondary-lilac/70 flex items-center justify-center text-deep-purple shrink-0 shadow-sm">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="font-semibold text-primary-text text-base tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-secondary-text mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};
