import React, { useState } from 'react';
import { Finding } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { Check, Edit3, X, HelpCircle, FileText, ExternalLink, ShieldAlert, Sparkles } from 'lucide-react';

interface FindingCardProps {
  finding: Finding;
  isSelected?: boolean;
  onSelect?: () => void;
  onAccept: (findingId: number) => Promise<void>;
  onEdit: (findingId: number, customText: string) => Promise<void>;
  onDismiss: (findingId: number, reason: string) => Promise<void>;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  isSelected,
  onSelect,
  onAccept,
  onEdit,
  onDismiss
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(finding.suggestion);
  const [isDismissing, setIsDismissing] = useState(false);
  const [dismissalReason, setDismissalReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onAccept(finding.id);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editedText.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onEdit(finding.id, editedText);
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissSubmit = async () => {
    if (dismissalReason.trim().length < 5) {
      setErrorMsg('A valid written reason (minimum 5 characters) is required to dismiss.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onDismiss(finding.id, dismissalReason.trim());
      setIsDismissing(false);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isResolved = finding.author_action !== 'pending';

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-4 transition-all cursor-pointer ${
        isSelected
          ? 'ring-2 ring-indigo-500 border-indigo-500 bg-white shadow-md'
          : isResolved
          ? 'bg-slate-50/80 border-slate-200 opacity-75'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
      }`}
    >
      {/* Card Header: Category, ID, Severity */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase">{finding.finding_id}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 capitalize">
            {finding.category.replace('_', ' ')}
          </span>
          <SeverityBadge severity={finding.severity} />
        </div>

        {/* Confidence Basis Badge */}
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>Confidence: {finding.confidence_level.replace('_', '-')}</span>
        </div>
      </div>

      {/* Flagged Text Section */}
      <div className="my-2 p-2.5 rounded-lg bg-rose-50/60 border border-rose-200/80">
        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-0.5">Flagged Content</span>
        <span className="font-mono text-sm font-semibold text-rose-950">"{finding.flagged_text}"</span>
      </div>

      {/* Plain Language Explanation */}
      <p className="text-sm text-slate-700 mb-3 leading-relaxed">
        {finding.reason}
      </p>

      {/* Evidence & Grounding Panel */}
      <div className="mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>Rule: {finding.rule_id}</span>
        </div>
        <p className="text-slate-600 italic pl-5">{finding.rule_description}</p>

        {finding.evidence_source ? (
          <div className="flex items-center gap-1.5 text-emerald-800 font-medium pl-5 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Evidence Source: {finding.evidence_source}</span>
            {finding.evidence_passage_id && (
              <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] px-1.5 py-0.5 rounded ml-1">
                {finding.evidence_passage_id}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-800 font-medium bg-amber-50 p-1.5 rounded mt-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Unverified — no approved source found in brand registry.</span>
          </div>
        )}
      </div>

      {/* Suggested Correction Box */}
      <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200/80 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Suggested Correction (Editable)</span>
          {!isResolved && !isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="text-xs text-teal-700 hover:text-teal-900 font-medium flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2 mt-2">
            <input
              type="text"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full text-xs font-mono p-2 rounded border border-teal-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(false);
                }}
                className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveEdit();
                }}
                disabled={isSubmitting}
                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded shadow-xs"
              >
                Apply Edit
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs font-mono text-teal-950 font-medium">{finding.suggestion}</p>
        )}
      </div>

      {/* Action Status & Buttons */}
      {isResolved ? (
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
          <span className="font-medium text-slate-500">
            Status: <span className="capitalize font-semibold text-slate-800">{finding.author_action}</span>
          </span>
          {finding.dismissal_reason && (
            <span className="text-slate-500 italic max-w-xs truncate" title={finding.dismissal_reason}>
              Reason: "{finding.dismissal_reason}"
            </span>
          )}
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAccept();
              }}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <Check className="w-3.5 h-3.5" /> Accept Fix
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissing(true);
              }}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
            >
              <X className="w-3.5 h-3.5 text-slate-500" /> Dismiss...
            </button>
          </div>
        </div>
      )}

      {/* Dismissal Reason Modal / Slide-down */}
      {isDismissing && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 p-3 rounded-lg bg-slate-100 border border-slate-300 text-xs space-y-2 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">Mandatory Dismissal Reason</span>
            <button onClick={() => setIsDismissing(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-slate-600">
            Brand governance requires a written explanation before a finding can be bypassed.
          </p>
          <textarea
            value={dismissalReason}
            onChange={(e) => setDismissalReason(e.target.value)}
            placeholder="e.g. Legal clearance obtained from PR director; factual claim verified on audited slide 14..."
            className="w-full text-xs p-2 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsDismissing(false)}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleDismissSubmit}
              disabled={isSubmitting || dismissalReason.trim().length < 5}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded disabled:opacity-50"
            >
              Confirm Dismissal
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-rose-600 font-medium mt-2">{errorMsg}</p>
      )}
    </div>
  );
};
