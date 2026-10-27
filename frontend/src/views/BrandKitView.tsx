import React, { useState, useEffect } from 'react';
import { SourceDocument, Rule, Severity } from '../types';
import { api, getDemoRole } from '../api/client';
import { SeverityBadge } from '../components/SeverityBadge';
import {
  BookOpen, Plus, Upload, Check, ShieldCheck, AlertTriangle, FileText,
  Filter, Sparkles, AlertCircle, ArrowUpRight, CheckCircle2, Lock
} from 'lucide-react';

export const BrandKitView: React.FC = () => {
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [activeTab, setActiveTab] = useState<'sources' | 'rules' | 'upload'>('rules');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Rule Form State
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleId, setNewRuleId] = useState('');
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<'terminology' | 'claims' | 'tone' | 'factual' | 'accessibility'>('terminology');
  const [newRuleSeverity, setNewRuleSeverity] = useState<Severity>('medium');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleSuggestion, setNewRuleSuggestion] = useState('');

  // Upload state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('guidelines');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPastedText, setUploadPastedText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const currentRole = getDemoRole();
  const isBrandManager = currentRole === 'brand_manager' || currentRole === 'admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [srcs, rls] = await Promise.all([
        api.getSources(),
        api.getRules()
      ]);
      setSources(srcs);
      setRules(rls);
    } catch (err: any) {
      setActionMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleRuleStatus = async (rule: Rule) => {
    if (!isBrandManager) {
      setActionMsg({
        text: `Permission Denied: Activating/deactivating rules requires Brand Manager role (Current: ${currentRole.toUpperCase()}). Switch roles in the top navbar.`,
        type: 'error'
      });
      return;
    }

    const nextStatus = rule.status === 'active' ? 'draft' : 'active';
    try {
      await api.updateRule(rule.rule_id, { status: nextStatus });
      setActionMsg({
        text: `Rule ${rule.rule_id} status updated to '${nextStatus}'.`,
        type: 'success'
      });
      fetchData();
    } catch (err: any) {
      setActionMsg({ text: err.message, type: 'error' });
    }
  };

  const handleCreateRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBrandManager) {
      setActionMsg({
        text: 'Permission Denied: Only Brand Managers or Admins can register new brand rules.',
        type: 'error'
      });
      return;
    }

    try {
      await api.createRule({
        rule_id: newRuleId.trim(),
        title: newRuleTitle.trim(),
        category: newRuleCategory,
        severity: newRuleSeverity,
        description: newRuleDesc.trim(),
        pattern: newRulePattern.trim() || undefined,
        replacement_suggestion: newRuleSuggestion.trim() || undefined,
        status: 'active'
      });
      setActionMsg({ text: `Rule ${newRuleId} registered and activated successfully.`, type: 'success' });
      setShowAddRule(false);
      setNewRuleId('');
      setNewRuleTitle('');
      setNewRuleDesc('');
      setNewRulePattern('');
      setNewRuleSuggestion('');
      fetchData();
    } catch (err: any) {
      setActionMsg({ text: err.message, type: 'error' });
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBrandManager) {
      setActionMsg({
        text: 'Permission Denied: Only Brand Managers can upload brand guidelines and sources.',
        type: 'error'
      });
      return;
    }

    setIsUploading(true);
    try {
      if (uploadFile) {
        const formData = new FormData();
        formData.append('title', uploadTitle);
        formData.append('document_type', uploadType);
        formData.append('file', uploadFile);
        await api.uploadSourceFile(formData);
      } else if (uploadPastedText.trim()) {
        await api.createSourceText({
          title: uploadTitle,
          document_type: uploadType,
          raw_text: uploadPastedText
        });
      } else {
        throw new Error('Please select a file or paste text content.');
      }

      setActionMsg({ text: `Source document '${uploadTitle}' uploaded and split into numbered passages.`, type: 'success' });
      setUploadTitle('');
      setUploadFile(null);
      setUploadPastedText('');
      setActiveTab('sources');
      fetchData();
    } catch (err: any) {
      setActionMsg({ text: err.message, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredRules = rules.filter(r => {
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Brand Kit & Governance Standards</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Acme Courier
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ground-truth rules, approved claims register, corporate fact sheets, and terminology standards.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'rules' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Brand Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'sources' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved Sources ({sources.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Upload / Ingest
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMsg && (
        <div className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
          actionMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="font-bold underline ml-2">Dismiss</button>
        </div>
      )}

      {/* TAB 1: RULES MANAGEMENT */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          
          {/* Controls: Filter and Add Rule button */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Category:
              </span>
              {['all', 'terminology', 'claims', 'tone', 'factual', 'accessibility'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs capitalize font-medium ${
                    categoryFilter === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}

              <span className="text-xs font-bold text-slate-500 uppercase ml-2">Status:</span>
              {['all', 'active', 'draft'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs capitalize font-medium ${
                    statusFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddRule(!showAddRule)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> {showAddRule ? 'Close Form' : 'Add Brand Rule'}
            </button>
          </div>

          {/* Add Rule Form Modal / Dropdown */}
          {showAddRule && (
            <form onSubmit={handleCreateRuleSubmit} className="bg-white p-5 rounded-xl border-2 border-indigo-200 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Define New Brand Governance Rule</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rule ID (e.g. BG-TRM-005)</label>
                  <input
                    type="text"
                    required
                    value={newRuleId}
                    onChange={(e) => setNewRuleId(e.target.value)}
                    placeholder="BG-CLM-005"
                    className="w-full text-xs p-2 rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value as any)}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                  >
                    <option value="terminology">Terminology</option>
                    <option value="claims">Promotional Claims</option>
                    <option value="tone">Tone of Voice</option>
                    <option value="factual">Factual Accuracy</option>
                    <option value="accessibility">Accessibility</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value as any)}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                  >
                    <option value="high">High (Blocks approval)</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  value={newRuleTitle}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  placeholder="e.g. Restrict Superlative Speed Claims"
                  className="w-full text-xs p-2 rounded border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Description & Rationale</label>
                <textarea
                  required
                  rows={2}
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Explain why this guideline is enforced and cite the source..."
                  className="w-full text-xs p-2 rounded border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Match Pattern (Regex or words)</label>
                  <input
                    type="text"
                    value={newRulePattern}
                    onChange={(e) => setNewRulePattern(e.target.value)}
                    placeholder="e.g. fastest delivery|number one"
                    className="w-full text-xs p-2 rounded border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Replacement Suggestion</label>
                  <input
                    type="text"
                    value={newRuleSuggestion}
                    onChange={(e) => setNewRuleSuggestion(e.target.value)}
                    placeholder="e.g. delivers within 24 hours in 40 cities"
                    className="w-full text-xs p-2 rounded border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRule(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg"
                >
                  Save & Register Rule
                </button>
              </div>
            </form>
          )}

          {/* Rules Cards List */}
          <div className="grid grid-cols-1 gap-3">
            {filteredRules.map((rule) => {
              const isDraft = rule.status === 'draft';
              return (
                <div
                  key={rule.id}
                  className={`bg-white rounded-xl border p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    isDraft ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {rule.rule_id}
                      </span>
                      <span className="text-xs font-semibold text-slate-900">{rule.title}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {rule.category}
                      </span>
                      <SeverityBadge severity={rule.severity} />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isDraft ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {rule.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{rule.description}</p>

                    {rule.source_title && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <BookOpen className="w-3 h-3 text-slate-400" />
                        <span>Source: {rule.source_title}</span>
                        {rule.source_passage_identifier && (
                          <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">
                            {rule.source_passage_identifier}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Activation / Deactivation toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleRuleStatus(rule)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                        isDraft
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                          : 'border border-slate-300 hover:bg-slate-100 text-slate-700'
                      }`}
                      title={!isBrandManager ? 'Brand Manager permission required' : ''}
                    >
                      {isDraft ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Activate</span>
                        </>
                      ) : (
                        <span>Deactivate</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SOURCES & PASSAGES */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((src) => (
              <div key={src.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{src.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="capitalize font-medium">{src.document_type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>v{src.version}</span>
                      <span>•</span>
                      <span className="capitalize">{src.confidentiality}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {src.passages_count} Passages
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-2 pt-2 border-t border-slate-100">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>File: {src.file_name || 'Direct text input'}</span>
                  <span className="ml-auto text-[10px] text-slate-400">By {src.uploaded_by}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: UPLOAD / INGEST DOCUMENT */}
      {activeTab === 'upload' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Ingest Brand Source or Fact Sheet</h2>
            <p className="text-xs text-slate-500 mt-1">
              Upload guidelines, claims registers, or fact sheets (.txt, .pdf, .docx) or paste plain text. The system automatically segments content into numbered passages for evidence-linked findings.
            </p>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
              <input
                type="text"
                required
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Acme 2026 Social Media Tone Guide"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Document Type</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="guidelines">Brand Identity & Tone Guidelines</option>
                <option value="claims">Approved Claims Register</option>
                <option value="fact_sheet">Corporate Fact Sheet</option>
                <option value="terminology">Terminology & Product Glossary</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Option A: Upload File (.txt, .pdf, .docx)</label>
              <input
                type="file"
                accept=".txt,.pdf,.docx,.md"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Option B: Or Paste Guideline Text</label>
              <textarea
                rows={5}
                value={uploadPastedText}
                onChange={(e) => setUploadPastedText(e.target.value)}
                placeholder="Paste guideline text, fact sheets, or claim rules here..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-sans"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isUploading || (!uploadFile && !uploadPastedText.trim())}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Ingesting & Splitting Passages...' : 'Upload & Process Source'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
