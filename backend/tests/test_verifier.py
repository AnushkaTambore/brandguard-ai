import pytest
from app.engine.verifier import FindingVerifier

def test_verifier_drops_hallucinated_spans():
    content = "Acme provides reliable logistics and timely parcels."
    # Candidate finding flags words that don't exist in content
    raw_findings = [{
        "finding_id": "F-001",
        "category": "unsupported_claim",
        "start_char": 0,
        "end_char": 20,
        "flagged_text": "we are the best in the solar system",
        "rule_id": "BG-CLM-004",
        "rule_description": "Superlatives",
        "evidence_passage_id": "P-101",
        "reason": "Imagined superlative",
        "severity": "high",
        "confidence_level": "high",
        "confidence_basis": ["llm"],
        "suggestion": "reliable logistics"
    }]

    verified = FindingVerifier.verify_findings(
        raw_findings=raw_findings,
        content_text=content,
        valid_passage_ids={"P-101"},
        valid_rules_map={},
        banned_phrases=[]
    )
    # The hallucinated finding must be dropped entirely!
    assert len(verified) == 0

def test_verifier_downgrades_invalid_citations():
    content = "Our service is dirt cheap."
    raw_findings = [{
        "finding_id": "F-002",
        "category": "terminology",
        "start_char": 15,
        "end_char": 25,
        "flagged_text": "dirt cheap",
        "rule_id": "BG-TRM-003",
        "rule_description": "No cheap",
        "evidence_passage_id": "P-FAKE-999",  # Nonexistent passage!
        "evidence_source": "Fake Document",
        "reason": "Avoid cheap",
        "severity": "medium",
        "confidence_level": "high",
        "confidence_basis": ["pattern_match"],
        "suggestion": "affordable"
    }]

    verified = FindingVerifier.verify_findings(
        raw_findings=raw_findings,
        content_text=content,
        valid_passage_ids={"P-101", "P-102"},
        valid_rules_map={},
        banned_phrases=[]
    )

    assert len(verified) == 1
    # Evidence citation must be stripped and marked unverified
    assert verified[0]["evidence_passage_id"] is None
    assert verified[0]["confidence_level"] in ["medium", "low"]
    assert "could not be verified" in verified[0]["reason"]

def test_verifier_sanitizes_suggestions_containing_banned_terms():
    content = "Our courier guy will arrive soon."
    raw_findings = [{
        "finding_id": "F-003",
        "category": "terminology",
        "start_char": 4,
        "end_char": 15,
        "flagged_text": "courier guy",
        "rule_id": "BG-TRM-001",
        "rule_description": "Use delivery partner",
        "evidence_passage_id": "P-101",
        "reason": "Avoid courier guy",
        "severity": "high",
        "confidence_level": "high",
        "confidence_basis": ["pattern_match"],
        "suggestion": "the cheap courier guy partner"  # Suggestion contains 'cheap', which is a banned phrase!
    }]

    verified = FindingVerifier.verify_findings(
        raw_findings=raw_findings,
        content_text=content,
        valid_passage_ids={"P-101"},
        valid_rules_map={},
        banned_phrases=["cheap"]
    )

    assert len(verified) == 1
    # Suggestion must be sanitized
    assert "cheap" not in verified[0]["suggestion"].lower()
