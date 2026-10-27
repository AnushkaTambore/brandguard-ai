import React, { useState, useEffect } from 'react';
import { ContentItem, ApprovalDecision } from '../types';
import { api, getDemoRole } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { CommentsThread } from '../components/CommentsThread';
import {
  CheckCircle, XCircle, AlertTriangle, MessageSquare, Clock,
  ShieldCheck, FileText, ArrowRight, ShieldAlert, Check
} from 'lucide-react';

interface ReviewQueueViewProps {
  onOpenItemWorkspace: (contentId: number) => void;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({ onOpenItemWorkspace }) => {
  const [queueItems, setQueueItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Decision Modal State
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | 'changes_requested' | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const currentRole = getDemoRole();
  const isReviewer = currentRole === 'reviewer' || currentRole === 'admin';

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const items = await api.getContentItems();
      setQueueItems(items);
      if (items.length > 0 && !selectedItem) {
        // Default to first pending item if any, else first item
        const pending = items.find((i: ContentItem) => i.status === 'pending_human_review') || items[0];
        setSelectedItem(pending);
        loadItemDetails(pending.id);
      }
    } catch (err: any) {
      setActionMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadItemDetails = async (id: number) => {
    try {
      const it = await api.getContentItem(id);
      setSelectedItem(it);
      const comms = await api.getComments(id);
      setComments(comms);
    } catch (err: any) {
      setActionMsg({ text: err.message, type: 'error' });
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleOpenDecisionModal = (type: 'approved' | 'rejected' | 'changes_requested') => {
    if (!isReviewer) {
      setActionMsg({
        text: `Permission Denied: Human approval actions require Reviewer role (Current: ${currentRole.toUpperCase()}). Please switch to Reviewer in the top navbar.`,
        type: 'error'
      });
      return;
    }
    setDecisionType(type);
    setDecisionReason('');
    setOverrideReason('');
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !decisionType) return;

    setIsSubmittingDecision(true);
    setActionMsg(null);
    try {
      await api.makeDecision(selectedItem.id, {
        decision: decisionType,
        reason: decisionReason.trim(),
        override_reason: overrideReason.trim() || undefined
      });

      setActionMsg({
        text: `Human decision recorded: Item marked as '${decisionType.replace('_', ' ')}'.`,
        type: 'success'
      });

      setDecisionType(null);
      await fetchQueue();
      await loadItemDetails(selectedItem.id);
    } catch (err: any) {
      setActionMsg({ text: err.message, type: 'error' });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const pendingCount = queueItems.filter(i => i.status === 'pending_human_review').length;
  const highSeverityOpen = selectedItem?.latest_revision?.findings.filter(f => f.severity === 'high' && f.author_action === 'pending') || [];

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Human Governance Review Queue</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              {pendingCount} Awaiting Review
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Human reviewer portal: inspect evidence, add review guidance, and approve or request changes. AI cannot approve.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Logged in as:</span>
          <span className="font-bold text-slate-900 capitalize px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
            {currentRole}
          </span>
        </div>
      </div>

      {/* Notification Toast */}
      {actionMsg && (
        <div className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
          actionMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="font-bold underline ml-2">Dismiss</button>
        </div>
      )}

      {/* Main Grid: Queue List (Left 4 cols), Detail Inspection (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Col: Queue items list */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
            Submissions ({queueItems.length})
          </h3>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {queueItems.map(item => {
              const isSelected = selectedItem?.id === item.id;
              const isPending = item.status === 'pending_human_review';
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item);
                    loadItemDetails(item.id);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                      : isPending
                      ? 'border-purple-200 bg-purple-50/20 hover:border-purple-300'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-semibold text-xs text-slate-900 line-clamp-1">{item.title}</span>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="capitalize">{item.content_type.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>Rev {item.revisions_count}</span>
                    {item.high_severity_findings_count > 0 && (
                      <span className="text-rose-600 font-bold ml-auto flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> {item.high_severity_findings_count}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Inspection and Decision Panel */}
        {selectedItem && (
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            
            {/* Top Info */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{selectedItem.title}</h2>
                  <StatusBadge status={selectedItem.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Author: {selectedItem.created_by}</span>
                  <span>•</span>
                  <span>Revision: {selectedItem.latest_revision?.revision_no}</span>
                  <span>•</span>
                  <span>Audience: {selectedItem.audience}</span>
                </div>
              </div>

              <button
                onClick={() => onOpenItemWorkspace(selectedItem.id)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                Open in Full Review Workspace <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content Text Display */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Submission Copy (Revision {selectedItem.latest_revision?.revision_no})
              </span>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                {selectedItem.latest_revision?.text}
              </div>
            </div>

            {/* Findings Summary Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Findings & Rule Evidence ({selectedItem.latest_revision?.findings.length || 0})
              </span>

              {selectedItem.latest_revision?.findings.length === 0 ? (
                <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  ✓ Clean submission: No guideline or claims violations detected.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedItem.latest_revision?.findings.map(f => (
                    <div key={f.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-600">{f.finding_id}</span>
                          <span className="font-bold text-slate-800">"{f.flagged_text}"</span>
                          <SeverityBadge severity={f.severity} />
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          f.author_action === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                          f.author_action === 'dismissed' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          Action: {f.author_action}
                        </span>
                      </div>
                      <p className="text-slate-600">{f.reason}</p>
                      {f.evidence_source ? (
                        <p className="text-[11px] text-emerald-700 font-medium">Source: {f.evidence_source}</p>
                      ) : (
                        <p className="text-[11px] text-amber-700 font-medium">Unverified — no approved source found.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* High-severity override warning banner if unresolved high findings exist */}
            {highSeverityOpen.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-800 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>High-Severity Warning: {highSeverityOpen.length} High-Severity Finding(s) Unresolved</span>
                </div>
                <p>
                  System rules strictly block silent approval. You must either request changes from the author, or explicitly provide a written override reason justifying the exception.
                </p>
              </div>
            )}

            {/* Human Decision Buttons */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-600">Reviewer Actions:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenDecisionModal('changes_requested')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                >
                  Request Changes
                </button>
                <button
                  onClick={() => handleOpenDecisionModal('rejected')}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                >
                  Reject Content
                </button>
                <button
                  onClick={() => handleOpenDecisionModal('approved')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Approve Content
                </button>
              </div>
            </div>

            {/* Comments Thread */}
            <div className="pt-4 border-t border-slate-200">
              <CommentsThread
                comments={comments}
                onAddComment={async (body, parentId) => {
                  await api.postComment(selectedItem.id, { body, parent_id: parentId });
                  const updatedComms = await api.getComments(selectedItem.id);
                  setComments(updatedComms);
                }}
              />
            </div>

          </div>
        )}

      </div>

      {/* HUMAN DECISION MODAL */}
      {decisionType && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 capitalize">
              Confirm Human Review Decision: {decisionType.replace('_', ' ')}
            </h3>

            <form onSubmit={handleDecisionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reviewer Reason / Decision Rationale (Mandatory)
                </label>
                <textarea
                  required
                  rows={3}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="State the governance justification for this decision (e.g. Meets Brand Guidelines v2.1, Claims Register verified)..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              {/* Explicit Override Input if Approving with open high severity findings */}
              {decisionType === 'approved' && highSeverityOpen.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Mandatory High-Severity Override Justification</span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    This content has unresolved high-severity findings ({highSeverityOpen.map(f => f.rule_id).join(', ')}). A formal audit explanation (minimum 10 characters) is required to approve.
                  </p>
                  <textarea
                    required
                    rows={2}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Explain why this high-severity finding is being overridden for this release..."
                    className="w-full text-xs p-2 rounded border border-rose-300 bg-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionType(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDecision || decisionReason.trim().length < 5}
                  className={`px-4 py-2 text-white font-bold text-xs rounded-lg shadow-md ${
                    decisionType === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    decisionType === 'rejected' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'
                  }`}
                >
                  Record Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
