import React, { useEffect, useState } from 'react';
import { DashboardOverview, ContentItem } from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileText, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  TrendingUp, Sparkles, ArrowRight, Play, Database, History
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToReview: (contentId?: number) => void;
  onNavigateToQueue: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToReview, onNavigateToQueue }) => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [recentItems, setRecentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dash, items] = await Promise.all([
        api.getDashboard(),
        api.getContentItems()
      ]);
      setData(dash);
      setRecentItems(items.slice(0, 5));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-500 font-medium">Loading BrandGuard AI workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
        <h3 className="font-bold">Failed to load dashboard</h3>
        <p className="text-sm mt-1">{error || 'Unknown error occurred.'}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-3 px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Welcome & Hackathon Quickstart Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Acme Courier Demonstration Workspace
            </span>
            <span className="text-xs text-slate-400">Team Dashing Cars</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Explainable, Human-Controlled Brand Governance
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            BrandGuard AI verifies marketing copy, social posts, and claims against approved brand guidelines and fact sheets before publication. Every finding links to verified evidence — final publishing decisions always remain in human hands.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigateToReview(recentItems[0]?.id)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Test Sample Launch Post (1-Click Review)</span>
            </button>
            <button
              onClick={onNavigateToQueue}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl border border-white/20 transition"
            >
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Review Queue ({data.pending_human_reviews} Pending)</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-teal-500/10 to-transparent pointer-events-none"></div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Items</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{data.total_content_items}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Active across revisions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">In Review Queue</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-purple-700">{data.pending_human_reviews}</div>
          <span className="text-[11px] text-purple-600 font-medium mt-1 block">Awaiting human reviewer</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{data.approved_items}</div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Cleared for publish</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Open Findings</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{data.open_findings}</div>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">Actionable suggestions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">High Severity</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600">{data.high_severity_open}</div>
          <span className="text-[11px] text-rose-600 font-medium mt-1 block">Blocks approval</span>
        </div>

      </div>

      {/* Two Column Layout: Recent Items & Activity / Top Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Content Items Pipeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Recent Content Submissions</h2>
              <button
                onClick={() => onNavigateToReview()}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                + New Submission
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentItems.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 italic">No content items found. Click "Load Demo Data" above.</p>
              ) : (
                recentItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigateToReview(item.id)}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 hover:text-indigo-600">
                          {item.title}
                        </span>
                        <StatusBadge status={item.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="capitalize font-medium">{item.content_type.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>Audience: {item.audience}</span>
                        <span>•</span>
                        <span>Rev {item.revisions_count}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.open_findings_count > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {item.open_findings_count} findings
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Common Types of Violations */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3">Top Brand Violations Detected</h3>
            <div className="space-y-3">
              {data.common_violations.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-slate-700">{v.rule_id}</span>
                    <span className="text-slate-500 block capitalize">{v.category.replace('_', ' ')} issue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${Math.min(v.count * 25, 100)}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-slate-700 w-6 text-right">{v.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Recent Activity Stream */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Governance Audit Trail</h3>
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Append-Only</span>
          </div>

          <div className="space-y-3">
            {data.recent_activity.map((ev) => (
              <div key={ev.id} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-800">{ev.actor_name}</span>
                  <span className="text-slate-400">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold">
                    {ev.action.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-slate-600 line-clamp-2">{ev.details}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
