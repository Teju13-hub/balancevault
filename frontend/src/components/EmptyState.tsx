import React from 'react';
import { FileQuestion } from 'lucide-react';
import { PrimaryButton } from './PrimaryButton';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-10 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-app-border bg-light-bg/40 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-pastel-mint/70 border border-soft-sage flex items-center justify-center text-deep-sage mb-4 shadow-subtle">
        {icon || <FileQuestion className="w-7 h-7" />}
      </div>
      <h4 className="text-base font-bold text-primary-text mb-1">{title}</h4>
      <p className="text-xs text-secondary-text max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <PrimaryButton size="sm" onClick={onAction}>
          {actionLabel}
        </PrimaryButton>
      )}
    </div>
  );
};

