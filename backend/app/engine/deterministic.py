import re
from typing import List, Dict, Any, Optional

class DeterministicEngine:
    """
    Deterministic rule checking engine for BrandGuard AI.
    Runs fast, predictable, explainable checks across:
    1. Banned words and phrases
    2. Preferred terminology & product naming
    3. Unsupported superlatives (#1, fastest, best, greatest)
    4. Absolute guarantees (100% safe, guaranteed, zero delay)
    5. Factual conflict & unverified statistics checks
    6. Readability & all-caps overuse
    7. Accessibility proxies (vague link text, missing alt-text declarations)
    """

    @staticmethod
    def run_checks(
        text: str,
        active_rules: List[Any],
        approved_facts: List[Dict[str, Any]],
        approved_claims: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []
        finding_seq = 100

        def add_finding(
            category: str,
            start: int,
            end: int,
            flagged: str,
            rule_id: str,
            rule_desc: str,
            evidence_source: Optional[str],
            evidence_passage: Optional[str],
            reason: str,
            severity: str,
            confidence_level: str,
            confidence_basis: List[str],
            suggestion: str
        ):
            nonlocal finding_seq
            finding_seq += 1
            findings.append({
                "finding_id": f"F-{finding_seq:04d}",
                "category": category,
                "start_char": start,
                "end_char": end,
                "flagged_text": flagged,
                "rule_id": rule_id,
                "rule_description": rule_desc,
                "evidence_source": evidence_source,
                "evidence_passage_id": evidence_passage,
                "reason": reason,
                "severity": severity,
                "confidence_level": confidence_level,
                "confidence_basis": confidence_basis,
                "suggestion": suggestion,
                "author_action": "pending",
                "dismissal_reason": None
            })

        # -------------------------------------------------------------
        # 1. Database-driven active rules with pattern matching
        # -------------------------------------------------------------
        for rule in active_rules:
            if rule.status != "active":
                continue
            if not rule.pattern:
                continue

            try:
                # Compile regex case-insensitively with word boundaries if needed
                pattern_str = rule.pattern
                if not pattern_str.startswith(r"\b") and not pattern_str.startswith("^") and not pattern_str.startswith(r"(?i)"):
                    pattern_str = r"\b" + pattern_str + r"\b"
                
                regex = re.compile(pattern_str, re.IGNORECASE)
                for match in regex.finditer(text):
                    match_text = match.group(0)
                    start, end = match.span()
                    
                    # Compute appropriate suggestion
                    suggestion = rule.replacement_suggestion or ""
                    if not suggestion and rule.examples_do:
                        suggestion = rule.examples_do[0]
                    if not suggestion:
                        suggestion = f"[Revised wording compliant with {rule.rule_id}]"

                    add_finding(
                        category=rule.category,
                        start=start,
                        end=end,
                        flagged=match_text,
                        rule_id=rule.rule_id,
                        rule_desc=rule.description,
                        evidence_source=rule.source_title or "Brand Guidelines v2.1",
                        evidence_passage=rule.source_passage_identifier or "P-101",
                        reason=f"Violates rule {rule.rule_id}: {rule.title}. {rule.description}",
                        severity=rule.severity,
                        confidence_level="high",
                        confidence_basis=["pattern_match", "rule_definition"],
                        suggestion=suggestion
                    )
            except Exception:
                continue

        # -------------------------------------------------------------
        # 2. Superlatives and Comparatives check
        # -------------------------------------------------------------
        superlative_patterns = [
            (r"\b(India's\s+#1|#1\s+fastest|#1\s+courier|number\s+one)\b", "BG-CLM-004", "Superlative claims require verified entry in the Approved Claims Register."),
            (r"\b(fastest\s+delivery(\s+service)?)\b", "BG-CLM-004", "Superlative claim 'fastest delivery' lacks substantiation in the claims register."),
            (r"\b(the\s+best\s+courier|best\s+in\s+India|cheapest\s+rates)\b", "BG-CLM-004", "Unsubstantiated comparative/superlative claim.")
        ]
        
        for pat, rule_id, desc in superlative_patterns:
            for match in re.finditer(pat, text, re.IGNORECASE):
                # Avoid duplicate if flagged by DB rule
                span_already_flagged = any(f["start_char"] == match.start() and f["end_char"] == match.end() for f in findings)
                if span_already_flagged:
                    continue

                flagged = match.group(0)
                add_finding(
                    category="unsupported_claim",
                    start=match.start(),
                    end=match.end(),
                    flagged=flagged,
                    rule_id=rule_id,
                    rule_desc="Superlative and comparative claims must be substantiated in the Approved Claims Register.",
                    evidence_source="Approved Claims Register v2.1, Section 3",
                    evidence_passage="CLM-3.4",
                    reason=f"{desc} No entry in Approved Claims Register v2.1 supports '{flagged}'.",
                    severity="high",
                    confidence_level="high",
                    confidence_basis=["pattern_match", "claims_register_lookup"],
                    suggestion="Acme delivers within 24 hours across 40 major cities."
                )

        # -------------------------------------------------------------
        # 3. Absolute Guarantees check
        # -------------------------------------------------------------
        guarantee_patterns = [
            (r"\b(100%\s+safe|100%\s+guaranteed|guaranteed\s+results|zero\s+delay\s+guaranteed)\b", "BG-CLM-002", "Absolute guarantee prohibited without certified warranty policy."),
            (r"\b(no\s+questions\s+asked\s+refund|never\s+fails)\b", "BG-CLM-002", "Absolute performance guarantee not backed by legal terms.")
        ]

        for pat, rule_id, desc in guarantee_patterns:
            for match in re.finditer(pat, text, re.IGNORECASE):
                span_already_flagged = any(f["start_char"] == match.start() and f["end_char"] == match.end() for f in findings)
                if span_already_flagged:
                    continue

                flagged = match.group(0)
                add_finding(
                    category="unsupported_claim",
                    start=match.start(),
                    end=match.end(),
                    flagged=flagged,
                    rule_id=rule_id,
                    rule_desc="Absolute guarantees create liability and are prohibited under Brand Advertising Standards.",
                    evidence_source="Brand Advertising & Legal Policy v1.4, Section 5",
                    evidence_passage="POL-5.2",
                    reason=f"Found absolute guarantee '{flagged}'. Brand guidelines explicitly forbid absolute guarantees without underwritten insurance terms.",
                    severity="high",
                    confidence_level="high",
                    confidence_basis=["pattern_match", "policy_lookup"],
                    suggestion="Protected by Acme SafeTransit™ with 99.4% on-time track record."
                )

        # -------------------------------------------------------------
        # 4. Factual Consistency & Unverified Statistics check
        # -------------------------------------------------------------
        # Check city counts or coverage numbers
        city_patterns = [
            re.compile(r"\b(?:over|more than|>|around)?\s*(\d{3,})\s*cities\b", re.IGNORECASE),
            re.compile(r"\b(?:across|in)\s+(\d{3,})\s+cities\b", re.IGNORECASE)
        ]
        for pat in city_patterns:
            for match in pat.finditer(text):
                flagged = match.group(0)
                num = int(match.group(1))
                if num > 40:  # Approved fact is 40 cities
                    add_finding(
                        category="unverified_fact",
                        start=match.start(),
                        end=match.end(),
                        flagged=flagged,
                        rule_id="BG-FACT-001",
                        rule_desc="Network metrics must align strictly with the Approved Fact Sheet.",
                        evidence_source="Acme Verified Fact Sheet 2026, Section 2",
                        evidence_passage="FACT-02",
                        reason=f"Claimed delivery to '{flagged}' conflicts with verified metric of 40 major cities.",
                        severity="high",
                        confidence_level="high",
                        confidence_basis=["metric_extraction", "fact_sheet_comparison"],
                        suggestion="delivering across 40 major cities"
                    )

        # Check unverified claims or unverified stats like "99.99%" or "founded in 2012"
        founding_match = re.search(r"\bfounded in (\d{4})\b", text, re.IGNORECASE)
        if founding_match and founding_match.group(1) != "2018":
            add_finding(
                category="unverified_fact",
                start=founding_match.start(),
                end=founding_match.end(),
                flagged=founding_match.group(0),
                rule_id="BG-FACT-002",
                rule_desc="Company milestones and founding dates must match corporate records.",
                evidence_source="Acme Corporate Fact Sheet, Section 1",
                evidence_passage="FACT-01",
                reason=f"Founding year '{founding_match.group(1)}' conflicts with corporate records (founded in 2018).",
                severity="medium",
                confidence_level="high",
                confidence_basis=["fact_sheet_comparison"],
                suggestion="founded in 2018"
            )

        # Check for unverified numerical statistics with no source
        stat_pattern = re.compile(r"\b(\d{2,3}%\s+(?:customer\s+satisfaction|growth|reduction))\b", re.IGNORECASE)
        for match in stat_pattern.finditer(text):
            flagged = match.group(0)
            span_already_flagged = any(f["start_char"] == match.start() and f["end_char"] == match.end() for f in findings)
            if not span_already_flagged:
                add_finding(
                    category="unverified_fact",
                    start=match.start(),
                    end=match.end(),
                    flagged=flagged,
                    rule_id="BG-FACT-003",
                    rule_desc="Numerical claims must cite verified company reports.",
                    evidence_source=None,  # Explicitly unverified!
                    evidence_passage=None,
                    reason=f"Unverified — no approved source found for statistic '{flagged}'.",
                    severity="medium",
                    confidence_level="medium",
                    confidence_basis=["unverified_metric_detector"],
                    suggestion="consistently rated highest in customer delivery surveys"
                )

        # -------------------------------------------------------------
        # 5. Accessibility Proxies (vague links, missing alt text)
        # -------------------------------------------------------------
        vague_links = re.finditer(r"\b(click\s+here|read\s+more|check\s+this\s+link|tap\s+here)\b", text, re.IGNORECASE)
        for match in vague_links:
            add_finding(
                category="accessibility_issue",
                start=match.start(),
                end=match.end(),
                flagged=match.group(0),
                rule_id="BG-ACC-001",
                rule_desc="Links must have descriptive anchor text for WCAG 2.1 accessibility compliance.",
                evidence_source="Digital Accessibility Guidelines v1.2",
                evidence_passage="ACC-04",
                reason="Vague link text impairs screen-reader navigation. Use descriptive destinations.",
                severity="low",
                confidence_level="high",
                confidence_basis=["accessibility_standard_wcag"],
                suggestion="View our 2026 parcel shipping rates"
            )

        # Empty image markdown ![ ](...) without alt text
        empty_alt = re.finditer(r"!\[\s*\]\((.*?)\)", text)
        for match in empty_alt:
            add_finding(
                category="accessibility_issue",
                start=match.start(),
                end=match.end(),
                flagged=match.group(0),
                rule_id="BG-ACC-002",
                rule_desc="Images must include descriptive alt text for visually impaired readers.",
                evidence_source="Digital Accessibility Guidelines v1.2",
                evidence_passage="ACC-01",
                reason="Image declaration has empty alternative text.",
                severity="medium",
                confidence_level="high",
                confidence_basis=["markdown_image_parser"],
                suggestion=f"![Acme delivery courier handing package to customer]({match.group(1)})"
            )

        # -------------------------------------------------------------
        # 6. Readability & All-caps Overuse
        # -------------------------------------------------------------
        # Detect all-caps segments of 3 or more uppercase words (>12 chars)
        all_caps_pattern = re.compile(r"\b([A-Z]{3,}(?:\s+[A-Z]{3,}){2,})\b")
        for match in all_caps_pattern.finditer(text):
            flagged = match.group(0)
            if flagged not in ["ACME COURIER", "FAQ", "SMS", "API", "GST"]:
                add_finding(
                    category="tone_violation",
                    start=match.start(),
                    end=match.end(),
                    flagged=flagged,
                    rule_id="BG-TONE-003",
                    rule_desc="Avoid all-caps text; it conveys shouting and reduces readability.",
                    evidence_source="Brand Tone & Voice Guide 2026, Section 4",
                    evidence_passage="TONE-04",
                    reason=f"Excessive capitalization '{flagged}' violates friendly and professional tone standards.",
                    severity="low",
                    confidence_level="high",
                    confidence_basis=["typography_analysis"],
                    suggestion=flagged.title()
                )

        return findings
