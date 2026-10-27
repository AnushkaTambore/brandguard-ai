import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict

# User & Auth
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    org_id: int
    name: str
    email: str
    role: str

class DemoRoleSwitchRequest(BaseModel):
    role: str  # creator, reviewer, brand_manager, admin
    user_name: Optional[str] = None

# Passages and Sources
class SourcePassageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    passage_identifier: str
    section_title: str
    text: str
    position: int

class SourceDocumentCreate(BaseModel):
    title: str
    document_type: str  # guidelines, terminology, claims, fact_sheet
    version: str = "1.0"
    confidentiality: str = "internal"  # public, internal, confidential
    raw_text: str
    file_name: Optional[str] = None

class SourceDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    org_id: int
    title: str
    document_type: str
    version: str
    confidentiality: str
    file_name: Optional[str]
    uploaded_by: str
    created_at: datetime.datetime
    passages_count: int = 0

class SourceDocumentDetail(SourceDocumentResponse):
    raw_text: str
    passages: List[SourcePassageResponse] = []

# Rules
class RuleCreate(BaseModel):
    rule_id: str
    category: str
    severity: str
    title: str
    description: str
    examples_do: List[str] = []
    examples_dont: List[str] = []
    source_passage_identifier: Optional[str] = None
    source_title: Optional[str] = None
    status: str = "draft"
    pattern: Optional[str] = None
    replacement_suggestion: Optional[str] = None

class RuleUpdate(BaseModel):
    category: Optional[str] = None
    severity: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    examples_do: Optional[List[str]] = None
    examples_dont: Optional[List[str]] = None
    status: Optional[str] = None
    pattern: Optional[str] = None
    replacement_suggestion: Optional[str] = None

class RuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    rule_id: str
    org_id: int
    category: str
    severity: str
    title: str
    description: str
    examples_do: List[str] = []
    examples_dont: List[str] = []
    source_passage_identifier: Optional[str] = None
    source_title: Optional[str] = None
    status: str
    pattern: Optional[str] = None
    replacement_suggestion: Optional[str] = None
    version: int
    created_by: str
    approved_by: Optional[str] = None
    created_at: datetime.datetime

class RuleExtractRequest(BaseModel):
    document_id: Optional[int] = None
    raw_text: Optional[str] = None
    document_title: Optional[str] = "Uploaded Guideline"

# Findings
class FindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    finding_id: str
    revision_id: int
    category: str
    start_char: int
    end_char: int
    flagged_text: str
    rule_id: str
    rule_description: str
    evidence_source: Optional[str] = None
    evidence_passage_id: Optional[str] = None
    reason: str
    severity: str
    confidence_level: str
    confidence_basis: List[str] = []
    suggestion: str
    author_action: str
    dismissal_reason: Optional[str] = None
    created_at: datetime.datetime

class FindingActionRequest(BaseModel):
    action: str  # accept, edit, dismiss
    edited_text: Optional[str] = None
    dismissal_reason: Optional[str] = None

# Content & Revisions
class ContentItemCreate(BaseModel):
    title: str
    content_type: str  # social_post, email, brochure
    audience: str = "General Public"
    text: str
    notes: Optional[str] = "Initial submission"

class ContentRevisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    content_id: int
    revision_no: int
    text: str
    author_name: str
    notes: str
    created_at: datetime.datetime
    findings: List[FindingResponse] = []

class ContentItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    org_id: int
    title: str
    content_type: str
    audience: str
    status: str
    created_by: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    latest_revision: Optional[ContentRevisionResponse] = None
    revisions_count: int = 0
    open_findings_count: int = 0
    high_severity_findings_count: int = 0

class RevisionSaveRequest(BaseModel):
    text: str
    notes: Optional[str] = "Manual edits"

class RevisionCompareResponse(BaseModel):
    content_id: int
    rev_a_no: int
    rev_b_no: int
    rev_a_text: str
    rev_b_text: str
    rev_a_findings_count: int
    rev_b_findings_count: int

# Comments & Workflow
class CommentCreate(BaseModel):
    body: str
    parent_id: Optional[int] = None

class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    content_id: int
    revision_no: int
    parent_id: Optional[int] = None
    author_name: str
    author_role: str
    body: str
    created_at: datetime.datetime
    replies: List["CommentResponse"] = []

class ApprovalDecisionRequest(BaseModel):
    decision: str  # approved, rejected, changes_requested
    reason: str
    override_reason: Optional[str] = None

class ApprovalDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    content_id: int
    revision_no: int
    decision: str
    reviewer_name: str
    reviewer_role: str
    reason: str
    override_reason: Optional[str] = None
    created_at: datetime.datetime

# Audit
class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    org_id: int
    actor_name: str
    actor_role: str
    action: str
    object_type: str
    object_id: str
    details: Optional[str] = None
    timestamp: datetime.datetime

# Analytics & Dashboard
class DashboardOverview(BaseModel):
    total_content_items: int
    pending_human_reviews: int
    approved_items: int
    rejected_items: int
    open_findings: int
    high_severity_open: int
    ai_mode_active: bool
    recent_activity: List[AuditEventResponse] = []
    common_violations: List[Dict[str, Any]] = []

class AnalyticsData(BaseModel):
    rules_triggered: List[Dict[str, Any]] = []
    findings_by_category: Dict[str, int] = {}
    findings_by_severity: Dict[str, int] = {}
    content_status_distribution: Dict[str, int] = {}
    suggestion_actions: Dict[str, int] = {}
    author_recurring_issues: List[Dict[str, Any]] = []
