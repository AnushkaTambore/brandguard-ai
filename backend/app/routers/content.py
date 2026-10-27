import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import (
    ContentItem, ContentRevision, Finding, Rule, SourcePassage, SourceDocument, AuditEvent
)
from app.schemas import (
    ContentItemCreate, ContentItemResponse, ContentRevisionResponse,
    RevisionSaveRequest, RevisionCompareResponse, FindingResponse
)
from app.routers.auth import get_current_user
from app.engine.orchestrator import ReviewOrchestrator

router = APIRouter(prefix="/api/content", tags=["Content & Revisions"])

def get_item_summary(item: ContentItem, db: Session) -> ContentItemResponse:
    latest_rev = (
        db.query(ContentRevision)
        .filter(ContentRevision.content_id == item.id)
        .order_by(desc(ContentRevision.revision_no))
        .first()
    )

    open_findings = 0
    high_findings = 0
    latest_rev_resp = None

    if latest_rev:
        findings = db.query(Finding).filter(Finding.revision_id == latest_rev.id).all()
        open_findings = sum(1 for f in findings if f.author_action in ["pending", "edited"])
        high_findings = sum(1 for f in findings if f.severity == "high" and f.author_action in ["pending", "edited"])
        
        latest_rev_resp = ContentRevisionResponse(
            id=latest_rev.id,
            content_id=latest_rev.content_id,
            revision_no=latest_rev.revision_no,
            text=latest_rev.text,
            author_name=latest_rev.author_name,
            notes=latest_rev.notes or "",
            created_at=latest_rev.created_at,
            findings=[FindingResponse.model_validate(f) for f in findings]
        )

    rev_count = db.query(ContentRevision).filter(ContentRevision.content_id == item.id).count()

    return ContentItemResponse(
        id=item.id,
        org_id=item.org_id,
        title=item.title,
        content_type=item.content_type,
        audience=item.audience,
        status=item.status,
        created_by=item.created_by,
        created_at=item.created_at,
        updated_at=item.updated_at,
        latest_revision=latest_rev_resp,
        revisions_count=rev_count,
        open_findings_count=open_findings,
        high_severity_findings_count=high_findings
    )

@router.get("", response_model=List[ContentItemResponse])
def list_content_items(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    query = db.query(ContentItem)
    if status_filter:
        query = query.filter(ContentItem.status == status_filter)
    items = query.order_by(desc(ContentItem.updated_at)).all()
    return [get_item_summary(item, db) for item in items]

@router.get("/{content_id}", response_model=ContentItemResponse)
def get_content_item(content_id: int, db: Session = Depends(get_db)):
    item = db.query(ContentItem).filter(ContentItem.id == content_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")
    return get_item_summary(item, db)

@router.post("", response_model=ContentItemResponse)
def create_content_item(
    payload: ContentItemCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = ContentItem(
        org_id=current_user["org_id"],
        title=payload.title,
        content_type=payload.content_type,
        audience=payload.audience,
        status="draft",
        created_by=f"{current_user['name']} ({current_user['role'].title()})"
    )
    db.add(item)
    db.flush()

    # Create Revision 1
    rev = ContentRevision(
        content_id=item.id,
        revision_no=1,
        text=payload.text,
        author_name=current_user["name"],
        notes=payload.notes or "Initial draft submission"
    )
    db.add(rev)
    db.flush()
    item.current_revision_id = rev.id

    audit = AuditEvent(
        org_id=current_user["org_id"],
        actor_name=current_user["name"],
        actor_role=current_user["role"],
        action="content_submitted",
        object_type="content_item",
        object_id=str(item.id),
        details=f"Created content draft '{item.title}' (Revision 1, {len(payload.text.split())} words)"
    )
    db.add(audit)
    db.commit()

    return get_item_summary(item, db)

@router.post("/{content_id}/review", response_model=ContentItemResponse)
async def execute_content_review(
    content_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes the full BrandGuard AI review pipeline on the latest revision of the content item.
    """
    item = db.query(ContentItem).filter(ContentItem.id == content_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    latest_rev = (
        db.query(ContentRevision)
        .filter(ContentRevision.content_id == item.id)
        .order_by(desc(ContentRevision.revision_no))
        .first()
    )
    if not latest_rev:
        raise HTTPException(status_code=400, detail="Content item has no revisions")

    # Fetch active rules
    active_rules = db.query(Rule).filter(Rule.status == "active").all()

    # Fetch approved passages
    passages = db.query(SourcePassage).join(SourceDocument).all()
    approved_passages_data = [
        {
            "passage_identifier": p.passage_identifier,
            "title": p.document.title if p.document else "",
            "text": p.text
        }
        for p in passages
    ]

    # Run review pipeline
    verified_findings = await ReviewOrchestrator.run_review_pipeline(
        text=latest_rev.text,
        content_type=item.content_type,
        audience=item.audience,
        active_rules=active_rules,
        approved_passages=approved_passages_data,
        approved_facts=[],
        approved_claims=[]
    )

    # Clear previous findings on this revision if re-running
    db.query(Finding).filter(Finding.revision_id == latest_rev.id).delete()

    # Save new verified findings
    for f in verified_findings:
        finding_obj = Finding(
            finding_id=f["finding_id"],
            revision_id=latest_rev.id,
            category=f["category"],
            start_char=f["start_char"],
            end_char=f["end_char"],
            flagged_text=f["flagged_text"],
            rule_id=f["rule_id"],
            rule_description=f["rule_description"],
            evidence_source=f.get("evidence_source"),
            evidence_passage_id=f.get("evidence_passage_id"),
            reason=f["reason"],
            severity=f["severity"],
            confidence_level=f["confidence_level"],
            suggestion=f["suggestion"],
            author_action="pending",
            dismissal_reason=None
        )
        finding_obj.confidence_basis = f.get("confidence_basis", [])
        db.add(finding_obj)

    # Update item status
    item.status = "needs_changes" if verified_findings else "pending_human_review"
    item.updated_at = datetime.datetime.utcnow()

    audit = AuditEvent(
        org_id=current_user["org_id"],
        actor_name=current_user["name"],
        actor_role=current_user["role"],
        action="review_executed",
        object_type="content_item",
        object_id=str(item.id),
        details=f"Ran governance review on Revision {latest_rev.revision_no}: generated {len(verified_findings)} verified findings"
    )
    db.add(audit)
    db.commit()

    return get_item_summary(item, db)

@router.post("/{content_id}/revisions", response_model=ContentItemResponse)
def save_new_revision(
    content_id: int,
    payload: RevisionSaveRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Saves a revised version of content without overwriting previous revisions.
    Incrementing revision number and logging event.
    """
    item = db.query(ContentItem).filter(ContentItem.id == content_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    latest_rev = (
        db.query(ContentRevision)
        .filter(ContentRevision.content_id == item.id)
        .order_by(desc(ContentRevision.revision_no))
        .first()
    )
    next_rev_no = (latest_rev.revision_no + 1) if latest_rev else 1

    new_rev = ContentRevision(
        content_id=item.id,
        revision_no=next_rev_no,
        text=payload.text,
        author_name=current_user["name"],
        notes=payload.notes or f"Revision {next_rev_no} saved by {current_user['name']}"
    )
    db.add(new_rev)
    db.flush()

    item.current_revision_id = new_rev.id
    item.status = "draft"
    item.updated_at = datetime.datetime.utcnow()

    audit = AuditEvent(
        org_id=current_user["org_id"],
        actor_name=current_user["name"],
        actor_role=current_user["role"],
        action="revision_created",
        object_type="content_revision",
        object_id=str(new_rev.id),
        details=f"Saved Revision {next_rev_no} for '{item.title}' (Notes: {new_rev.notes})"
    )
    db.add(audit)
    db.commit()

    return get_item_summary(item, db)

@router.get("/{content_id}/revisions", response_model=List[ContentRevisionResponse])
def get_revision_history(content_id: int, db: Session = Depends(get_db)):
    revisions = (
        db.query(ContentRevision)
        .filter(ContentRevision.content_id == content_id)
        .order_by(desc(ContentRevision.revision_no))
        .all()
    )
    results = []
    for r in revisions:
        findings = db.query(Finding).filter(Finding.revision_id == r.id).all()
        results.append(ContentRevisionResponse(
            id=r.id,
            content_id=r.content_id,
            revision_no=r.revision_no,
            text=r.text,
            author_name=r.author_name,
            notes=r.notes or "",
            created_at=r.created_at,
            findings=[FindingResponse.model_validate(f) for f in findings]
        ))
    return results

@router.get("/{content_id}/compare", response_model=RevisionCompareResponse)
def compare_revisions(
    content_id: int,
    rev_a: int = Query(1),
    rev_b: int = Query(2),
    db: Session = Depends(get_db)
):
    rev1 = db.query(ContentRevision).filter(ContentRevision.content_id == content_id, ContentRevision.revision_no == rev_a).first()
    rev2 = db.query(ContentRevision).filter(ContentRevision.content_id == content_id, ContentRevision.revision_no == rev_b).first()

    if not rev1 or not rev2:
        raise HTTPException(status_code=404, detail="One or both revisions not found")

    rev1_findings_count = db.query(Finding).filter(Finding.revision_id == rev1.id).count()
    rev2_findings_count = db.query(Finding).filter(Finding.revision_id == rev2.id).count()

    return RevisionCompareResponse(
        content_id=content_id,
        rev_a_no=rev1.revision_no,
        rev_b_no=rev2.revision_no,
        rev_a_text=rev1.text,
        rev_b_text=rev2.text,
        rev_a_findings_count=rev1_findings_count,
        rev_b_findings_count=rev2_findings_count
    )
