import datetime
import json
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="organization")
    sources = relationship("SourceDocument", back_populates="organization")
    rules = relationship("Rule", back_populates="organization")
    content_items = relationship("ContentItem", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(String(50), nullable=False)  # creator, reviewer, brand_manager, admin
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="users")


class SourceDocument(Base):
    __tablename__ = "source_documents"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    title = Column(String(200), nullable=False)
    document_type = Column(String(50), nullable=False)  # guidelines, terminology, claims, fact_sheet
    version = Column(String(20), default="1.0")
    confidentiality = Column(String(50), default="internal")  # public, internal, confidential
    file_name = Column(String(255), nullable=True)
    raw_text = Column(Text, nullable=False)
    uploaded_by = Column(String(100), default="Sahil Sakhare (Admin)")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="sources")
    passages = relationship("SourcePassage", back_populates="document", cascade="all, delete-orphan")


class SourcePassage(Base):
    __tablename__ = "source_passages"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("source_documents.id"), nullable=False)
    passage_identifier = Column(String(50), index=True, nullable=False)  # e.g. P-101, CLM-3.4, FACT-12
    section_title = Column(String(200), default="")
    text = Column(Text, nullable=False)
    position = Column(Integer, default=0)

    document = relationship("SourceDocument", back_populates="passages")


class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. BG-CLM-004
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    category = Column(String(50), nullable=False)  # terminology, claims, tone, factual, accessibility
    severity = Column(String(20), nullable=False)  # high, medium, low
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    examples_do_json = Column(Text, default="[]")
    examples_dont_json = Column(Text, default="[]")
    source_passage_identifier = Column(String(50), nullable=True)  # link to passage
    source_title = Column(String(200), nullable=True)
    status = Column(String(20), default="active")  # draft, active, inactive
    pattern = Column(String(500), nullable=True)  # regex or phrase
    replacement_suggestion = Column(String(500), nullable=True)
    version = Column(Integer, default=1)
    created_by = Column(String(100), default="Brand Manager")
    approved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="rules")

    @property
    def examples_do(self):
        try:
            return json.loads(self.examples_do_json or "[]")
        except:
            return []

    @examples_do.setter
    def examples_do(self, value):
        self.examples_do_json = json.dumps(value or [])

    @property
    def examples_dont(self):
        try:
            return json.loads(self.examples_dont_json or "[]")
        except:
            return []

    @examples_dont.setter
    def examples_dont(self, value):
        self.examples_dont_json = json.dumps(value or [])


class ContentItem(Base):
    __tablename__ = "content_items"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    title = Column(String(255), nullable=False)
    content_type = Column(String(50), nullable=False)  # social_post, email, brochure
    audience = Column(String(100), default="General Public")
    status = Column(String(50), default="draft")  # draft, in_review, needs_changes, pending_human_review, approved, rejected
    created_by = Column(String(100), default="Anushka Tambore (Creator)")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="content_items")
    revisions = relationship("ContentRevision", back_populates="content_item", cascade="all, delete-orphan", order_by="ContentRevision.revision_no")
    comments = relationship("Comment", back_populates="content_item", cascade="all, delete-orphan")
    decisions = relationship("ApprovalDecision", back_populates="content_item", cascade="all, delete-orphan")


class ContentRevision(Base):
    __tablename__ = "content_revisions"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("content_items.id"), nullable=False)
    revision_no = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    author_name = Column(String(100), default="Creator")
    notes = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    content_item = relationship("ContentItem", back_populates="revisions")
    findings = relationship("Finding", back_populates="revision", cascade="all, delete-orphan")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    finding_id = Column(String(50), index=True, nullable=False)  # e.g. F-0142
    revision_id = Column(Integer, ForeignKey("content_revisions.id"), nullable=False)
    category = Column(String(50), nullable=False)  # unsupported_claim, banned_term, preferred_term, tone_violation, unverified_fact, accessibility_issue
    start_char = Column(Integer, nullable=False)
    end_char = Column(Integer, nullable=False)
    flagged_text = Column(String(500), nullable=False)
    rule_id = Column(String(50), nullable=False)
    rule_description = Column(Text, nullable=False)
    evidence_source = Column(String(255), nullable=True)
    evidence_passage_id = Column(String(50), nullable=True)
    reason = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False)  # high, medium, low
    confidence_level = Column(String(20), nullable=False)  # high, medium_high, medium, low
    confidence_basis_json = Column(Text, default='["pattern_match"]')
    suggestion = Column(Text, nullable=False)  # suggested replacement text
    author_action = Column(String(20), default="pending")  # pending, accepted, edited, dismissed
    dismissal_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    revision = relationship("ContentRevision", back_populates="findings")

    @property
    def confidence_basis(self):
        try:
            return json.loads(self.confidence_basis_json or "[]")
        except:
            return []

    @confidence_basis.setter
    def confidence_basis(self, value):
        self.confidence_basis_json = json.dumps(value or [])


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("content_items.id"), nullable=False)
    revision_no = Column(Integer, nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    author_name = Column(String(100), nullable=False)
    author_role = Column(String(50), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    content_item = relationship("ContentItem", back_populates="comments")
    replies = relationship("Comment", backref="parent", remote_side=[id])


class ApprovalDecision(Base):
    __tablename__ = "approval_decisions"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("content_items.id"), nullable=False)
    revision_no = Column(Integer, nullable=False)
    decision = Column(String(50), nullable=False)  # approved, rejected, changes_requested
    reviewer_name = Column(String(100), nullable=False)
    reviewer_role = Column(String(50), nullable=False)
    reason = Column(Text, nullable=False)
    override_reason = Column(Text, nullable=True)  # required if approved with unresolved high severity findings
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    content_item = relationship("ContentItem", back_populates="decisions")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False)
    actor_name = Column(String(100), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    object_type = Column(String(50), nullable=False)
    object_id = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
