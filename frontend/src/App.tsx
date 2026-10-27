import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './views/DashboardView';
import { BrandKitView } from './views/BrandKitView';
import { ReviewContentView } from './views/ReviewContentView';
import { ReviewQueueView } from './views/ReviewQueueView';
import { HistoryView } from './views/HistoryView';
import { AnalyticsView } from './views/AnalyticsView';
import { AuditLogView } from './views/AuditLogView';
import { api } from './api/client';
import {
  LayoutDashboard, ShieldCheck, FileCheck, CheckSquare,
  History, BarChart2, ShieldAlert, ChevronRight, Menu, X
} from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'brand_kit' | 'review' | 'queue' | 'history' | 'analytics' | 'audit'>('dashboard');
  const [targetContentId, setTargetContentId] = useState<number | undefined>(undefined);
  const [aiModeActive, setAiModeActive] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.getHealth();
        setAiModeActive(res.ai_configured);
      } catch (e) {
        console.error('Health check failed', e);
      }
    };
    checkHealth();
  }, [refreshKey]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'brand_kit', label: 'Brand Kit & Rules', icon: ShieldCheck },
    { id: 'review', label: 'Review Content', icon: FileCheck },
    { id: 'queue', label: 'Human Review Queue', icon: CheckSquare },
    { id: 'history', label: 'Revision History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'audit', label: 'Audit Log', icon: ShieldAlert },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        onRoleChange={() => setRefreshKey(k => k + 1)}
        onRefreshData={() => setRefreshKey(k => k + 1)}
        aiModeActive={aiModeActive}
      />

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        
        {/* Sidebar Navigation (Desktop) */}
        <aside className="w-60 shrink-0 hidden md:block">
          <nav className="space-y-1 sticky top-24">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                </button>
              );
            })}

            <div className="pt-6 px-3">
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <span className="font-bold text-slate-800 block">Round 2 MVP Integrity</span>
                <p className="leading-relaxed text-[11px]">
                  All reviews cite verified passages. Approvals require human action; AI can never publish.
                </p>
              </div>
            </div>
          </nav>
        </aside>

        {/* Mobile Navigation Dropdown Button */}
        <div className="md:hidden w-full mb-2">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-bold capitalize text-slate-800">
              Current View: {currentView.replace('_', ' ')}
            </span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="mt-2 p-2 rounded-xl bg-white border border-slate-200 space-y-1 shadow-lg">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      currentView === item.id ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic View Area */}
        <main className="flex-1 min-w-0">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigateToReview={(contentId) => {
                setTargetContentId(contentId);
                setCurrentView('review');
              }}
              onNavigateToQueue={() => setCurrentView('queue')}
            />
          )}

          {currentView === 'brand_kit' && <BrandKitView />}

          {currentView === 'review' && (
            <ReviewContentView
              initialContentId={targetContentId}
              onNavigateToHistory={(contentId) => {
                setTargetContentId(contentId);
                setCurrentView('history');
              }}
              onNavigateToQueue={() => setCurrentView('queue')}
            />
          )}

          {currentView === 'queue' && (
            <ReviewQueueView
              onOpenItemWorkspace={(contentId) => {
                setTargetContentId(contentId);
                setCurrentView('review');
              }}
            />
          )}

          {currentView === 'history' && (
            <HistoryView initialContentId={targetContentId} />
          )}

          {currentView === 'analytics' && <AnalyticsView />}

          {currentView === 'audit' && <AuditLogView />}
        </main>

      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        BrandGuard AI • Inkloom AI Hackathon Round 2 • Team Dashing Cars (Anushka Tambore, Sahil Sakhare, Kshitija Kolkar, Jayshree Gore)
      </footer>

    </div>
  );
}

export default App;
