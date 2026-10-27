from typing import List, Dict, Any, Optional

class FindingVerifier:
    """
    Independent Verifier & Scorer that validates candidate findings from
    deterministic checks or LLM analysis before they are presented or stored.
    Enforces honest evidence citations, character span fidelity, and prevents
    hallucinated sources or suggestions.
    """

    @classmethod
    def verify_findings(
        cls,
        raw_findings: List[Dict[str, Any]],
        content_text: str,
        valid_passage_ids: set[str],
        valid_rules_map: Dict[str, Any],
        banned_phrases: List[str]
    ) -> List[Dict[str, Any]]:
        verified: List[Dict[str, Any]] = []

        for finding in raw_findings:
            flagged = finding.get("flagged_text", "").strip()
            if not flagged:
                continue

            # 1. Verify and rectify character span in content_text
            start = finding.get("start_char", 0)
            end = finding.get("end_char", 0)
            
            # Check if slice matches flagged_text
            slice_text = content_text[start:end]
            if slice_text.lower() != flagged.lower():
                # Attempt to find the actual span in content_text
                idx = content_text.lower().find(flagged.lower())
                if idx != -1:
                    start = idx
                    end = idx + len(flagged)
                    flagged = content_text[start:end]
                    finding["start_char"] = start
                    finding["end_char"] = end
                    finding["flagged_text"] = flagged
                else:
                    # Flagged span does not exist in content at all -> drop hallucinated finding!
                    continue

            # 2. Verify evidence citation
            passage_id = finding.get("evidence_passage_id")
            source_doc = finding.get("evidence_source")
            confidence_level = finding.get("confidence_level", "medium")
            confidence_basis = finding.get("confidence_basis", [])
            if not isinstance(confidence_basis, list):
                confidence_basis = [str(confidence_basis)]

            if passage_id:
                if passage_id not in valid_passage_ids:
                    # Invoking a fake or non-existent passage:
                    # Downgrade finding and strip the fake citation
                    finding["evidence_passage_id"] = None
                    finding["evidence_source"] = None
                    finding["reason"] += " (Note: Cited evidence passage could not be verified in approved database)."
                    confidence_level = "low"
                    confidence_basis.append("evidence_unverified_downgrade")
                else:
                    confidence_basis.append("evidence_verified")
            else:
                # Explicit unverified fact or missing source
                if "no approved source" not in finding.get("reason", "").lower():
                    finding["reason"] += " [Unverified — no approved source found]"
                confidence_basis.append("unverified_flag")

            # 3. Check suggested fix for accidental banned terms or hallucinations
            suggestion = finding.get("suggestion", "")
            if suggestion:
                for banned in banned_phrases:
                    if banned.lower() in suggestion.lower():
                        # Suggestion contains a banned word! Neutralize it
                        suggestion = f"[Consult Brand Guidelines for acceptable phrasing for '{flagged}']"
                        finding["suggestion"] = suggestion
                        finding["reason"] += " (Original suggestion retracted due to restricted terminology policy)."
                        break

            # 4. Verify rule id
            rule_id = finding.get("rule_id", "BG-GEN-001")
            if rule_id in valid_rules_map:
                rule_obj = valid_rules_map[rule_id]
                finding["rule_description"] = rule_obj.description
                # Align severity with official rule severity if not specified
                if not finding.get("severity"):
                    finding["severity"] = rule_obj.severity

            # 5. Determine finalized confidence score
            if "pattern_match" in confidence_basis and "evidence_verified" in confidence_basis:
                confidence_level = "high"
            elif "llm" in confidence_basis and "evidence_verified" in confidence_basis:
                confidence_level = "medium_high"
            elif "unverified_flag" in confidence_basis or "evidence_unverified_downgrade" in confidence_basis:
                confidence_level = "low" if confidence_level == "low" else "medium"

            finding["confidence_level"] = confidence_level
            finding["confidence_basis"] = list(set(confidence_basis))
            verified.append(finding)

        # Sort findings by position in text, then by severity (high first)
        severity_rank = {"high": 0, "medium": 1, "low": 2}
        verified.sort(key=lambda x: (x.get("start_char", 0), severity_rank.get(x.get("severity", "medium"), 1)))
        return verified
