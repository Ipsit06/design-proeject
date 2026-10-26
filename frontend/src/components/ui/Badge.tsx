import React from 'react';
import type { GestureStatus, HistorySource } from '@signbridge/shared';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  const variantClasses = {
    default: 'bg-sage text-forest font-medium border border-forest/10',
    success: 'bg-status-successBg text-status-success font-medium border border-status-success/20',
    warning: 'bg-status-warningBg text-status-warning font-medium border border-status-warning/20',
    error: 'bg-status-errorBg text-status-error font-medium border border-status-error/20',
    info: 'bg-blue-50 text-blue-700 font-medium border border-blue-200',
    neutral: 'bg-page text-ink-secondary font-medium border border-line',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export function GestureStatusBadge({ status }: { status: GestureStatus }) {
  switch (status) {
    case 'implemented_tested':
      return <Badge variant="success">Tested & Verified</Badge>;
    case 'model_available_unverified':
      return <Badge variant="warning">Model Available (Unverified)</Badge>;
    case 'planned':
      return <Badge variant="neutral">Planned (Roadmap)</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function SourceBadge({ source }: { source: HistorySource }) {
  if (source === 'live') {
    return <Badge variant="success">Live Camera</Badge>;
  }
  return <Badge variant="warning">Demo Simulated</Badge>;
}
