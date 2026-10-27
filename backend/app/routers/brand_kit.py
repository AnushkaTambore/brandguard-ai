import io
import re
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SourceDocument, SourcePassage, Rule, AuditEvent
from app.schemas import (
    SourceDocumentResponse, SourceDocumentDetail, SourceDocumentCreate,
    RuleResponse, RuleCreate, RuleUpdate, RuleExtractRequest
)
from app.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/api/brand-kit", tags=["Brand Kit"])

def split_into_passages(text: str) -> List[dict]:
    """
    Splits long raw text into numbered, meaningful passages based on sections/paragraphs.
    """
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    passages = []
    for i, p in enumerate(paragraphs, start=1):
        lines = p.splitlines()
        first_line = lines[0].strip() if lines else f"Section {i}"
        title = first_line[:60] if len(first_line) <= 60 else f"Section {i}"
        passages.append({
            "passage_identifier": f"P-{i:03d}",
            "section_title": title,
            "text": p,
            "position": i
        })
    return passages

# ----------------- SOURCES & DOCUMENTS -----------------

@router.get("/sources", response_model=List[SourceDocumentResponse])
def get_sources(db: Session = Depends(get_db)):
    docs = db.query(SourceDocument).all()
    results = []
    for d in docs:
        resp = SourceDocumentResponse(
            id=d.id,
            org_id=d.org_id,
            title=d.title,
            document_type=d.document_type,
            version=d.version,
            confidentiality=d.confidentiality,
            file_name=d.file_name,
            uploaded_by=d.uploaded_by,
            created_at=d.created_at,
            passages_count=len(d.passages)
        )
        results.append(resp)
    return results

@router.get("/sources/{source_id}", response_model=SourceDocumentDetail)
def get_source_detail(source_id: int, db: Session = Depends(get_db)):
    doc = db.query(SourceDocument).filter(SourceDocument.id == source_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Source document not found")
    return doc

@router.post("/sources/text", response_model=SourceDocumentResponse)
def create_source_text(
    payload: SourceDocumentCreate,
    current_user: dict = Depends(require_role(["brand_manager", "admin"])),
    db: Session = Depends(get_db)
):
    doc = SourceDocument(
        org_id=current_user["org_id"],
        title=payload.title,
        document_type=payload.document_type,
        version=payload.version,
        confidentiality=payload.confidentiality,
        file_name=payload.file_name or "manual_entry.txt",
        raw_text=payload.raw_text,
        uploaded_by=f"{current_user['name']} ({current_user['role'].title()})"
    )
    db.add(doc)
    db.flush()

    # Split into passages
    passages_data = split_into_passages(payload.raw_text)
    for p in passages_data:
        passage = SourcePassage(
            source_id=doc.id,
            passage_identifier=p["passage_identifier"],
            section_title=p["section_title"],
            text=p["text"],
            position=p["position"]
        )
        db.add(passage)

    audit = AuditEvent(
        org_id=current_user["org_id"],
        actor_name=current_user["name"],
        actor_role=current_user["role"],
        action="source_uploaded",
        object_type="source_document",
        object_id=str(doc.id),
        details=f"Added brand source '{doc.title}' ({len(passages_data)} passages created)"
    )
    db.add(audit)
    db.commit()
    db.refresh(doc)

    return SourceDocumentResponse(
        id=doc.id,
        org_id=doc.org_id,
        title=doc.title,
        document_type=doc.document_type,
        version=doc.version,
        confidentiality=doc.confidentiality,
        file_name=doc.file_name,
        uploaded_by=doc.uploaded_by,
        created_at=doc.created_at,
        passages_count=len(passages_data)
    )

@router.post("/sources/upload", response_model=SourceDocumentResponse)
async def upload_source_file(
    title: str = Form(...),
    document_type: str = Form(...),
    version: str = Form("1.0"),
    confidentiality: str = Form("internal"),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["brand_manager", "admin"])),
    db: Session = Depends(get_db)
):
    content = await file.read()
    filename = file.filename or "uploaded_doc"
    raw_text = ""

    # Parse based on file extension
    if filename.lower().endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            extracted_pages = [page.extract_text() or "" for page in reader.pages]
            raw_text = "\n\n".join(extracted_pages).strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF document: {str(e)}. Please paste text manually.")
    elif filename.lower().endswith(".docx"):
        try:
            import docx
            doc_obj = docx.Document(io.BytesIO(content))
            raw_text = "\n\n".join([p.text for p in doc_obj.paragraphs if p.text.strip()])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse DOCX document: {str(e)}. Please paste text manually.")
    else:
        # Assume text/markdown
        try:
            raw_text = content.decode("utf-8")
        except UnicodeDecodeError:
            raw_text = content.decode("latin-1", errors="ignore")

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="The uploaded document contains no readable text. Please paste text manually.")

    doc = SourceDocument(
        org_id=current_user["org_id"],
        title=title,
        document_type=document_type,
        version=version,
        confidentiality=confidentiality,
        file_name=filename,
        raw_text=raw_text,
        uploaded_by=f"{current_user['name']} ({current_user['role'].title()})"
    )
    db.add(doc)
    db.flush()

    passages_data = split_into_passages(raw_text)
    for p in passages_data:
        passage = SourcePassage(
            source_id=doc.id,
            passage_identifier=p["passage_identifier"],
            section_title=p["section_title"],
            text=p["text"],
            position=p["position"]
        )
        db.add(passage)

    audit = AuditEvent(
        org_id=current_user["org_id"],
        actor_name=current_user["name"],
        actor_role=current_user["role"],
        action="source_uploaded",
        object_type="source_document",
        object_id=str(doc.id),
        details=f"Uploaded document '{filename}' as '{title}' ({len(passages_data)} passages extracted)"
    )
    db.add(audit)
    db.commit()
    db.refresh(doc)

    return SourceDocumentResponse(
        id=doc.id,
        org_id=doc.org_id,
        title=doc.title,
        document_type=doc.document_type,
        version=doc.version,
        confidentiality=doc.confidentiality,
        file_name=doc.file_name,
        uploaded_by=doc.uploaded_by,
        created_at=doc.created_at,
        passages_count=len(passages_data)
    )

# ----------------- RULES CRUD & EXTRACTION -----------------

@router.get("/rules", response_model=List[RuleResponse])
def list_rules(category: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Rule)
    if category:
        query = query.filter(Rule.category == category)
    if status:
        query = query.filter(Rule.status == status)
    return query.order_by(Rule.id.asc()).all()

@router.post("/rules", response_model=RuleResponse)
def create_rule(
    payload: RuleCreate,
    current_user: dict = Depends(require_role(["brand_manager", "admin"])),
    db: Session = Depends(get_db)
):
    existing = db.query(Rule).filter(Rule.rule_id == payload.rule_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Rule ID '{payload.rule_id}' already exists")

    rule = Rule(
        rule_id=payload.rule_id,
        org_id=current_user["org_id"],
        category=payload.category,
        severity=payload.severity,
        title=payload.title,
        description=payload.description,
        source_passage_identifier=payload.source_passage_identifier,
        source_title=payload.source_title,
        status="active" if current_user["role"] in ["brand_manager", "admin"] and payload.status == "active" else "draft",
        pattern=payload.pattern,
        replacement_suggestion=payload.replacement_suggestion,
        created_by=f"{current_user['name']} ({current_user['role']})",
        approved_by=current_user["name"] if payload.status == "active" else None
    )
    rule.examples_do = payload.examples_do
    rule.examples_dont = payload.examples_dont

    db.add(rule)
    db.flush()

    audit = AuditEvent(
        org_id=current_user["org_id"],
        actor_name=current_user["name"],
        actor_role=current_user["role"],
        action="rule_created",
        object_type="rule",
        object_id=rule.rule_id,
        details=f"Created rule {rule.rule_id} ({rule.title}) in status '{rule.status}'"
    )
    db.add(audit)
    db.commit()
    db.refresh(rule)
    return rule

@router.patch("/rules/{rule_id}", response_model=RuleResponse)
def update_rule(
    rule_id: str,
    payload: RuleUpdate,
    current_user: dict = Depends(require_role(["brand_manager", "admin"])),
    db: Session = Depends(get_db)
):
    rule = db.query(Rule).filter(Rule.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    old_status = rule.status
    if payload.category is not None:
        rule.category = payload.category
    if payload.severity is not None:
        rule.severity = payload.severity
    if payload.title is not None:
        rule.title = payload.title
    if payload.description is not None:
        rule.description = payload.description
    if payload.examples_do is not None:
        rule.examples_do = payload.examples_do
    if payload.examples_dont is not None:
        rule.examples_dont = payload.examples_dont
    if payload.pattern is not None:
        rule.pattern = payload.pattern
    if payload.replacement_suggestion is not None:
        rule.replacement_suggestion = payload.replacement_suggestion
    if payload.status is not None:
        rule.status = payload.status
        if payload.status == "active" and old_status != "active":
            rule.approved_by = current_user["name"]

    rule.version += 1

    audit = AuditEvent(
        org_id=current_user["org_id"],
        actor_name=current_user["name"],
        actor_role=current_user["role"],
        action="rule_activated" if payload.status == "active" else "rule_updated",
        object_type="rule",
        object_id=rule.rule_id,
        details=f"Updated rule {rule.rule_id} status to '{rule.status}' by {current_user['name']}"
    )
    db.add(audit)
    db.commit()
    db.refresh(rule)
    return rule

@router.post("/rules/extract", response_model=List[RuleResponse])
def extract_draft_rules(
    payload: RuleExtractRequest,
    current_user: dict = Depends(require_role(["brand_manager", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Parses guidelines and drafts atomic candidate rules.
    Crucially: Extracted rules are saved as 'draft' (inactive) until Brand Manager confirms them!
    """
    raw_text = payload.raw_text or ""
    source_title = payload.document_title or "Brand Guidelines"
    source_passage = "P-EXTRACT"

    if payload.document_id:
        doc = db.query(SourceDocument).filter(SourceDocument.id == payload.document_id).first()
        if doc:
            raw_text = doc.raw_text
            source_title = doc.title
            if doc.passages:
                source_passage = doc.passages[0].passage_identifier

    # Heuristic extraction of prescriptive statements (Do / Don't / Must / Never)
    draft_rules: List[Rule] = []
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    rule_idx = db.query(Rule).count() + 1
    for line in lines:
        lower = line.lower()
        if "never use" in lower or "prohibited" in lower or "do not" in lower:
            rule_id = f"BG-DRAFT-{rule_idx:03d}"
            rule = Rule(
                rule_id=rule_id,
                org_id=current_user["org_id"],
                category="terminology" if "term" in lower or "word" in lower else "tone",
                severity="medium",
                title=f"Extracted Guideline: {line[:50]}...",
                description=f"Automated draft rule from guideline: '{line}'. Needs Brand Manager review.",
                examples_do_json='[]',
                examples_dont_json=f'["{line}"]',
                source_passage_identifier=source_passage,
                source_title=source_title,
                status="draft",  # INACTIVE until Brand Manager confirmation!
                pattern=None,
                replacement_suggestion=None,
                created_by="Automated Extractor",
                approved_by=None
            )
            db.add(rule)
            draft_rules.append(rule)
            rule_idx += 1
            if len(draft_rules) >= 3:
                break

    if not draft_rules:
        # Create a sample draft rule for demonstration
        rule_id = f"BG-DRAFT-{rule_idx:03d}"
        rule = Rule(
            rule_id=rule_id,
            org_id=current_user["org_id"],
            category="tone",
            severity="low",
            title="Draft: Avoid Superfluous Adverbs ('very', 'really')",
            description="Draft rule extracted from style guide: eliminate filler adverbs in brand copy.",
            examples_do_json='["Acme delivers swiftly."]',
            examples_dont_json='["Acme delivers very really fast."]',
            source_passage_identifier=source_passage,
            source_title=source_title,
            status="draft",
            pattern=r"(?i)\b(very\s+really|super\s+fast)\b",
            replacement_suggestion="swiftly",
            created_by="Automated Extractor",
            approved_by=None
        )
        db.add(rule)
        draft_rules.append(rule)

    db.commit()
    for r in draft_rules:
        db.refresh(r)

    audit = AuditEvent(
        org_id=current_user["org_id"],
        actor_name=current_user["name"],
        actor_role=current_user["role"],
        action="rules_extracted",
        object_type="rule",
        object_id="batch",
        details=f"Extracted {len(draft_rules)} candidate draft rules from '{source_title}' awaiting Brand Manager activation"
    )
    db.add(audit)
    db.commit()

    return draft_rules
