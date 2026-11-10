import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';

export type StatusVariant =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'SUCCESS'
  | 'PENDING'
  | 'PENDING_REVIEW'
  | 'PENDING_VERIFICATION'
  | 'FLAGGED'
  | 'RESTRICTED'
  | 'FAILED'
  | 'CANCELLED'
  | 'FROZEN'
  | 'DOCUMENTS_REQUESTED'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

interface StatusBadgeProps {
  status: StatusVariant | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const normalized = status.toUpperCase();

  const getBadgeConfig = () => {
    switch (normalized) {
      case 'ACTIVE':
      case 'COMPLETED':
      case 'SUCCESS':
      case 'VERIFIED':
      case 'APPROVED':
      case 'LOW':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-app-success" />,
          classes: 'bg-pastel-lavender/70 text-app-success border-secondary-lilac',
          label: normalized === 'LOW' ? 'Low Risk' : normalized,
        };
      case 'PENDING':
      case 'PENDING_REVIEW':
      case 'PENDING_VERIFICATION':
      case 'DOCUMENTS_REQUESTED':
      case 'MEDIUM':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-app-warning" />,
          classes: 'bg-amber-50 text-app-warning border-amber-200',
          label: normalized.replace(/_/g, ' '),
        };
      case 'FLAGGED':
      case 'HIGH':
      case 'RESTRICTED':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          classes: 'bg-orange-50 text-amber-700 border-orange-200',
          label: normalized === 'HIGH' ? 'High Risk' : normalized,
        };
      case 'FAILED':
      case 'CANCELLED':
      case 'FROZEN':
      case 'REJECTED':
        return {
          icon: <XCircle className="w-3.5 h-3.5 text-app-error" />,
          classes: 'bg-red-50 text-app-error border-red-200',
          label: normalized,
        };
      default:
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-secondary-text" />,
          classes: 'bg-gray-100 text-secondary-text border-gray-200',
          label: normalized,
        };
    }
  };

  const config = getBadgeConfig();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border capitalize select-none ${sizeClasses} ${config.classes} ${className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
