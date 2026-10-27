from typing import List, Dict, Any
from app.engine.deterministic import DeterministicEngine
from app.engine.retrieval import PassageRetriever
from app.engine.llm_analyzer import LLMAnalyzer
from app.engine.verifier import FindingVerifier

class ReviewOrchestrator:
    """
    Coordinates the complete BrandGuard AI review pipeline:
    1. Text segmentation & character offset mapping
    2. Deterministic rule execution (banned terms, preferred terms, claims, facts, accessibility)
    3. Source passage retrieval (BM25)
    4. Tone & nuance analysis (LLM or deterministic fallback)
    5. Independent verifier & scorer (evidence check, span validation, hallucination purge)
    """

    @classmethod
    async def run_review_pipeline(
        cls,
        text: str,
        content_type: str,
        audience: str,
        active_rules: List[Any],
        approved_passages: List[Dict[str, Any]],
        approved_facts: List[Dict[str, Any]],
        approved_claims: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        # 1. Deterministic checks
        deterministic_findings = DeterministicEngine.run_checks(
            text=text,
            active_rules=active_rules,
            approved_facts=approved_facts,
            approved_claims=approved_claims
        )

        # 2. Retrieve top relevant approved passages for tone / nuanced context
        retrieved_passages = PassageRetriever.rank_passages(
            query=text,
            passages=approved_passages,
            top_k=6
        )

        # 3. LLM or Rule-based tone & clarity analysis
        tone_findings = await LLMAnalyzer.analyze_tone_and_clarity(
            text=text,
            content_type=content_type,
            audience=audience,
            retrieved_passages=retrieved_passages,
            active_rules=active_rules
        )

        # Combine candidate findings
        combined = deterministic_findings + tone_findings

        # 4. Prepare verification context
        valid_passage_ids = {p.get("passage_identifier") for p in approved_passages if p.get("passage_identifier")}
        valid_rules_map = {r.rule_id: r for r in active_rules}
        
        # Banned phrases from terminology rules to prevent suggestions from repeating banned words
        banned_phrases = []
        for r in active_rules:
            if r.category == "terminology" and r.pattern:
                banned_phrases.append(r.pattern.strip(r"\b"))

        # 5. Run Verification & Scoring
        verified_findings = FindingVerifier.verify_findings(
            raw_findings=combined,
            content_text=text,
            valid_passage_ids=valid_passage_ids,
            valid_rules_map=valid_rules_map,
            banned_phrases=banned_phrases
        )

        return verified_findings
