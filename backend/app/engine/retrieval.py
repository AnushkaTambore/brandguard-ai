import re
import math
from typing import List, Dict, Any, Tuple

class PassageRetriever:
    """
    Passage retrieval engine using BM25-style term frequency / inverse document frequency ranking.
    Gages relevance of approved source passages and rules against submitted content segments.
    """

    @staticmethod
    def tokenize(text: str) -> List[str]:
        return [w.lower() for w in re.findall(r"\b[A-Za-z0-9_]{2,}\b", text)]

    @classmethod
    def rank_passages(
        cls,
        query: str,
        passages: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Ranks a list of source passages (each having 'passage_identifier', 'title', 'text')
        against query string using BM25 scoring.
        """
        if not passages:
            return []

        query_tokens = cls.tokenize(query)
        if not query_tokens:
            return passages[:top_k]

        N = len(passages)
        avgdl = sum(len(cls.tokenize(p.get("text", ""))) for p in passages) / max(N, 1)

        # Document frequencies
        df: Dict[str, int] = {}
        for p in passages:
            doc_tokens = set(cls.tokenize(p.get("text", "") + " " + p.get("title", "")))
            for t in query_tokens:
                if t in doc_tokens:
                    df[t] = df.get(t, 0) + 1

        k1 = 1.5
        b = 0.75
        scores: List[Tuple[float, Dict[str, Any]]] = []

        for p in passages:
            text_tokens = cls.tokenize(p.get("text", "") + " " + p.get("title", ""))
            doc_len = len(text_tokens)
            score = 0.0

            # Count frequencies
            freqs: Dict[str, int] = {}
            for t in text_tokens:
                freqs[t] = freqs.get(t, 0) + 1

            for q in query_tokens:
                if q in freqs:
                    n_q = df.get(q, 0)
                    idf = math.log((N - n_q + 0.5) / (n_q + 0.5) + 1.0)
                    tf = freqs[q]
                    denom = tf + k1 * (1 - b + b * (doc_len / avgdl if avgdl > 0 else 1))
                    score += idf * (tf * (k1 + 1)) / max(denom, 0.001)

            scores.append((score, p))

        # Sort descending by score
        scores.sort(key=lambda x: x[0], reverse=True)
        return [p for s, p in scores[:top_k]]
