import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.seed_data import seed_demo_database

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_demo_database(db)
    db.close()
    yield

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["service"] == "BrandGuard AI"
    assert data["database_connected"] is True

def test_brand_kit_sources_and_rules():
    res = client.get("/api/brand-kit/sources")
    assert res.status_code == 200
    sources = res.json()
    assert len(sources) >= 3

    res_rules = client.get("/api/brand-kit/rules")
    assert res_rules.status_code == 200
    rules = res_rules.json()
    assert len(rules) >= 5

def test_full_review_and_approval_flow():
    # 1. Creator creates draft content
    create_payload = {
        "title": "Automated Test Post",
        "content_type": "social_post",
        "audience": "Customers",
        "text": "Acme is India's #1 fastest delivery service. Our courier guy ensures 100% safe transit. Click here!",
        "notes": "Testing pipeline"
    }
    headers_creator = {"X-User-Role": "creator", "X-User-Name": "Anushka Tambore"}
    res = client.post("/api/content", json=create_payload, headers=headers_creator)
    assert res.status_code == 200
    item = res.json()
    content_id = item["id"]
    assert item["status"] == "draft"

    # 2. Run Review Pipeline
    res_review = client.post(f"/api/content/{content_id}/review", headers=headers_creator)
    assert res_review.status_code == 200
    reviewed_item = res_review.json()
    assert reviewed_item["status"] == "needs_changes"
    assert reviewed_item["open_findings_count"] > 0
    assert reviewed_item["high_severity_findings_count"] > 0

    findings = reviewed_item["latest_revision"]["findings"]
    assert len(findings) >= 3

    # 3. Creator dismisses a finding with a reason
    finding_to_dismiss = findings[0]
    dismiss_res = client.post(
        f"/api/findings/{finding_to_dismiss['id']}/action",
        json={"action": "dismiss", "dismissal_reason": "Approved exception for testing"},
        headers=headers_creator
    )
    assert dismiss_res.status_code == 200
    assert dismiss_res.json()["author_action"] == "dismissed"

    # 4. Creator submits to Human Review queue
    submit_res = client.post(f"/api/workflow/{content_id}/submit-for-review", headers=headers_creator)
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "pending_human_review"

    # 5. Non-reviewer role (Creator) tries to approve -> FORBIDDEN!
    approve_res_fail = client.post(
        f"/api/workflow/{content_id}/decision",
        json={"decision": "approved", "reason": "Self-approving my work"},
        headers=headers_creator
    )
    assert approve_res_fail.status_code == 403

    # 6. Reviewer tries to approve WITHOUT override reason while high-severity findings remain -> BLOCKED!
    headers_reviewer = {"X-User-Role": "reviewer", "X-User-Name": "Jayshree Gore"}
    approve_blocked = client.post(
        f"/api/workflow/{content_id}/decision",
        json={"decision": "approved", "reason": "Looks okay to me"},
        headers=headers_reviewer
    )
    assert approve_blocked.status_code == 400
    assert "high-severity finding" in approve_blocked.json()["detail"].lower()

    # 7. Reviewer approves WITH formal written override justification
    approve_override = client.post(
        f"/api/workflow/{content_id}/decision",
        json={
            "decision": "approved",
            "reason": "Special executive sign-off granted.",
            "override_reason": "Executive exemption approved by PR Director for test scenario"
        },
        headers=headers_reviewer
    )
    assert approve_override.status_code == 200
    assert approve_override.json()["decision"] == "approved"

    # Verify item status is now approved
    item_final = client.get(f"/api/content/{content_id}").json()
    assert item_final["status"] == "approved"
