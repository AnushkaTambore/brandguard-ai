# BrandGuard AI — System Architecture & Technical Specifications

**Team Dashing Cars** | Inkloom AI Hackathon Round 2

---

## 1. High-Level Architecture Overview

BrandGuard AI is architected as an explainable, human-governed brand compliance platform. It bridges the gap between static brand guideline PDFs and dynamic content publication by evaluating marketing, social, and product copy against versioned approved sources, registered claims, and verified corporate facts.

```mermaid
flowchart TD
    subgraph Frontend ["Frontend (React 19 + TypeScript + Vite)"]
        UI_Dash["Dashboard & KPIs"]
        UI_Brand["Brand Kit & Rules Manager"]
        UI_Workspace["Review Workspace & Highlighter"]
        UI_Queue["Human Review Queue & Decision Modal"]
        UI_Diff["Revision History & Diff Viewer"]
        UI_Audit["Append-Only Audit Log"]
    end

    subgraph API ["Backend API (FastAPI)"]
        Router_Auth["Auth & Role Guard (Header Enforced)"]
        Router_Brand["Brand Kit & Ingestion (TXT/PDF/DOCX)"]
        Router_Content["Content & Revision Store"]
        Router_Workflow["Workflow State Machine"]
        Router_Analytics["Analytics & Audit Queries"]
    end

    subgraph ReviewEngine ["Hybrid Governance Review Engine"]
        Engine_Segment["1. Text Segmenter & Char Offsets"]
        Engine_Determ["2. Deterministic Rule Matcher (Regex, Terms, Claims, Numbers)"]
        Engine_Retrieve["3. Source Passage Retriever (BM25)"]
        Engine_LLM["4. Tone & Nuance Analyzer (External LLM or Fallback Heuristics)"]
        Engine_Verify["5. Independent Verifier & Scorer (Span & Citation Checker)"]
    end

    subgraph Storage ["Persistent Database (SQLite / PostgreSQL)"]
        DB_Sources["Sources & Passages"]
        DB_Rules["Rules (Draft & Active)"]
        DB_Items["Content & Immutable Revisions"]
        DB_Findings["Evidence-Linked Findings"]
        DB_Decisions["Approval Decisions & Overrides"]
        DB_Audit["Cryptographic Audit Trail"]
    end

    Frontend -->|REST / JSON| API
    Router_Content --> ReviewEngine
    ReviewEngine --> Storage
    API --> Storage
```

---

## 2. Review Pipeline Execution Flow

Every review request undergoes a strict 5-stage pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor Creator as Content Creator
    participant API as Review Orchestrator
    participant Determ as Deterministic Engine
    participant BM25 as Passage Retriever
    participant LLM as LLM / Heuristic Analyzer
    participant Verifier as Verifier & Scorer
    participant DB as Persistent DB

    Creator->>API: Submit Text for Review
    API->>Determ: Execute Deterministic Checks (Banned terms, superlatives, guarantees, unverified facts)
    Determ-->>API: Raw Deterministic Findings
    API->>BM25: Query Top-K Approved Passages matching Content
    BM25-->>API: Retrieved Passages (Passage IDs & Excerpts)
    API->>LLM: Pass Content as Data + Retrieved Passages
    LLM-->>API: Nuanced Tone & Clarity Candidate Findings
    API->>Verifier: Pass Combined Raw Findings
    Note over Verifier: 1. Confirm flagged_text exists in content<br/>2. Verify passage ID exists in database<br/>3. Purge hallucinated citations<br/>4. Sanitize suggested fixes<br/>5. Calculate honest confidence level
    Verifier-->>API: Verified Findings
    API->>DB: Store Findings linked to Revision & Log Audit Event
    API-->>Creator: Return Verified Finding Cards & Text Highlights
```

---

## 3. Workflow State Machine & Human Control Points

BrandGuard AI strictly enforces that **AI can only recommend; only humans can decide.**

```mermaid
stateDiagram-v2
    [*] --> Draft: Content Created
    Draft --> InReview: Trigger Automated Review
    InReview --> NeedsChanges: Findings Detected
    InReview --> PendingHumanReview: Zero Findings Detected
    NeedsChanges --> Draft: Author Modifies & Saves Revision
    NeedsChanges --> PendingHumanReview: Author Submits to Review Queue
    
    state "Pending Human Review" as PendingHumanReview {
        [*] --> InQueue
        InQueue --> InspectFindings
        InspectFindings --> AddComments
    }

    PendingHumanReview --> Approved: Reviewer Approves (Override required if High Severity open)
    PendingHumanReview --> Rejected: Reviewer Rejects (Mandatory Reason)
    PendingHumanReview --> NeedsChanges: Reviewer Requests Changes

    Approved --> [*]
    Rejected --> [*]
```

### Critical Human Oversight Rules:
1. **Approval Privilege**: Only users in the `reviewer` or `admin` role can approve or reject. The API rejects approval requests from other roles with `HTTP 403 Forbidden`.
2. **High-Severity Approval Block**: If open high-severity findings exist on the active revision, the backend rejects the approval with `HTTP 400 Bad Request` unless the reviewer explicitly supplies a written `override_reason` (minimum 10 characters).
3. **Auditability of Overrides**: Every high-severity override is logged as a dedicated `high_severity_override` event in the append-only audit trail.
4. **Mandatory Dismissal Justification**: Authors cannot silently dismiss findings; a written explanation is required for audit compliance.
5. **Brand Manager Rule Gate**: Extracted or drafted rules remain in `draft` status (inactive) until explicitly approved and activated by a Brand Manager.

---

## 4. Entity-Relationship Data Model

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : contains
    ORGANIZATION ||--o{ SOURCE_DOCUMENT : owns
    ORGANIZATION ||--o{ RULE : defines
    ORGANIZATION ||--o{ CONTENT_ITEM : manages
    ORGANIZATION ||--o{ AUDIT_EVENT : records

    SOURCE_DOCUMENT ||--o{ SOURCE_PASSAGE : segments_into
    CONTENT_ITEM ||--o{ CONTENT_REVISION : versions
    CONTENT_ITEM ||--o{ COMMENT : has
    CONTENT_ITEM ||--o{ APPROVAL_DECISION : records

    CONTENT_REVISION ||--o{ FINDING : generates

    SOURCE_DOCUMENT {
        int id PK
        string title
        string document_type
        string version
        string confidentiality
        text raw_text
    }

    SOURCE_PASSAGE {
        int id PK
        int source_id FK
        string passage_identifier
        string section_title
        text text
    }

    RULE {
        int id PK
        string rule_id UK
        string category
        string severity
        string status
        string pattern
        string replacement_suggestion
    }

    CONTENT_ITEM {
        int id PK
        string title
        string content_type
        string audience
        string status
    }

    CONTENT_REVISION {
        int id PK
        int content_id FK
        int revision_no
        text text
        string author_name
    }

    FINDING {
        int id PK
        string finding_id UK
        int revision_id FK
        string category
        int start_char
        int end_char
        string flagged_text
        string rule_id
        string evidence_source
        string evidence_passage_id
        string severity
        string confidence_level
        string author_action
    }
```

---

## 5. Security, Privacy & Integrity Safeguards

1. **Prompt Injection Resistance**: Content submitted for review is never concatenated into system instructions. Prompts explicitly wrap input as raw untrusted data.
2. **Provider Agnostic Design**: If no external LLM API key is present, the system defaults to an in-memory deterministic tone heuristic engine. The platform never crashes, hangs, or fabricates AI presence.
3. **Zero Data Retention in Model Providers**: Uses standard zero-retention API endpoints.
4. **Append-Only Auditing**: Audit records can be created through normal application interfaces but cannot be mutated or deleted.
