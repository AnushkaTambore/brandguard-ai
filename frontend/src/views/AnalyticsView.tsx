import React, { useState, useEffect } from 'react';
import { AnalyticsData } from '../types';
import { api } from '../api/client';
import { BarChart3, PieChart, TrendingDown, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.getAnalytics();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-xs text-slate-400">No analytics data available yet.</p>
      </div>
    );
  }

  const totalFindings = Object.values(data.findings_by_category).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">Governance Analytics & Risk Metrics</h1>
        <p className="text-xs text-slate-500 mt-1">
          Aggregated insights computed directly from persistent database records. Identifies high-risk rules, recurrence trends, and suggestion acceptance.
        </p>
      </div>

      {/* Grid: Rules & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Most Triggered Brand Rules */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Frequently Triggered Brand Rules
            </h3>
            <span className="text-xs text-slate-400">Top violations</span>
          </div>

          <div className="space-y-3">
            {data.rules_triggered.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No rule hits logged yet.</p>
            ) : (
              data.rules_triggered.map((rule, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800">{rule.rule_id}</span>
                    <span className="font-bold text-indigo-600">{rule.hits} detections</span>
                  </div>
                  <p className="text-slate-500 text-[11px] truncate">{rule.description}</p>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${Math.min(rule.hits * 20, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Breakdown by Category and Severity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Findings by Category & Severity
            </h3>
            <span className="text-xs text-slate-400">{totalFindings} Total</span>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase text-slate-400">By Issue Category</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(data.findings_by_category).map(([cat, count]) => (
                <div key={cat} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 capitalize block text-[11px]">{cat.replace('_', ' ')}</span>
                  <span className="font-extrabold text-sm text-slate-800">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Severities */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase text-slate-400">By Severity Level</span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                <span className="text-rose-700 block text-[11px]">High Severity</span>
                <span className="font-extrabold text-sm text-rose-800">{data.findings_by_severity['high'] || 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-amber-700 block text-[11px]">Medium</span>
                <span className="font-extrabold text-sm text-amber-800">{data.findings_by_severity['medium'] || 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200">
                <span className="text-sky-700 block text-[11px]">Low</span>
                <span className="font-extrabold text-sm text-sky-800">{data.findings_by_severity['low'] || 0}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Row 2: Workflow Decisions and Suggestion Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Suggestion Adoption */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <h3 className="font-bold text-sm text-slate-900">Author Suggestion Resolutions</h3>
          <p className="text-xs text-slate-500">How content authors respond to brand suggestions.</p>

          <div className="grid grid-cols-3 gap-2 text-xs pt-2">
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
              <span className="text-teal-700 block font-medium">Accepted Fixes</span>
              <span className="font-extrabold text-lg text-teal-800">{data.suggestion_actions['accepted'] || 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <span className="text-indigo-700 block font-medium">Custom Edits</span>
              <span className="font-extrabold text-lg text-indigo-800">{data.suggestion_actions['edited'] || 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-300">
              <span className="text-slate-600 block font-medium">Dismissed (With Reason)</span>
              <span className="font-extrabold text-lg text-slate-700">{data.suggestion_actions['dismissed'] || 0}</span>
            </div>
          </div>
        </div>

        {/* Content Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <h3 className="font-bold text-sm text-slate-900">Content Governance Lifecycle</h3>
          <p className="text-xs text-slate-500">Distribution of items across review pipeline stages.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Drafts</span>
              <span className="font-bold text-slate-800">{data.content_status_distribution['draft'] || 0}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <span className="text-amber-700 block text-[11px]">Needs Changes</span>
              <span className="font-bold text-amber-800">{data.content_status_distribution['needs_changes'] || 0}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
              <span className="text-purple-700 block text-[11px]">In Review</span>
              <span className="font-bold text-purple-800">{data.content_status_distribution['pending_human_review'] || 0}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-emerald-700 block text-[11px]">Approved</span>
              <span className="font-bold text-emerald-800">{data.content_status_distribution['approved'] || 0}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
