"""
Brain LLM module for JurisQuery.
Provides meta-reasoning capabilities: query understanding, response verification.
"""

import json
import logging
import re
from pydantic import BaseModel

from app.llm.gemini import GeminiLLM


logger = logging.getLogger(__name__)


class QueryAnalysis(BaseModel):
    """Result of analyzing a user query."""
    query_type: str  # "definition", "comparison", "clause_search", "summary", "general"
    key_entities: list[str]  # Legal terms, party names, clauses mentioned
    rewritten_query: str  # Expanded/clarified query for better search
    search_keywords: list[str]  # Keywords for hybrid search boost


class ResponseVerification(BaseModel):
    """Result of verifying a response against sources."""
    is_grounded: bool  # All claims backed by citations
    confidence_score: float  # 0-1 confidence in response accuracy
    ungrounded_claims: list[str]  # Claims that lack citation support
    suggestions: list[str]  # Suggestions to improve the response
    needs_refinement: bool  # Whether response should be refined


QUERY_ANALYSIS_PROMPT = """You are a legal query optimizer for a RAG system analyzing Indian legal documents.

Analyze the user's question and output a JSON object with:
1. "query_type": One of ["definition", "comparison", "clause_search", "summary", "general"]
2. "key_entities": List of legal terms, party names, clause types, or concepts mentioned
3. "rewritten_query": A more detailed, search-optimized version of the question
4. "search_keywords": 3-5 specific keywords/phrases for document search

IMPORTANT RULES:
- For follow-up questions (referencing "it", "this", "that"), use chat history to expand
- Add relevant legal terminology to rewritten_query
- Keep rewritten_query under 100 words
- Focus on Indian legal context

CHAT HISTORY:
{chat_history}

USER QUESTION: {query}

Respond with ONLY valid JSON, no markdown:"""


RESPONSE_VERIFICATION_PROMPT = """You are a legal response verifier for a RAG system.

Your job is to check if the AI's answer is properly grounded in the provided source context.

AI RESPONSE:
{response}

SOURCE CONTEXT (what the AI had access to):
{context}

Analyze and output a JSON object with:
1. "is_grounded": true if ALL factual claims are supported by the context, false otherwise
2. "confidence_score": 0.0-1.0 score of how well-supported the response is
3. "ungrounded_claims": List of specific claims that are NOT supported by context (empty if all grounded)
4. "suggestions": List of 1-2 brief suggestions to improve accuracy (empty if excellent)
5. "needs_refinement": true if confidence_score < 0.7 or there are ungrounded claims

Be strict but fair. Legal responses should cite specific provisions, not make general claims.

Respond with ONLY valid JSON, no markdown:"""


class BrainLLM:
    """
    Brain LLM for meta-reasoning tasks.
    Uses Gemini Flash for fast, lightweight reasoning.
    
    Note: Timeouts are handled by GeminiLLM's tenacity retry configuration.
    """
    
    # Consistent context limit across all methods
    MAX_CONTEXT_CHARS = 8000
    
    def __init__(self):
        self.llm = GeminiLLM(model_name="gemini-3-flash-preview")
    
    def _clean_json_response(self, response: str) -> str:
        """Remove markdown code blocks from LLM response."""
        clean = response.strip()
        if clean.startswith("```"):
            clean = re.sub(r"```(?:json)?\n?", "", clean)
            clean = clean.rstrip("`").strip()
        return clean
    
    def _clamp(self, value: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
        """Clamp a value to a range."""
        return max(min_val, min(max_val, value))
    
    def _extract_keywords(self, query: str) -> list[str]:
        """Extract meaningful keywords from query, filtering stop words."""
        stop_words = {"what", "is", "the", "a", "an", "in", "on", "at", "for", "to", 
                     "of", "and", "or", "how", "why", "when", "where", "who", "which",
                     "this", "that", "these", "those", "are", "was", "were", "be", "been"}
        words = query.lower().split()
        keywords = [w.strip("?.!,") for w in words if w.lower() not in stop_words and len(w) > 2]
        return keywords[:5] if keywords else words[:3]
    
    async def analyze_query(
        self,
        query: str,
        chat_history: str = "",
    ) -> QueryAnalysis:
        """
        Analyze a user query to understand intent and optimize for search.
        
        Args:
            query: User's natural language question
            chat_history: Formatted previous conversation (optional)
            
        Returns:
            QueryAnalysis: Structured analysis with rewritten query
        """
        prompt = QUERY_ANALYSIS_PROMPT.format(
            query=query,
            chat_history=chat_history or "None"
        )
        
        try:
            response = await self.llm.generate(
                prompt=prompt,
                temperature=0.1,
                max_tokens=512,
            )
            
            clean_response = self._clean_json_response(response)
            data = json.loads(clean_response)
            
            return QueryAnalysis(
                query_type=data.get("query_type", "general"),
                key_entities=data.get("key_entities", []),
                rewritten_query=data.get("rewritten_query", query),
                search_keywords=data.get("search_keywords", []) or self._extract_keywords(query),
            )
            
        except json.JSONDecodeError as e:
            logger.warning(f"Query analysis JSON parse failed: {e}")
            return QueryAnalysis(
                query_type="general",
                key_entities=[],
                rewritten_query=query,
                search_keywords=self._extract_keywords(query),
            )
        except Exception as e:
            logger.error(f"Query analysis failed with unexpected error: {e}")
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
        Verify if an AI response is properly grounded in the source context.
        
        Args:
            response: The AI-generated answer
            context: The source context provided to the AI
            
        Returns:
            ResponseVerification: Analysis of response grounding
        """
        prompt = RESPONSE_VERIFICATION_PROMPT.format(
            response=response,
            context=context[:self.MAX_CONTEXT_CHARS]
        )
        
        try:
            result = await self.llm.generate(
                prompt=prompt,
                temperature=0.1,
                max_tokens=512,
            )
            
            clean_response = self._clean_json_response(result)
            data = json.loads(clean_response)
            
            # Clamp confidence score to valid range
            raw_confidence = float(data.get("confidence_score", 0.75))
            confidence = self._clamp(raw_confidence, 0.0, 1.0)
            
            return ResponseVerification(
                is_grounded=data.get("is_grounded", True),
                confidence_score=confidence,
                ungrounded_claims=data.get("ungrounded_claims", []),
                suggestions=data.get("suggestions", []),
                needs_refinement=data.get("needs_refinement", confidence < 0.7),
            )
            
        except json.JSONDecodeError as e:
            logger.warning(f"Response verification JSON parse failed: {e}")
            return ResponseVerification(
                is_grounded=True,
                confidence_score=0.75,
                ungrounded_claims=[],
                suggestions=[],
                needs_refinement=False,
            )
        except Exception as e:
            logger.error(f"Response verification failed with unexpected error: {e}")
            return ResponseVerification(
                is_grounded=True,
                confidence_score=0.75,
                ungrounded_claims=[],
                suggestions=[],
                needs_refinement=False,
            )

    async def refine_response(
        self,
        original_response: str,
        context: str,
        verification: ResponseVerification,
        query: str,
    ) -> str:
        """
        Refine a response that was flagged as needing improvement.
        
        Args:
            original_response: The initial AI-generated answer
            context: The source context
            verification: Verification results with issues found
            query: The original user question
            
        Returns:
            str: Refined response with improved accuracy
        """
        # Build issues text from verification results
        issues_parts = []
        
        if verification.ungrounded_claims:
            issues_parts.append("UNGROUNDED CLAIMS (remove or correct these):")
            for claim in verification.ungrounded_claims:
                issues_parts.append(f"- {claim}")
        
        if verification.suggestions:
            issues_parts.append("\nSUGGESTIONS:")
            for suggestion in verification.suggestions:
                issues_parts.append(f"- {suggestion}")
        
        # FIX: Add fallback when no specific issues but low confidence
        if not issues_parts:
            issues_parts.append(f"LOW CONFIDENCE SCORE: {verification.confidence_score:.2f}")
            issues_parts.append("- Review all factual claims for accuracy")
            issues_parts.append("- Ensure response directly addresses the question")
            issues_parts.append("- Add qualifiers where certainty is lacking")
        
        issues_text = "\n".join(issues_parts)
        
        prompt = f"""You are a legal response refinement specialist.

The following response was generated but has accuracy issues. Rewrite it to fix the problems.

ORIGINAL QUESTION: {query}

ORIGINAL RESPONSE:
{original_response}

ISSUES IDENTIFIED:
{issues_text}

SOURCE CONTEXT (use ONLY this for facts):
{context[:self.MAX_CONTEXT_CHARS]}

INSTRUCTIONS:
1. Remove or correct any ungrounded claims
2. Ensure all factual statements are supported by the context
3. Maintain the same structure and helpful tone
4. Keep the response concise and legally precise
5. If information is not available in context, say "Based on the available document..."

Write the improved response directly (no preamble):"""

        try:
            refined = await self.llm.generate(
                prompt=prompt,
                temperature=0.2,
                max_tokens=2048,
            )
            logger.info("Response successfully refined by Brain LLM")
            return refined.strip()
            
        except Exception as e:
            logger.warning(f"Response refinement failed, using original: {e}")
            return original_response
