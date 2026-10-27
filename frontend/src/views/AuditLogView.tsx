import React, { useState, useEffect } from 'react';
import { AuditEvent } from '../types';
import { api } from '../api/client';
import { ShieldCheck, Filter, Clock, User } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    const fetchAudit = async () => {
      setLoading(true);
      try {
        const data = await api.getAuditLog(100);
        setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, []);

  const filteredEvents = events.filter(e => {
    if (filterAction !== 'all' && e.action !== filterAction) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Append-Only Governance Audit Trail</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-white">
              Immutable
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete cryptographic audit trail of all source uploads, rule activations, review executions, suggestion dismissals, and approval overrides.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Filter Action:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-300 font-medium bg-white text-xs"
          >
            <option value="all">All Events ({events.length})</option>
            <option value="source_uploaded">Source Uploaded</option>
            <option value="rule_activated">Rule Activated</option>
            <option value="review_executed">Review Executed</option>
            <option value="finding_accepted">Suggestion Accepted</option>
            <option value="finding_dismissed">Suggestion Dismissed</option>
            <option value="decision_approved">Decision Approved</option>
            <option value="high_severity_override">High-Severity Override</option>
          </select>
        </div>
      </div>

      {/* Events Table / Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Object</th>
                <th className="py-3 px-4">Details & Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No audit records matching filter.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{ev.actor_name}</div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 px-1.5 py-0.2 rounded bg-slate-100">
                        {ev.actor_role}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        ev.action.includes('override') ? 'bg-rose-100 text-rose-800' :
                        ev.action.includes('approved') ? 'bg-emerald-100 text-emerald-800' :
                        ev.action.includes('dismissed') ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {ev.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {ev.object_type}:{ev.object_id}
                    </td>
                    <td className="py-3 px-4 text-slate-800 leading-relaxed">
                      {ev.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
