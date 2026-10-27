import pytest
from app.engine.deterministic import DeterministicEngine

class MockRule:
    def __init__(self, rule_id, category, severity, title, description, pattern, replacement=None, status="active"):
        self.rule_id = rule_id
        self.category = category
        self.severity = severity
        self.title = title
        self.description = description
        self.pattern = pattern
        self.replacement_suggestion = replacement
        self.status = status
        self.examples_do = []
        self.examples_dont = []
        self.source_title = "Brand Guidelines"
        self.source_passage_identifier = "P-101"

def test_banned_terminology_detection():
    rules = [
        MockRule("BG-TRM-001", "terminology", "high", "Partner Terminology", "Use Delivery Partner", r"courier guy", "Delivery Partner"),
        MockRule("BG-TRM-003", "terminology", "medium", "No Cheap", "Do not use cheap", r"dirt cheap", "competitive rates")
    ]
    text = "The courier guy delivered our package at dirt cheap prices."
    findings = DeterministicEngine.run_checks(text, rules, [], [])

    flagged_texts = [f["flagged_text"] for f in findings]
    assert "courier guy" in flagged_texts
    assert "dirt cheap" in flagged_texts

    partner_finding = next(f for f in findings if f["flagged_text"] == "courier guy")
    assert partner_finding["rule_id"] == "BG-TRM-001"
    assert partner_finding["suggestion"] == "Delivery Partner"
    assert partner_finding["severity"] == "high"

def test_unsupported_superlatives_check():
    text = "Acme is India's #1 fastest delivery service in the market."
    findings = DeterministicEngine.run_checks(text, [], [], [])
    
    superlative_findings = [f for f in findings if f["category"] == "unsupported_claim"]
    assert len(superlative_findings) > 0
    f = superlative_findings[0]
    assert f["rule_id"] == "BG-CLM-004"
    assert "Approved Claims Register" in f["evidence_source"]
    assert "fastest" in f["flagged_text"].lower() or "#1" in f["flagged_text"].lower()

def test_absolute_guarantees_check():
    text = "We guarantee 100% safe arrival with zero delay guaranteed."
    findings = DeterministicEngine.run_checks(text, [], [], [])
    
    guarantee_findings = [f for f in findings if f["rule_id"] == "BG-CLM-002"]
    assert len(guarantee_findings) >= 1
    assert any("100% safe" in f["flagged_text"] or "zero delay guaranteed" in f["flagged_text"] for f in guarantee_findings)

def test_factual_conflict_check():
    text = "Serving across 500 cities nationwide."
    findings = DeterministicEngine.run_checks(text, [], [], [])

    fact_findings = [f for f in findings if f["category"] == "unverified_fact"]
    assert len(fact_findings) > 0
    assert fact_findings[0]["rule_id"] == "BG-FACT-001"
    assert "40 major cities" in fact_findings[0]["suggestion"]

def test_accessibility_vague_links():
    text = "For more details, click here to see the schedule."
    findings = DeterministicEngine.run_checks(text, [], [], [])

    acc_findings = [f for f in findings if f["rule_id"] == "BG-ACC-001"]
    assert len(acc_findings) == 1
    assert acc_findings[0]["flagged_text"].lower() == "click here"
