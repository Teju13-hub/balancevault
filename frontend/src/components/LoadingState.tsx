import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  variant?: 'skeleton' | 'spinner' | 'fullscreen';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Securing ledger state...',
  variant = 'spinner',
}) => {
  if (variant === 'skeleton') {
    return (
      <div className="space-y-4 animate-pulse w-full">
        <div className="h-8 bg-pastel-lavender/40 rounded-xl w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-white border border-app-border rounded-2xl" />
          <div className="h-28 bg-white border border-app-border rounded-2xl" />
          <div className="h-28 bg-white border border-app-border rounded-2xl" />
        </div>
        <div className="h-64 bg-white border border-app-border rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-2xl bg-pastel-lavender/60 border border-secondary-lilac flex items-center justify-center text-deep-purple animate-pulse">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-deep-purple border-t-transparent animate-spin" />
      </div>
      <p className="text-xs font-semibold text-deep-purple uppercase tracking-wider">{message}</p>
      <p className="text-[11px] text-secondary-text mt-1">Verifying cryptographic integrity</p>
    </div>
  );
};
