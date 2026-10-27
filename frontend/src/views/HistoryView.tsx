import React, { useState, useEffect } from 'react';
import { ContentItem, ContentRevision } from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { History, GitCompare, ArrowRight, Clock, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

interface HistoryViewProps {
  initialContentId?: number;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ initialContentId }) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(initialContentId || null);
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [selectedRevA, setSelectedRevA] = useState<number>(1);
  const [selectedRevB, setSelectedRevB] = useState<number>(1);
  const [compareData, setCompareData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await api.getContentItems();
      setItems(data);
      if (!selectedItemId && data.length > 0) {
        setSelectedItemId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (initialContentId) {
      setSelectedItemId(initialContentId);
    }
  }, [initialContentId]);

  const fetchRevisions = async (contentId: number) => {
    try {
      const revs = await api.getRevisions(contentId);
      setRevisions(revs);
      if (revs.length >= 2) {
        setSelectedRevA(revs[revs.length - 1].revision_no);
        setSelectedRevB(revs[0].revision_no);
      } else if (revs.length === 1) {
        setSelectedRevA(revs[0].revision_no);
        setSelectedRevB(revs[0].revision_no);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedItemId) {
      fetchRevisions(selectedItemId);
    }
  }, [selectedItemId]);

  const handleCompare = async () => {
    if (!selectedItemId) return;
    try {
      const res = await api.compareRevisions(selectedItemId, selectedRevA, selectedRevB);
      setCompareData(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedItemId && selectedRevA && selectedRevB) {
      handleCompare();
    }
  }, [selectedItemId, selectedRevA, selectedRevB]);

  const selectedItem = items.find(i => i.id === selectedItemId);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Revision History & Version Comparison</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Immutable Revisions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compare earlier drafts, observe finding resolution over time, and trace editorial accountability.
          </p>
        </div>

        {/* Item Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Select Item:</label>
          <select
            value={selectedItemId || ''}
            onChange={(e) => setSelectedItemId(Number(e.target.value))}
            className="text-xs font-semibold p-2 rounded-lg border border-slate-300 bg-white max-w-xs truncate"
          >
            {items.map(it => (
              <option key={it.id} value={it.id}>
                {it.title} ({it.revisions_count} revs)
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedItem && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Col: Revisions Timeline (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              Revision Timeline ({revisions.length})
            </h3>

            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {revisions.map((rev) => (
                <div key={rev.id} className="relative flex items-start gap-3 pl-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 z-10">
                    {rev.revision_no}
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex-1 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Revision {rev.revision_no}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(rev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600">Author: <span className="font-medium text-slate-800">{rev.author_name}</span></p>
                    {rev.notes && <p className="text-slate-500 italic">"{rev.notes}"</p>}
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {rev.findings?.length || 0} findings recorded
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Col: Side-by-Side Comparison (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            
            {/* Compare Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Side-by-Side Version Diff</h3>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">From:</span>
                  <select
                    value={selectedRevA}
                    onChange={(e) => setSelectedRevA(Number(e.target.value))}
                    className="p-1 rounded border border-slate-300 font-semibold bg-white"
                  >
                    {revisions.map(r => (
                      <option key={r.id} value={r.revision_no}>Rev {r.revision_no}</option>
                    ))}
                  </select>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">To:</span>
                  <select
                    value={selectedRevB}
                    onChange={(e) => setSelectedRevB(Number(e.target.value))}
                    className="p-1 rounded border border-slate-300 font-semibold bg-white"
                  >
                    {revisions.map(r => (
                      <option key={r.id} value={r.revision_no}>Rev {r.revision_no}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Findings Improvement Metric */}
            {compareData && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Rev {compareData.rev_a_no} Issues:</span>
                  <span className="text-base font-bold text-slate-800">{compareData.rev_a_findings_count} findings</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Rev {compareData.rev_b_no} Issues:</span>
                  <span className={`text-base font-bold ${
                    compareData.rev_b_findings_count < compareData.rev_a_findings_count ? 'text-emerald-600' : 'text-slate-800'
                  }`}>
                    {compareData.rev_b_findings_count} findings
                    {compareData.rev_b_findings_count < compareData.rev_a_findings_count && (
                      <span className="text-xs text-emerald-600 font-semibold ml-2">
                        (-{compareData.rev_a_findings_count - compareData.rev_b_findings_count} resolved)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Side-by-Side Text Comparison */}
            {compareData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Revision {compareData.rev_a_no} Copy
                  </span>
                  <div className="p-3 rounded-xl bg-rose-50/40 border border-rose-200 text-xs font-mono leading-relaxed min-h-[220px] whitespace-pre-wrap text-slate-800">
                    {compareData.rev_a_text}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Revision {compareData.rev_b_no} Copy
                  </span>
                  <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200 text-xs font-mono leading-relaxed min-h-[220px] whitespace-pre-wrap text-slate-800">
                    {compareData.rev_b_text}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Select revisions above to compare.</p>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
