import { DemoRole } from '../types';

let currentRole: DemoRole = 'creator';
let currentUserName = 'Anushka Tambore';

export const setDemoRole = (role: DemoRole, name?: string) => {
  currentRole = role;
  if (name) {
    currentUserName = name;
  } else {
    switch (role) {
      case 'creator':
        currentUserName = 'Anushka Tambore';
        break;
      case 'reviewer':
        currentUserName = 'Jayshree Gore';
        break;
      case 'brand_manager':
        currentUserName = 'Kshitija Kolkar';
        break;
      case 'admin':
        currentUserName = 'Sahil Sakhare';
        break;
    }
  }
};

export const getDemoRole = () => currentRole;
export const getDemoUserName = () => currentUserName;

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const fullUrl = url.startsWith('/') ? `${API_BASE}${url}` : `${API_BASE}/${url}`;
  const headers = new Headers(options.headers || {});
  headers.set('X-User-Role', currentRole);
  headers.set('X-User-Name', currentUserName);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }

  return response.json();
};

export const api = {
  // Health & Seed
  getHealth: () => apiFetch('/api/health'),
  seedDemo: () => apiFetch('/api/demo/seed', { method: 'POST' }),

  // Dashboard & Analytics
  getDashboard: () => apiFetch('/api/analytics/dashboard'),
  getAnalytics: () => apiFetch('/api/analytics/metrics'),
  getAuditLog: (limit = 50) => apiFetch(`/api/audit?limit=${limit}`),

  // Brand Kit
  getSources: () => apiFetch('/api/brand-kit/sources'),
  getSourceDetail: (id: number) => apiFetch(`/api/brand-kit/sources/${id}`),
  createSourceText: (data: any) => apiFetch('/api/brand-kit/sources/text', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  uploadSourceFile: (formData: FormData) => apiFetch('/api/brand-kit/sources/upload', {
    method: 'POST',
    body: formData
  }),
  getRules: (params?: { category?: string; status?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return apiFetch(`/api/brand-kit/rules${q ? '?' + q : ''}`);
  },
  createRule: (rule: any) => apiFetch('/api/brand-kit/rules', {
    method: 'POST',
    body: JSON.stringify(rule)
  }),
  updateRule: (ruleId: string, updates: any) => apiFetch(`/api/brand-kit/rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  }),
  extractRules: (data: any) => apiFetch('/api/brand-kit/rules/extract', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Content & Revisions
  getContentItems: (status?: string) => apiFetch(`/api/content${status ? '?status=' + status : ''}`),
  getContentItem: (id: number) => apiFetch(`/api/content/${id}`),
  createContentItem: (item: any) => apiFetch('/api/content', {
    method: 'POST',
    body: JSON.stringify(item)
  }),
  reviewContent: (contentId: number) => apiFetch(`/api/content/${contentId}/review`, {
    method: 'POST'
  }),
  saveRevision: (contentId: number, data: { text: string; notes?: string }) => apiFetch(`/api/content/${contentId}/revisions`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getRevisions: (contentId: number) => apiFetch(`/api/content/${contentId}/revisions`),
  compareRevisions: (contentId: number, revA: number, revB: number) =>
    apiFetch(`/api/content/${contentId}/compare?rev_a=${revA}&rev_b=${revB}`),

  // Findings
  actOnFinding: (findingId: number, actionData: { action: 'accept' | 'edit' | 'dismiss'; edited_text?: string; dismissal_reason?: string }) =>
    apiFetch(`/api/findings/${findingId}/action`, {
      method: 'POST',
      body: JSON.stringify(actionData)
    }),

  // Workflow & Approvals
  submitForReview: (contentId: number) => apiFetch(`/api/workflow/${contentId}/submit-for-review`, {
    method: 'POST'
  }),
  makeDecision: (contentId: number, decisionData: { decision: 'approved' | 'rejected' | 'changes_requested'; reason: string; override_reason?: string }) =>
    apiFetch(`/api/workflow/${contentId}/decision`, {
      method: 'POST',
      body: JSON.stringify(decisionData)
    }),
  getDecisions: (contentId: number) => apiFetch(`/api/workflow/${contentId}/decisions`),

  // Comments
  getComments: (contentId: number) => apiFetch(`/api/comments/${contentId}`),
  postComment: (contentId: number, commentData: { body: string; parent_id?: number }) =>
    apiFetch(`/api/comments/${contentId}`, {
      method: 'POST',
      body: JSON.stringify(commentData)
    })
};
