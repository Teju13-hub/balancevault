import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  timeframe?: string;
  icon: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  timeframe = 'vs last month',
  icon,
  subtitle,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-2xl p-6 border border-app-border shadow-subtle hover:shadow-card transition-all duration-200 ${className}`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-secondary-text">{title}</span>
        <div className="w-10 h-10 rounded-xl bg-pastel-mint/60 border border-soft-sage/40 flex items-center justify-center text-deep-sage shrink-0">
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl lg:text-3xl font-bold tracking-tight text-primary-text">{value}</div>
        {subtitle && <p className="text-xs text-secondary-text mt-1">{subtitle}</p>}
      </div>

      {change && (
        <div className="mt-4 pt-3 border-t border-app-border/60 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-semibold ${
              trend === 'up'
                ? 'bg-pastel-mint text-app-success'
                : trend === 'down'
                ? 'bg-red-50 text-app-error'
                : 'bg-gray-100 text-secondary-text'
            }`}
          >
            {trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
            {trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
            {change}
          </span>
          <span className="text-secondary-text">{timeframe}</span>
        </div>
      )}
    </div>
  );
};

