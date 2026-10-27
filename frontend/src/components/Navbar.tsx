import React, { useState } from 'react';
import { DemoRole } from '../types';
import { getDemoRole, setDemoRole, getDemoUserName, api } from '../api/client';
import { ShieldCheck, UserCheck, RefreshCw, Sparkles, Database } from 'lucide-react';

interface NavbarProps {
  onRoleChange: () => void;
  onRefreshData: () => void;
  aiModeActive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onRoleChange, onRefreshData, aiModeActive }) => {
  const [selectedRole, setSelectedRole] = useState<DemoRole>(getDemoRole());
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleRoleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as DemoRole;
    setSelectedRole(newRole);
    setDemoRole(newRole);
    onRoleChange();
  };

  const handleSeedDemo = async () => {
    setLoadingSeed(true);
    try {
      const res = await api.seedDemo();
      setToastMsg(res.message || 'Demo data loaded successfully!');
      onRefreshData();
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      setToastMsg(`Error loading demo data: ${err.message}`);
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setLoadingSeed(false);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">BrandGuard AI</span>
              <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Round 2 MVP
              </span>
            </div>
            <p className="text-xs text-slate-400">Team Dashing Cars • Explainable Brand Governance</p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-4">
          
          {/* AI Engine Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
            {aiModeActive ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                <span className="text-teal-300 font-medium">LLM Enhanced</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-slate-300 font-medium">Rule Engine (Deterministic)</span>
              </>
            )}
          </div>

          {/* Seed Demo Button */}
          <button
            onClick={handleSeedDemo}
            disabled={loadingSeed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition"
            title="Load or refresh Acme Courier demonstration workspace"
          >
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span>{loadingSeed ? 'Seeding...' : 'Load Demo Data'}</span>
          </button>

          {/* Role Switcher */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-1.5">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <div className="text-left">
              <label htmlFor="role-select" className="block text-[10px] uppercase font-bold text-slate-400 leading-none">
                Demo Role (Enforced)
              </label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={handleRoleSelect}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1"
              >
                <option value="creator" className="bg-slate-900 text-white">Creator: Anushka Tambore</option>
                <option value="reviewer" className="bg-slate-900 text-white">Reviewer: Jayshree Gore</option>
                <option value="brand_manager" className="bg-slate-900 text-white">Brand Manager: Kshitija Kolkar</option>
                <option value="admin" className="bg-slate-900 text-white">Admin: Sahil Sakhare</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Instant Notification Toast */}
      {toastMsg && (
        <div className="bg-teal-600 text-white text-xs py-1.5 px-4 text-center font-medium shadow-md transition-all">
          {toastMsg}
        </div>
      )}
    </header>
  );
};
