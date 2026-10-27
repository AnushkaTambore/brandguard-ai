import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import ContentItem, ContentRevision, Finding, ApprovalDecision, AuditEvent
from app.schemas import ApprovalDecisionRequest, ApprovalDecisionResponse, ContentItemResponse
from app.routers.auth import get_current_user, require_role
from app.routers.content import get_item_summary

router = APIRouter(prefix="/api/workflow", tags=["Workflow & Approvals"])

@router.post("/{content_id}/submit-for-review", response_model=ContentItemResponse)
def submit_for_human_review(
    content_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits content item to the human review queue.
    """
    item = db.query(ContentItem).filter(ContentItem.id == content_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    item.status = "pending_human_review"
    item.updated_at = datetime.datetime.utcnow()

    audit = AuditEvent(
        org_id=current_user["org_id"],
        actor_name=current_user["name"],
        actor_role=current_user["role"],
        action="submitted_for_human_review",
        object_type="content_item",
        object_id=str(item.id),
        details=f"Item '{item.title}' routed to Human Review Queue by {current_user['name']}"
    )
    db.add(audit)
    db.commit()

    return get_item_summary(item, db)

@router.post("/{content_id}/decision", response_model=ApprovalDecisionResponse)
def make_approval_decision(
    content_id: int,
    payload: ApprovalDecisionRequest,
    current_user: dict = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Enforces human governance decision:
    - Only Reviewer or Admin can approve, request changes, or reject.
    - AI cannot approve.
    - High-severity unresolved findings block approval unless explicitly overridden with a written reason.
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
        raise HTTPException(status_code=400, detail="Cannot decide on an item without revisions")

    decision = payload.decision.lower().strip()
    if decision not in ["approved", "rejected", "changes_requested"]:
        raise HTTPException(status_code=400, detail="Decision must be 'approved', 'rejected', or 'changes_requested'")

    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="A detailed reviewer reason (minimum 5 characters) is required.")

    # High-severity unresolved findings check on APPROVAL
    if decision == "approved":
        unresolved_high = (
            db.query(Finding)
            .filter(
                Finding.revision_id == latest_rev.id,
                Finding.severity == "high",
                Finding.author_action.in_(["pending", "edited"])
            )
            .all()
        )

        if unresolved_high:
            if not payload.override_reason or len(payload.override_reason.strip()) < 10:
                violation_rules = ", ".join({f.rule_id for f in unresolved_high})
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Approval blocked: {len(unresolved_high)} high-severity finding(s) remain unresolved "
                        f"({violation_rules}). A formal written override justification (minimum 10 characters) "
                        f"is mandatory to approve with open high-severity findings."
                    )
                )

            # Record high severity override audit event
            override_audit = AuditEvent(
                org_id=current_user["org_id"],
                actor_name=current_user["name"],
                actor_role=current_user["role"],
                action="high_severity_override",
                object_type="content_item",
                object_id=str(item.id),
                details=f"Reviewer overrode {len(unresolved_high)} high-severity findings. Justification: '{payload.override_reason}'"
            )
            db.add(override_audit)

        item.status = "approved"

    elif decision == "rejected":
        item.status = "rejected"

    elif decision == "changes_requested":
        item.status = "needs_changes"

    item.updated_at = datetime.datetime.utcnow()

    # Save decision record
    decision_record = ApprovalDecision(
        content_id=item.id,
        revision_no=latest_rev.revision_no,
        decision=decision,
        reviewer_name=current_user["name"],
        reviewer_role=current_user["role"],
        reason=payload.reason.strip(),
        override_reason=payload.override_reason.strip() if payload.override_reason else None
    )
    db.add(decision_record)

    audit = AuditEvent(
        org_id=current_user["org_id"],
        actor_name=current_user["name"],
        actor_role=current_user["role"],
        action=f"decision_{decision}",
        object_type="content_item",
        object_id=str(item.id),
        details=f"Recorded '{decision}' decision for '{item.title}' (Revision {latest_rev.revision_no}). Reason: {payload.reason}"
    )
    db.add(audit)
    db.commit()
    db.refresh(decision_record)

    return decision_record

@router.get("/{content_id}/decisions", response_model=list[ApprovalDecisionResponse])
def get_item_decisions(content_id: int, db: Session = Depends(get_db)):
    return db.query(ApprovalDecision).filter(ApprovalDecision.content_id == content_id).order_by(desc(ApprovalDecision.created_at)).all()
