# BrandGuard AI — Explainable Brand Governance Platform

> **Inkloom AI Hackathon | Round 2 Submission**  
> **Team: Dashing Cars**  
> *Anushka Tambore, Sahil Sakhare, Kshitija Kolkar, Jayshree Gore*  

[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.162.0-009688.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.3.1-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-11%20Passed-brightgreen.svg)]()
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/AnushkaTambore/brandguard-ai)

---

## 1. Product Vision

**BrandGuard AI** is an explainable, human-controlled brand governance platform that evaluates marketing copy, social media posts, brochures, and announcements against approved brand guidelines, terminology rules, registered claims, and verified corporate facts before publication.

Unlike generic AI writing assistants that hallucinate facts or rewrite text in an arbitrary voice, BrandGuard AI:
1. **Grounds every check in approved evidence** (citing the exact source document, version, and passage ID).
2. **Flags unverified facts honestly** with an explicit *"Unverified — no approved source found"* banner.
3. **Provides editable suggestions** so creators can accept, modify, or dismiss fixes with mandatory written reasons.
4. **Enforces human-in-the-loop governance** where the AI only recommends, and only humans can approve or publish.
5. **Blocks silent high-severity bypasses** unless a reviewer explicitly enters a justified override reason.
6. **Maintains immutable revision histories** and an append-only cryptographic audit trail.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0.
- **Database**: SQLite (persisted in `brandguard.db` for zero-friction local execution; PostgreSQL-ready via SQLAlchemy).
- **Hybrid Review Engine**:
  - Deterministic Engine: Python regex, pattern matching, readability calculations, accessibility checks.
  - Source Retrieval: BM25 keyword ranker indexing approved guidelines, claim registries, and fact sheets.
  - Tone & Nuance Analyzer: Provider-agnostic LLM integration with strict JSON schema constraints.
  - **Graceful Fallback**: When `AI_API_KEY` is omitted, seamlessly switches to an in-memory deterministic tone heuristic engine. No crashes, no external dependencies required.
  - Independent Verifier & Scorer: Cross-checks character offsets, verifies citation passage IDs, strips hallucinated sources, and scores confidence.
- **Document Ingestion**: Multi-format ingestion for `.txt`, `.pdf` (via `pypdf`), and `.docx` (via `python-docx`).
- **Testing**: `pytest` test suite with 100% pass rate.
- **Deployment**: Multi-stage `Dockerfile` and `docker-compose.yml`.

---

## 3. Fast Start Guide (For Judges)

The application is pre-configured so that **no external API keys, accounts, or complex services are required**.

### Option A: Unified Server (Recommended)

1. **Activate Python Virtual Environment & Install Dependencies**:
   ```bash
   cd brandguard-ai
   python -m venv venv
   .\venv\Scripts\activate          # On Windows
   # source venv/bin/activate        # On Linux/macOS
   pip install -r backend/requirements.txt
   ```

2. **Run the FastAPI Unified Server**:
   ```bash
   cd backend
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

3. **Open the Web Application**:
   Navigate to [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser. The single command serves both the REST API and the compiled React SPA.

---

### Option B: Separate Frontend & Backend Development Mode

If you wish to run the React Vite development server alongside FastAPI:

1. **Start Backend**:
   ```bash
   cd brandguard-ai/backend
   uvicorn app.main:app --reload --port 8000
   ```

2. **Start Frontend**:
   ```bash
   cd brandguard-ai/frontend
   npm install
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173). The Vite dev server automatically proxies `/api` requests to `http://127.0.0.1:8000`.

---

### Option C: Docker Deployment

```bash
cd brandguard-ai
docker-compose up --build
```
Navigate to [http://localhost:8000](http://localhost:8000).

---

## 4. 10-Step Interactive Judge Evaluation Guide

To experience the complete end-to-end workflow in under 3 minutes:

1. **Open the Application**: Go to [http://127.0.0.1:8000](http://127.0.0.1:8000). The dashboard immediately loads with pre-seeded metrics for the fictional brand *"Acme Courier"*.
2. **Explore Brand Kit**: Click **Brand Kit & Rules** in the sidebar. Inspect the 4 source documents (Brand Guidelines, Claims Register, Fact Sheet, Accessibility Standards) and the active review rules.
3. **One-Click Demo Review**: Return to the **Dashboard** and click **"Test Sample Launch Post (1-Click Review)"**, or go to **Review Content** and select *"Social Post: Festival Launch Announcement"*.
4. **Trigger Review Pipeline**: Click **"Run Governance Review"**. In under 0.5s, the engine segments the copy, detects 5 distinct violations across categories, verifies citations, and highlights flagged spans in the left pane.
5. **Inspect Explained Findings**: Look at card `F-0103` (Superlative claim *"India's #1 fastest"*). Notice:
   - Severity: `High`
   - Confidence: `High`
   - Evidence Citation: *Approved Claims Register v2.1, Section 3 (Passage CLM-3.4)*
   - Editable suggestion: *"Acme delivers within 24 hours in 40 cities."*
6. **Accept & Edit Suggestions**:
   - Click **"Accept Fix"** on the first finding. Watch the text in the left pane update automatically.
   - Click **"Edit"** on finding `F-0105` (*"courier guy"*), customize the replacement, and click **"Apply Edit"**.
7. **Test Mandatory Dismissal Reason**: Click **"Dismiss..."** on finding `F-0106`. Try submitting with an empty reason (system blocks it). Enter a valid written justification and confirm.
8. **Save a New Revision**: Click **"Manual Edit"** or edit text, then click **"Save Revision"**. Enter revision notes (e.g., *"Diwali campaign v2"*). Notice Revision 2 is saved without overwriting Revision 1.
9. **Submit to Human Review**: Click **"Submit for Human Approval"**. The status changes to `Pending Human Review`.
10. **Act as Reviewer & Test High-Severity Override**:
    - In the top navbar, switch the **Demo Role** from `Creator` to `Reviewer: Jayshree Gore`.
    - Click **Human Review Queue** in the sidebar. Select the item.
    - Click **"Approve Content"**. If any high-severity findings remain open, the system blocks silent approval and requires a mandatory written override reason!
    - Enter an override explanation and confirm. The decision is recorded, and the item transitions to `Approved`.
    - Check the **Audit Log** to see the append-only record of the approval and high-severity override.

---

## 5. Demo Roles & Backend Enforcement

The top navbar includes an interactive **Demo Role Switcher** demonstrating backend-enforced role access control:

| Role | Demo Persona | Permitted Actions | Restricted Actions |
| :--- | :--- | :--- | :--- |
| **Creator** | Anushka Tambore | Draft content, run reviews, accept/edit fixes, dismiss findings with reason, save revisions, submit to queue | Cannot approve or reject content; cannot activate brand rules |
| **Reviewer** | Jayshree Gore | Inspect queue, add comments, request changes, approve content, record overrides | Cannot modify brand rules |
| **Brand Manager** | Kshitija Kolkar | Upload source documents, extract draft rules, approve and activate rules, manage guidelines | Cannot silently bypass approval workflows |
| **Admin** | Sahil Sakhare | Full workspace administration, role management, audit inspection | — |

*Note: In production, demo role switching is replaced with OAuth2/OIDC single sign-on (SSO).*

---

## 6. Automated Testing

Run the test suite from the repository root:

```bash
cd brandguard-ai/backend
..\venv\Scripts\pytest -v
```

### Verified Test Cases:
- `test_banned_terminology_detection`: Validates regex detection and replacement suggestion for prohibited partner terms and price slang.
- `test_unsupported_superlatives_check`: Validates pattern detection for superlatives and cross-reference against claims register.
- `test_absolute_guarantees_check`: Validates prohibition of absolute warranty claims (`100% safe`).
- `test_factual_conflict_check`: Validates detection of conflicting coverage statistics (e.g. `500 cities` vs verified `40 cities`).
- `test_accessibility_vague_links`: Validates WCAG 2.1 link phrasing checks (`click here`).
- `test_verifier_drops_hallucinated_spans`: Confirms verifier purges candidate findings that do not exist in the source content.
- `test_verifier_downgrades_invalid_citations`: Confirms verifier strips invented citations and downgrades confidence.
- `test_verifier_sanitizes_suggestions_containing_banned_terms`: Confirms suggestions cannot inadvertently introduce banned phrases.
- `test_health_endpoint`: Validates service availability and database connectivity.
- `test_brand_kit_sources_and_rules`: Validates source passage retrieval and rule management.
- `test_full_review_and_approval_flow`: End-to-end integration test validating review generation, dismissal with reason, submission to queue, role authorization checks, high-severity approval block, and written override justification.

---

## 7. Interactive API Documentation

When the backend is running, complete interactive OpenAPI Swagger documentation is available at:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc UI**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## 8. Round 3 Improvements

As outlined in the Round 1 proposal, three substantial improvements are planned for Round 3:

1. **Advanced Guideline Intelligence**:
   - Automated detection of contradictory or overlapping rules across guideline documents.
   - Proactive alert to Brand Managers when a rule's override rate exceeds 40%, indicating ambiguous wording.
2. **Visual Brand Compliance**:
   - Palette extraction and WCAG 2.1 text contrast verification on uploaded creative assets.
   - Logo clear-space measurement and OCR text analysis on advertising graphics.
3. **Measured Quality & Usability Benchmarking**:
   - Expansion of the benchmark test set to 50 multilingual drafts with automated precision/recall CI/CD gates.
   - Formal 5-participant usability study targeting System Usability Scale (SUS) ≥ 70.
   - Privacy-preserving reviewer feedback loop to refine rule suggestions.

---

## 9. Deliverables Summary

| Deliverable | Path / Reference |
| :--- | :--- |
| **Frontend Source** | `frontend/src/` (React 19, TS, Vite, Tailwind) |
| **Backend Source** | `backend/app/` (FastAPI, SQLAlchemy, Hybrid Engine) |
| **Database Schema** | `backend/app/models.py`, `backend/app/database.py` |
| **Seeded Demo Kit** | `backend/app/seed_data.py` (Acme Courier Brand Kit) |
| **Automated Tests** | `backend/tests/` (11 / 11 passing tests) |
| **Environment Config** | `.env.example`, `backend/.env.example` |
| **System Architecture** | `docs/ARCHITECTURE.md` |
| **Test & Eval Report** | `docs/TEST_REPORT.md` |
| **Project Report (Markdown)** | `docs/PROJECT_REPORT.md` |
| **Project Report (Printable)**| `docs/PROJECT_REPORT.html` |
| **Round 3 Roadmap** | `docs/ROUND_3_ROADMAP.md` |
| **Containerization** | `Dockerfile`, `docker-compose.yml` |

---

*Team Dashing Cars &bull; Inkloom AI Hackathon Round 2 &bull; October 2026*
