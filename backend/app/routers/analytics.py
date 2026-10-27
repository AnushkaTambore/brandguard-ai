from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models import ContentItem, Finding, ContentRevision, AuditEvent, Rule
from app.schemas import DashboardOverview, AnalyticsData, AuditEventResponse
from app.config import settings

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Dashboard"])

@router.get("/dashboard", response_model=DashboardOverview)
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_items = db.query(ContentItem).count()
    pending_human = db.query(ContentItem).filter(ContentItem.status == "pending_human_review").count()
    approved = db.query(ContentItem).filter(ContentItem.status == "approved").count()
    rejected = db.query(ContentItem).filter(ContentItem.status == "rejected").count()

    open_findings = db.query(Finding).filter(Finding.author_action.in_(["pending", "edited"])).count()
    high_open = db.query(Finding).filter(Finding.severity == "high", Finding.author_action.in_(["pending", "edited"])).count()

    # Recent activity
    recent_events = db.query(AuditEvent).order_by(desc(AuditEvent.timestamp)).limit(8).all()
    recent_activity = [AuditEventResponse.model_validate(e) for e in recent_events]

    # Common violations
    violation_query = (
        db.query(Finding.rule_id, Finding.category, func.count(Finding.id).label("count"))
        .group_by(Finding.rule_id, Finding.category)
        .order_by(desc("count"))
        .limit(5)
        .all()
    )
    common_violations = [
        {"rule_id": r[0], "category": r[1], "count": r[2]}
        for r in violation_query
    ]

    return DashboardOverview(
        total_content_items=total_items,
        pending_human_reviews=pending_human,
        approved_items=approved,
        rejected_items=rejected,
        open_findings=open_findings,
        high_severity_open=high_open,
        ai_mode_active=bool(settings.AI_API_KEY.strip()),
        recent_activity=recent_activity,
        common_violations=common_violations
    )

@router.get("/metrics", response_model=AnalyticsData)
def get_analytics_metrics(db: Session = Depends(get_db)):
    # 1. Rules triggered
    rules_triggered_raw = (
        db.query(Finding.rule_id, Finding.rule_description, Finding.severity, func.count(Finding.id).label("hits"))
        .group_by(Finding.rule_id, Finding.rule_description, Finding.severity)
        .order_by(desc("hits"))
        .limit(10)
        .all()
    )
    rules_triggered = [
        {"rule_id": r[0], "description": r[1], "severity": r[2], "hits": r[3]}
        for r in rules_triggered_raw
    ]

    # 2. Findings by category
    category_counts_raw = (
        db.query(Finding.category, func.count(Finding.id))
        .group_by(Finding.category)
        .all()
    )
    findings_by_category = {cat: count for cat, count in category_counts_raw}

    # 3. Findings by severity
    severity_counts_raw = (
        db.query(Finding.severity, func.count(Finding.id))
        .group_by(Finding.severity)
        .all()
    )
    findings_by_severity = {sev: count for sev, count in severity_counts_raw}

    # 4. Content status distribution
    status_counts_raw = (
        db.query(ContentItem.status, func.count(ContentItem.id))
        .group_by(ContentItem.status)
        .all()
    )
    content_status_distribution = {st: count for st, count in status_counts_raw}

    # 5. Suggestion actions
    action_counts_raw = (
        db.query(Finding.author_action, func.count(Finding.id))
        .group_by(Finding.author_action)
        .all()
    )
    suggestion_actions = {act: count for act, count in action_counts_raw}

    # 6. Author recurring issues
    recurring_raw = (
        db.query(ContentRevision.author_name, Finding.category, func.count(Finding.id).label("count"))
        .join(Finding, Finding.revision_id == ContentRevision.id)
        .group_by(ContentRevision.author_name, Finding.category)
        .order_by(desc("count"))
        .limit(5)
        .all()
    )
    author_recurring_issues = [
        {"author_name": r[0], "category": r[1], "count": r[2]}
        for r in recurring_raw
    ]

    return AnalyticsData(
        rules_triggered=rules_triggered,
        findings_by_category=findings_by_category,
        findings_by_severity=findings_by_severity,
        content_status_distribution=content_status_distribution,
        suggestion_actions=suggestion_actions,
        author_recurring_issues=author_recurring_issues
    )
