export type DemoRole = 'creator' | 'reviewer' | 'brand_manager' | 'admin';

export interface User {
  id: number;
  org_id: number;
  name: string;
  email: string;
  role: DemoRole;
}

export type ContentType = 'social_post' | 'email' | 'brochure';
export type ContentStatus = 'draft' | 'in_review' | 'needs_changes' | 'pending_human_review' | 'approved' | 'rejected';
export type Severity = 'high' | 'medium' | 'low';
export type ConfidenceLevel = 'high' | 'medium_high' | 'medium' | 'low';
export type AuthorAction = 'pending' | 'accepted' | 'edited' | 'dismissed';

export interface SourcePassage {
  id: number;
  passage_identifier: string;
  section_title: string;
  text: string;
  position: number;
}

export interface SourceDocument {
  id: number;
  org_id: number;
  title: string;
  document_type: 'guidelines' | 'terminology' | 'claims' | 'fact_sheet';
  version: string;
  confidentiality: 'public' | 'internal' | 'confidential';
  file_name?: string;
  uploaded_by: string;
  created_at: string;
  passages_count: number;
  raw_text?: string;
  passages?: SourcePassage[];
}

export interface Rule {
  id: number;
  rule_id: string;
  org_id: number;
  category: 'terminology' | 'claims' | 'tone' | 'factual' | 'accessibility';
  severity: Severity;
  title: string;
  description: string;
  examples_do: string[];
  examples_dont: string[];
  source_passage_identifier?: string;
  source_title?: string;
  status: 'draft' | 'active' | 'inactive';
  pattern?: string;
  replacement_suggestion?: string;
  version: number;
  created_by: string;
  approved_by?: string;
  created_at: string;
}

export interface Finding {
  id: number;
  finding_id: string;
  revision_id: number;
  category: string;
  start_char: number;
  end_char: number;
  flagged_text: string;
  rule_id: string;
  rule_description: string;
  evidence_source?: string;
  evidence_passage_id?: string;
  reason: string;
  severity: Severity;
  confidence_level: ConfidenceLevel;
  confidence_basis: string[];
  suggestion: string;
  author_action: AuthorAction;
  dismissal_reason?: string;
  created_at: string;
}

export interface ContentRevision {
  id: number;
  content_id: number;
  revision_no: number;
  text: string;
  author_name: string;
  notes: string;
  created_at: string;
  findings: Finding[];
}

export interface ContentItem {
  id: number;
  org_id: number;
  title: string;
  content_type: ContentType;
  audience: string;
  status: ContentStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  latest_revision?: ContentRevision;
  revisions_count: number;
  open_findings_count: number;
  high_severity_findings_count: number;
}

export interface Comment {
  id: number;
  content_id: number;
  revision_no: number;
  parent_id?: number;
  author_name: string;
  author_role: string;
  body: string;
  created_at: string;
  replies?: Comment[];
}

export interface ApprovalDecision {
  id: number;
  content_id: number;
  revision_no: number;
  decision: 'approved' | 'rejected' | 'changes_requested';
  reviewer_name: string;
  reviewer_role: string;
  reason: string;
  override_reason?: string;
  created_at: string;
}

export interface AuditEvent {
  id: number;
  org_id: number;
  actor_name: string;
  actor_role: string;
  action: string;
  object_type: string;
  object_id: string;
  details?: string;
  timestamp: string;
}

export interface DashboardOverview {
  total_content_items: number;
  pending_human_reviews: number;
  approved_items: number;
  rejected_items: number;
  open_findings: number;
  high_severity_open: number;
  ai_mode_active: boolean;
  recent_activity: AuditEvent[];
  common_violations: { rule_id: string; category: string; count: number }[];
}

export interface AnalyticsData {
  rules_triggered: { rule_id: string; description: string; severity: string; hits: number }[];
  findings_by_category: Record<string, number>;
  findings_by_severity: Record<string, number>;
  content_status_distribution: Record<string, number>;
  suggestion_actions: Record<string, number>;
  author_recurring_issues: { author_name: string; category: string; count: number }[];
}
