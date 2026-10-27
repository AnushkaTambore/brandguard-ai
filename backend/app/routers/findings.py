from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Finding, ContentRevision, AuditEvent
from app.schemas import FindingResponse, FindingActionRequest
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/findings", tags=["Findings & Suggestions"])

@router.post("/{finding_id}/action", response_model=FindingResponse)
def act_on_finding(
    finding_id: int,
    payload: FindingActionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    revision = db.query(ContentRevision).filter(ContentRevision.id == finding.revision_id).first()

    action = payload.action.lower()

    if action == "accept":
        finding.author_action = "accepted"
        # Apply replacement into revision text if span matches
        if revision and finding.flagged_text in revision.text:
            revision.text = revision.text.replace(finding.flagged_text, finding.suggestion, 1)

        audit_msg = f"Accepted suggested replacement '{finding.suggestion}' for '{finding.flagged_text}' (Rule {finding.rule_id})"

    elif action == "edit":
        if not payload.edited_text or not payload.edited_text.strip():
            raise HTTPException(status_code=400, detail="Edited replacement text cannot be empty")
        
        finding.author_action = "edited"
        old_suggestion = finding.suggestion
        finding.suggestion = payload.edited_text.strip()
        
        if revision and finding.flagged_text in revision.text:
            revision.text = revision.text.replace(finding.flagged_text, finding.suggestion, 1)

        audit_msg = f"Applied custom replacement '{finding.suggestion}' for '{finding.flagged_text}' (was: '{old_suggestion}')"

    elif action == "dismiss":
        # Mandatory written dismissal reason is strictly required!
        if not payload.dismissal_reason or len(payload.dismissal_reason.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid written reason (minimum 5 characters) is mandatory to dismiss a brand finding."
            )
        finding.author_action = "dismissed"
        finding.dismissal_reason = payload.dismissal_reason.strip()
        audit_msg = f"Dismissed finding {finding.finding_id} ({finding.rule_id}): Reason: '{finding.dismissal_reason}'"

    else:
        raise HTTPException(status_code=400, detail=f"Invalid action '{action}'. Must be accept, edit, or dismiss.")

    audit = AuditEvent(
        org_id=current_user["org_id"],
        actor_name=current_user["name"],
        actor_role=current_user["role"],
        action=f"finding_{action}",
        object_type="finding",
        object_id=finding.finding_id,
        details=audit_msg
    )
    db.add(audit)
    db.commit()
    db.refresh(finding)

    return finding
