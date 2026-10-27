import React, { useState, useEffect } from 'react';
import { ContentItem, ContentRevision, Finding, ContentType, Comment as CommentType } from '../types';
import { api, getDemoRole } from '../api/client';
import { TextHighlighter } from '../components/TextHighlighter';
import { FindingCard } from '../components/FindingCard';
import { StatusBadge } from '../components/StatusBadge';
import { CommentsThread } from '../components/CommentsThread';
import {
  Sparkles, RefreshCw, Save, Send, AlertTriangle, CheckCircle,
  FileText, ArrowLeft, Filter, MessageSquare, History, Edit
} from 'lucide-react';

interface ReviewContentViewProps {
  initialContentId?: number;
  onNavigateToHistory: (contentId: number) => void;
  onNavigateToQueue: () => void;
}

export const ReviewContentView: React.FC<ReviewContentViewProps> = ({
  initialContentId,
  onNavigateToHistory,
  onNavigateToQueue
}) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(initialContentId || null);
  const [currentItem, setCurrentItem] = useState<ContentItem | null>(null);
  const [activeRevision, setActiveRevision] = useState<ContentRevision | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<number | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // New Content Submission Form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ContentType>('social_post');
  const [newAudience, setNewAudience] = useState('General Public & Online Shoppers');
  const [newText, setNewText] = useState('');
  const [newNotes, setNewNotes] = useState('First draft');

  // Manual text editing & saving revision state
  const [isManualEditing, setIsManualEditing] = useState(false);
  const [manualEditText, setManualEditText] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showSaveRevisionModal, setShowSaveRevisionModal] = useState(false);

  // Comments state
  const [comments, setComments] = useState<CommentType[]>([]);
  const [showComments, setShowComments] = useState(false);

  // Operation loading & notifications
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmittingWorkflow, setIsSubmittingWorkflow] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const currentRole = getDemoRole();

  // Load items
  const loadItems = async () => {
    try {
      const data = await api.getContentItems();
      setItems(data);
      if (!selectedItemId && data.length > 0) {
        setSelectedItemId(data[0].id);
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // When initialContentId changes from parent
  useEffect(() => {
    if (initialContentId) {
      setSelectedItemId(initialContentId);
    }
  }, [initialContentId]);

  // Load selected content item details
  const loadCurrentItemDetails = async (id: number) => {
    try {
      const item = await api.getContentItem(id);
      setCurrentItem(item);
      if (item.latest_revision) {
        setActiveRevision(item.latest_revision);
        setFindings(item.latest_revision.findings || []);
        setManualEditText(item.latest_revision.text);
      }
      // Load comments
      const comms = await api.getComments(id);
      setComments(comms);
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    }
  };

  useEffect(() => {
    if (selectedItemId) {
      loadCurrentItemDetails(selectedItemId);
    }
  }, [selectedItemId]);

  // Run governance review
  const handleRunReview = async () => {
    if (!currentItem) return;
    setIsReviewing(true);
    setFeedbackMsg(null);
    try {
      const updated = await api.reviewContent(currentItem.id);
      setCurrentItem(updated);
      if (updated.latest_revision) {
        setActiveRevision(updated.latest_revision);
        setFindings(updated.latest_revision.findings || []);
      }
      setFeedbackMsg({
        text: `Review complete: ${updated.latest_revision?.findings.length || 0} findings generated and verified against approved brand kit.`,
        type: 'success'
      });
      loadItems();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    } finally {
      setIsReviewing(false);
    }
  };

  // Accept a finding suggestion
  const handleAcceptFinding = async (findingId: number) => {
    try {
      await api.actOnFinding(findingId, { action: 'accept' });
      // Refresh current item to pull updated text & finding status
      if (selectedItemId) {
        await loadCurrentItemDetails(selectedItemId);
      }
      setFeedbackMsg({ text: 'Suggestion accepted and applied to content text.', type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    }
  };

  // Edit and apply a finding suggestion
  const handleEditFinding = async (findingId: number, customText: string) => {
    try {
      await api.actOnFinding(findingId, { action: 'edit', edited_text: customText });
      if (selectedItemId) {
        await loadCurrentItemDetails(selectedItemId);
      }
      setFeedbackMsg({ text: 'Custom correction applied to content text.', type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    }
  };

  // Dismiss a finding with mandatory written reason
  const handleDismissFinding = async (findingId: number, reason: string) => {
    try {
      await api.actOnFinding(findingId, { action: 'dismiss', dismissal_reason: reason });
      if (selectedItemId) {
        await loadCurrentItemDetails(selectedItemId);
      }
      setFeedbackMsg({ text: 'Finding dismissed with recorded justification.', type: 'info' });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    }
  };

  // Save new revision
  const handleSaveRevision = async () => {
    if (!currentItem) return;
    try {
      const updated = await api.saveRevision(currentItem.id, {
        text: manualEditText,
        notes: revisionNotes.trim() || undefined
      });
      setShowSaveRevisionModal(false);
      setIsManualEditing(false);
      setRevisionNotes('');
      setCurrentItem(updated);
      if (updated.latest_revision) {
        setActiveRevision(updated.latest_revision);
        setFindings(updated.latest_revision.findings || []);
      }
      setFeedbackMsg({
        text: `New Revision ${updated.latest_revision?.revision_no} saved. Run review to evaluate updated text.`,
        type: 'success'
      });
      loadItems();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    }
  };

  // Submit for human approval
  const handleSubmitForHumanReview = async () => {
    if (!currentItem) return;
    setIsSubmittingWorkflow(true);
    try {
      const updated = await api.submitForReview(currentItem.id);
      setCurrentItem(updated);
      setFeedbackMsg({
        text: 'Content submitted to Human Review Queue. A Reviewer must now inspect and approve it.',
        type: 'success'
      });
      loadItems();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    } finally {
      setIsSubmittingWorkflow(false);
    }
  };

  // Add Comment
  const handleAddComment = async (body: string, parentId?: number) => {
    if (!currentItem) return;
    try {
      await api.postComment(currentItem.id, { body, parent_id: parentId });
      const comms = await api.getComments(currentItem.id);
      setComments(comms);
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    }
  };

  // Create new content item
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newItem = await api.createContentItem({
        title: newTitle.trim(),
        content_type: newType,
        audience: newAudience.trim(),
        text: newText.trim(),
        notes: newNotes.trim()
      });
      setShowNewForm(false);
      setNewTitle('');
      setNewText('');
      await loadItems();
      setSelectedItemId(newItem.id);
      setFeedbackMsg({ text: `Content draft '${newItem.title}' created. Ready for governance review.`, type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    }
  };

  // Load sample non-compliant post into form
  const handleLoadSampleNonCompliant = () => {
    setNewTitle("Diwali Mega Blast: India's #1 Fastest Delivery");
    setNewType('social_post');
    setNewAudience('General Consumers');
    setNewText(
      "Acme is India's #1 fastest delivery service! We guarantee 100% safe arrival with zero delay guaranteed. " +
      "Founded in 2012, our courier guy delivers to over 500 cities at dirt cheap rates. " +
      "Click here to book your delivery now!"
    );
    setNewNotes('Diwali promo draft with intentional compliance test issues');
  };

  const filteredFindings = findings.filter(f => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    return true;
  });

  const openFindingsCount = findings.filter(f => f.author_action === 'pending').length;
  const highSeverityOpenCount = findings.filter(f => f.severity === 'high' && f.author_action === 'pending').length;

  return (
    <div className="space-y-4">
      
      {/* Top Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Content Review Workspace</h1>
              {currentItem && <StatusBadge status={currentItem.status} />}
            </div>
            <p className="text-xs text-slate-500">
              Interactive review, character-level highlights, evidence verification, and revision control.
            </p>
          </div>
        </div>

        {/* Item Selector & New Button */}
        <div className="flex items-center gap-2">
          <select
            value={selectedItemId || ''}
            onChange={(e) => setSelectedItemId(Number(e.target.value))}
            className="text-xs font-semibold p-2 rounded-lg border border-slate-300 bg-white max-w-xs truncate"
          >
            {items.map(it => (
              <option key={it.id} value={it.id}>
                {it.title} ({it.status.replace('_', ' ')})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowNewForm(true)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs whitespace-nowrap"
          >
            + New Content
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {feedbackMsg && (
        <div className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : feedbackMsg.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="font-bold underline ml-2">Dismiss</button>
        </div>
      )}

      {/* NEW CONTENT SUBMISSION MODAL */}
      {showNewForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Submit New Content for Governance Review</h2>
              <button
                onClick={() => setShowNewForm(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleLoadSampleNonCompliant}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Fill with Sample Non-Compliant Text
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Content Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Diwali Flash Express Campaign"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Content Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ContentType)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="social_post">Social Media Post</option>
                    <option value="email">Marketing / Notification Email</option>
                    <option value="brochure">Print / Digital Brochure</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
                  <input
                    type="text"
                    value={newAudience}
                    onChange={(e) => setNewAudience(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Draft Text Content</label>
                <textarea
                  required
                  rows={6}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Paste or write the draft content to evaluate against brand rules..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-md"
                >
                  Submit & Open Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAIN SPLIT-VIEW REVIEW WORKSPACE */}
      {currentItem && activeRevision ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT PANE: LIVE CONTENT WITH INTERACTIVE HIGHLIGHTS (7 COLS) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            
            {/* Top Bar for Left Pane */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Revision {activeRevision.revision_no}
                </span>
                <span className="text-xs text-slate-500">
                  by {activeRevision.author_name} • {new Date(activeRevision.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateToHistory(currentItem.id)}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200"
                  title="View revision timeline & diffs"
                >
                  <History className="w-3.5 h-3.5" /> History
                </button>

                <button
                  onClick={() => setShowComments(!showComments)}
                  className={`text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded border ${
                    showComments ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Comments ({comments.length})
                </button>

                {!isManualEditing ? (
                  <button
                    onClick={() => {
                      setManualEditText(activeRevision.text);
                      setIsManualEditing(true);
                    }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2.5 py-1 rounded border border-indigo-200 bg-indigo-50/50"
                  >
                    <Edit className="w-3.5 h-3.5" /> Manual Edit
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSaveRevisionModal(true)}
                    className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1 px-3 py-1 rounded shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Revision
                  </button>
                )}
              </div>
            </div>

            {/* Content Body Display or Editor */}
            <div className="min-h-[280px] p-4 rounded-xl bg-slate-50/60 border border-slate-200">
              {isManualEditing ? (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                    Editing Mode — Modify text and save as a new revision
                  </span>
                  <textarea
                    rows={10}
                    value={manualEditText}
                    onChange={(e) => setManualEditText(e.target.value)}
                    className="w-full text-sm font-mono p-3 rounded-lg border border-indigo-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsManualEditing(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowSaveRevisionModal(true)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold"
                    >
                      Save New Version
                    </button>
                  </div>
                </div>
              ) : (
                <TextHighlighter
                  text={activeRevision.text}
                  findings={findings}
                  selectedFindingId={selectedFindingId}
                  onSelectFinding={(id) => setSelectedFindingId(id)}
                />
              )}
            </div>

            {/* Left Bottom Workflow Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunReview}
                  disabled={isReviewing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isReviewing ? 'animate-spin' : ''}`} />
                  <span>{isReviewing ? 'Auditing Against Brand Kit...' : 'Run Governance Review'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmitForHumanReview}
                  disabled={isSubmittingWorkflow || currentItem.status === 'pending_human_review'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                  title="Submit content to the human reviewer queue"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{currentItem.status === 'pending_human_review' ? 'In Review Queue' : 'Submit for Human Approval'}</span>
                </button>
              </div>
            </div>

            {/* Threaded Comments Section (Collapsible) */}
            {showComments && (
              <div className="pt-4 border-t border-slate-200">
                <CommentsThread comments={comments} onAddComment={handleAddComment} />
              </div>
            )}

          </div>

          {/* RIGHT PANE: EXPLAINED FINDINGS & CORRECTIONS (5 COLS) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            
            {/* Findings Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">
                  Governance Findings ({findings.length})
                </h3>
                {highSeverityOpenCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    {highSeverityOpenCount} High Severity
                  </span>
                )}
              </div>

              {/* Severity filter chips */}
              <div className="flex items-center gap-1 text-[11px]">
                {(['all', 'high', 'medium', 'low'] as const).map(sev => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2 py-0.5 rounded capitalize font-medium ${
                      severityFilter === sev ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Findings List */}
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {filteredFindings.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">No brand violations detected</p>
                  <p className="text-[11px] text-slate-400">
                    Text complies with approved terminology, claims register, and fact sheets.
                  </p>
                </div>
              ) : (
                filteredFindings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    isSelected={selectedFindingId === finding.id}
                    onSelect={() => setSelectedFindingId(finding.id)}
                    onAccept={handleAcceptFinding}
                    onEdit={handleEditFinding}
                    onDismiss={handleDismissFinding}
                  />
                ))
              )}
            </div>

          </div>

        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-sm text-slate-500">No content item selected. Create or select an item above.</p>
        </div>
      )}

      {/* SAVE REVISION MODAL */}
      {showSaveRevisionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Save Revision {(activeRevision?.revision_no || 1) + 1}</h3>
            <p className="text-xs text-slate-500">
              Saving keeps prior versions intact in history so changes remain fully auditable.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Revision Notes (Optional)</label>
              <input
                type="text"
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="e.g. Corrected superlatives and updated city metrics..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveRevisionModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRevision}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg"
              >
                Confirm & Save Revision
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
