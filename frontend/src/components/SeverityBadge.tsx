import React from 'react';
import { Severity } from '../types';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface SeverityBadgeProps {
  severity: Severity | string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const sev = severity.toLowerCase();
  if (sev === 'high') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        <AlertCircle className="w-3 h-3 text-rose-600" />
        High Severity
      </span>
    );
  }
  if (sev === 'medium') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <AlertTriangle className="w-3 h-3 text-amber-600" />
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
      <Info className="w-3 h-3 text-sky-600" />
      Low
    </span>
  );
};
