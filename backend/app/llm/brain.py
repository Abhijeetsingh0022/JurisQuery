"""
Brain LLM module for JurisQuery.
Provides meta-reasoning capabilities: query understanding,
response verification, and response refinement.
"""
import json
import logging
import re

from pydantic import BaseModel

from app.llm.gemini import GeminiLLM

logger = logging.getLogger(__name__)

_STOP_WORDS = {
    "what", "is", "the", "a", "an", "in", "on", "at", "for", "to",
    "of", "and", "or", "how", "why", "when", "where", "who", "which",
    "this", "that", "these", "those", "are", "was", "were", "be", "been",
}

_FALLBACK_VERIFICATION = dict(
    is_grounded=True,
    confidence_score=0.75,
    ungrounded_claims=[],
    suggestions=[],
    needs_refinement=False,
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class QueryAnalysis(BaseModel):
    """Structured result of analyzing a user query."""

    query_type: str  # "definition" | "comparison" | "clause_search" | "summary" | "general"
    key_entities: list[str]  # Legal terms, party names, clauses mentioned
    rewritten_query: str  # Expanded/clarified query for better retrieval
    search_keywords: list[str]  # Keywords for hybrid search boost


class DecomposedQuery(BaseModel):
    document_id: str
    query: str


class ResponseVerification(BaseModel):
    """Structured result of verifying a response against source context."""

    is_grounded: bool  # All claims backed by context
    confidence_score: float  # 0.0 – 1.0 confidence in response accuracy
    ungrounded_claims: list[str]  # Claims lacking citation support
    missing_citations: bool = False  # Whether the response lacks numeric [N] markers
    suggestions: list[str]  # Improvement suggestions
    needs_refinement: bool  # Whether a refinement pass is warranted


# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

_QUERY_ANALYSIS_PROMPT = """\
You are a legal query optimizer for a RAG system analyzing Indian legal documents.

Analyze the user's question and output a JSON object with:
1. "query_type": One of ["definition", "comparison", "clause_search", "summary", "web_research", "general"]. Use "web_research" if the query inherently requires external internet research (e.g., recent news, external case law, statutes not uploaded, etc).
2. "key_entities": List of legal terms, party names, clause types, or concepts mentioned
3. "rewritten_query": A more detailed, search-optimized version of the question (under 100 words)
4. "search_keywords": 3-5 specific keywords/phrases for document search

IMPORTANT RULES:
- For follow-up questions (referencing "it", "this", "that"), use chat history to expand
- Add relevant Indian legal terminology to rewritten_query
- Focus on Indian legal context

CHAT HISTORY:
{chat_history}

USER QUESTION: {query}

Respond with ONLY valid JSON, no markdown:"""


_RESPONSE_VERIFICATION_PROMPT = """\
You are a legal response verifier for a RAG system.

Check whether the AI's answer is properly grounded in the provided context and uses accurate citations.

AI RESPONSE:
{response}

SOURCE CONTEXT (what the AI had access to):
{context}

Analyze and output a JSON object with:
1. "is_grounded": true if ALL factual claims are supported by the context, false otherwise
2. "confidence_score": 0.0-1.0 score of how well-supported the response is
3. "ungrounded_claims": List of specific claims NOT supported by context (empty if all grounded)
4. "missing_citations": true if the response lacks numeric citations [1], [2] for factual claims
5. "suggestions": List of brief suggestions to improve accuracy or citation placement
6. "needs_refinement": true if confidence_score < 0.7 or there are ungrounded claims or missing citations

Be strict. Factual legal claims without specific numeric citations [N] are considered ungrounded.

Respond with ONLY valid JSON, no markdown:"""


_REFINEMENT_PROMPT = """\
You are a legal response refinement specialist.

The following response was generated but has accuracy or citation issues. Rewrite it to fix the problems.

ORIGINAL QUESTION: {query}

ORIGINAL RESPONSE:
{original_response}

ISSUES IDENTIFIED:
{issues_text}

SOURCE CONTEXT:
{context}

INSTRUCTIONS (CRITICAL):
1. **Numeric Citations**: Preserve or add relevant numeric citations `[1]`, `[2]` for EVERY factual claim.
2. **Fact Check**: Only use facts supported by the Source Context. Correct any ungrounded claims.
3. **Structure**: Maintain the professional "Legal Memo" structure with headers where appropriate.
4. **Tone**: Be objective, precise, and authoritative.

Write the improved response directly with all necessary numeric citations included:"""


_CHAT_TITLE_PROMPT = """\
Generate a short, descriptive title (3 to 6 words) for a legal chat conversation \
that begins with the following message.

IMPORTANT RULES:
1. Do NOT use random acronyms or single words.
2. The title must reflect the actual topic or intent of the user's query.
3. Capitalize it like a standard title (e.g., "Finding Indemnification Clauses").
4. Do NOT use quotes around the title.

USER MESSAGE: {message}

TITLE:"""


# ---------------------------------------------------------------------------
# BrainLLM
# ---------------------------------------------------------------------------

class BrainLLM:
    """
    Meta-reasoning layer for JurisQuery.
    Uses Gemini Flash for fast query understanding, response verification,
    and conditional response refinement.

    Timeouts and retries are handled by GeminiLLM's tenacity configuration.
    """

    MAX_CONTEXT_CHARS = 8000

    def __init__(self) -> None:
        self.llm = GeminiLLM()

    async def decompose_query(self, query: str, documents_context: str) -> list[DecomposedQuery]:
        """
        Decompose a multi-document query into specific sub-queries using Branched RAG architecture.
        """
        from app.rag.prompts import DECOMPOSER_PROMPT
        prompt = DECOMPOSER_PROMPT.format(
            question=query,
            documents_context=documents_context,
        )

        try:
            raw = await self.llm.generate(
                prompt=prompt,
                json_mode=True,
                temperature=0.0
            )

            # Some models return JSON nested under a root key if json_object type is requested, 
            # or return raw JSON array. Let's parse robustly.
            content = self._extract_json(raw).strip()

            parsed = json.loads(content)
            
            # If it wrapped it in dict e.g. {"queries": [...] }
            if isinstance(parsed, dict):
                for val in parsed.values():
                    if isinstance(val, list):
                        parsed = val
                        break
            
            if not isinstance(parsed, list):
                logger.warning("Decomposer failed to return a list: %s", parsed)
                return []
                
            results = []
            for item in parsed:
                if "document_id" in item and "query" in item:
                    results.append(DecomposedQuery(**item))
                    
            logger.info("Decomposed query into %d sub-queries", len(results))
            return results
            
        except Exception as e:
            logger.exception("Failed to decompose query: %s", e)
            return []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def analyze_query(
        self,
        query: str,
        chat_history: str = "",
    ) -> QueryAnalysis:
        """
        Analyze a query to understand intent and produce a search-optimized rewrite.

        Args:
            query: User's natural language question
            chat_history: Formatted prior conversation turns (optional)

        Returns:
            QueryAnalysis with query type, entities, rewritten query, and keywords
        """
        prompt = _QUERY_ANALYSIS_PROMPT.format(
            query=query,
            chat_history=chat_history or "None",
        )
        try:
            raw = await self.llm.generate(
                prompt=prompt,
                temperature=0.1,
                max_tokens=1024,
                json_mode=True,
            )
            data = json.loads(self._extract_json(raw))
            return QueryAnalysis(
                query_type=data.get("query_type", "general"),
                key_entities=data.get("key_entities", []),
                rewritten_query=data.get("rewritten_query", query),
                search_keywords=data.get("search_keywords") or self._extract_keywords(query),
            )
        except json.JSONDecodeError as e:
            logger.warning("Query analysis JSON parse failed: %s", e)
        except Exception as e:
            logger.error("Query analysis failed: %s", e)

        return QueryAnalysis(
            query_type="general",
            key_entities=[],
            rewritten_query=query,
            search_keywords=self._extract_keywords(query),
        )

    async def verify_response(
        self,
        response: str,
        context: str,
    ) -> ResponseVerification:
        """
        Verify whether a generated response is grounded in the source context.

        Args:
            response: The AI-generated answer to verify
            context: Source context the answer was generated from

        Returns:
            ResponseVerification with grounding status and confidence score
        """
        prompt = _RESPONSE_VERIFICATION_PROMPT.format(
            response=response,
            context=context[: self.MAX_CONTEXT_CHARS],
        )
        try:
            raw = await self.llm.generate(
                prompt=prompt,
                temperature=0.1,
                max_tokens=512,
                json_mode=True,
            )
            data = json.loads(self._extract_json(raw))
            confidence = _clamp(float(data.get("confidence_score", 0.75)))
            missing_citations = data.get("missing_citations", False)
            return ResponseVerification(
                is_grounded=data.get("is_grounded", True),
                confidence_score=confidence,
                ungrounded_claims=data.get("ungrounded_claims", []),
                missing_citations=missing_citations,
                suggestions=data.get("suggestions", []),
                needs_refinement=data.get("needs_refinement", (confidence < 0.7 or missing_citations)),
            )
        except json.JSONDecodeError as e:
            logger.warning("Response verification JSON parse failed: %s", e)
        except Exception as e:
            logger.error("Response verification failed: %s", e)

        return ResponseVerification(**_FALLBACK_VERIFICATION)

    async def refine_response(
        self,
        original_response: str,
        context: str,
        verification: ResponseVerification,
        query: str,
    ) -> str:
        """
        Rewrite a response flagged as needing improvement by verification.

        Args:
            original_response: Initial AI-generated answer
            context: Source context used for generation
            verification: Verification result detailing the issues
            query: Original user question

        Returns:
            Refined response with improved factual grounding
        """
        prompt = _REFINEMENT_PROMPT.format(
            query=query,
            original_response=original_response,
            issues_text=_format_issues(verification),
            context=context[: self.MAX_CONTEXT_CHARS],
        )
        try:
            refined = await self.llm.generate(prompt=prompt, temperature=0.2, max_tokens=2048)
            logger.info("Response successfully refined by Brain LLM")
            return refined.strip()
        except Exception as e:
            logger.warning("Response refinement failed, using original: %s", e)
            return original_response

    async def generate_chat_title(self, first_message: str) -> str:
        """
        Generate a short descriptive title from the first user message.

        Args:
            first_message: Opening message of the conversation

        Returns:
            A 3-6 word title string, or "New Conversation" on failure
        """
        prompt = _CHAT_TITLE_PROMPT.format(message=first_message)
        try:
            raw = await self.llm.generate(prompt=prompt, temperature=0.3, max_tokens=20)
            title = (raw or "").strip(' "\'\n*')
            return title or "New Conversation"
        except Exception as e:
            logger.warning("Failed to generate chat title: %s", e)
            return "New Conversation"

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_json(response: str | None) -> str:
        """
        Extract a JSON object string from an LLM response.
        Handles markdown code fences and leading/trailing prose.
        """
        if not response:
            return "{}"
        text = response.strip()
        if "```" in text:
            match = re.search(r"```(?:json)?\n?(.*?)```", text, re.DOTALL)
            if match:
                return match.group(1).strip()
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            # Try to fix truncated JSON by appending closing braces
            extracted = match.group(1).strip()
            # Simple balancing check: if more '{' than '}', try appending '}'
            open_braces = extracted.count('{')
            close_braces = extracted.count('}')
            if open_braces > close_braces:
                # This doesn't fix missing keys, but might fix a simple trailing cutoff
                extracted += '}' * (open_braces - close_braces)
            return extracted
            
        return text

    @staticmethod
    def _extract_keywords(query: str) -> list[str]:
        """Extract meaningful keywords by filtering stop words and short tokens."""
        words = query.lower().split()
        keywords = [
            w.strip("?.!,")
            for w in words
            if w.lower() not in _STOP_WORDS and len(w) > 2
        ]
        return keywords[:5] or words[:3]


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    """Clamp *value* to the closed interval [lo, hi]."""
    return max(lo, min(hi, value))


def _format_issues(verification: ResponseVerification) -> str:
    """Render a ResponseVerification's issues as a human-readable string for prompts."""
    lines: list[str] = []

    if verification.ungrounded_claims:
        lines.append("UNGROUNDED CLAIMS (remove or correct these):")
        lines.extend(f"- {c}" for c in verification.ungrounded_claims)

    if verification.missing_citations:
        if lines:
            lines.append("")
        lines.append("MISSING CITATIONS:")
        lines.append("- Add numeric citation markers like [1], [2] at the end of every claim")

    if verification.suggestions:
        if lines:
            lines.append("")
        lines.append("SUGGESTIONS:")
        lines.extend(f"- {s}" for s in verification.suggestions)

    if not lines:
        lines += [
            f"LOW CONFIDENCE SCORE: {verification.confidence_score:.2f}",
            "- Review all factual claims for accuracy",
            "- Ensure the response directly addresses the question",
            "- Add qualifiers where certainty is lacking",
        ]

    return "\n".join(lines)