from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import Comment, ContentItem, ContentRevision, AuditEvent
from app.schemas import CommentCreate, CommentResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/comments", tags=["Comments"])

@router.get("/{content_id}", response_model=List[CommentResponse])
def get_comments(content_id: int, db: Session = Depends(get_db)):
    top_level = (
        db.query(Comment)
        .filter(Comment.content_id == content_id, Comment.parent_id == None)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return top_level

@router.post("/{content_id}", response_model=CommentResponse)
def post_comment(
    content_id: int,
    payload: CommentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(ContentItem).filter(ContentItem.id == content_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    latest_rev = (
        db.query(ContentRevision)
        .filter(ContentRevision.content_id == item.id)
        .order_by(desc(ContentRevision.revision_no))
        .first()
    )
    rev_no = latest_rev.revision_no if latest_rev else 1

    comment = Comment(
        content_id=item.id,
        revision_no=rev_no,
        parent_id=payload.parent_id,
        author_name=current_user["name"],
        author_role=current_user["role"],
        body=payload.body.strip()
    )
    db.add(comment)
    db.flush()

    audit = AuditEvent(
        org_id=current_user["org_id"],
        actor_name=current_user["name"],
        actor_role=current_user["role"],
        action="comment_added",
        object_type="comment",
        object_id=str(comment.id),
        details=f"Added comment on '{item.title}' (Revision {rev_no})"
    )
    db.add(audit)
    db.commit()
    db.refresh(comment)

    return comment
