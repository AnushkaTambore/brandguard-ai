import React from 'react';
import { ContentStatus } from '../types';

interface StatusBadgeProps {
  status: ContentStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  switch (status) {
    case 'draft':
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses}`}>
          Draft
        </span>
      );
    case 'in_review':
      return (
        <span className={`inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          AI Reviewing
        </span>
      );
    case 'needs_changes':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-300 ${sizeClasses}`}>
          Needs Changes
        </span>
      );
    case 'pending_human_review':
      return (
        <span className={`inline-flex items-center rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses}`}>
          Pending Human Review
        </span>
      );
    case 'approved':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 ${sizeClasses}`}>
          ✓ Approved
        </span>
      );
    case 'rejected':
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-300 ${sizeClasses}`}>
          ✕ Rejected
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-600 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};
