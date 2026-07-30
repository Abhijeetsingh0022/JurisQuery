import json
import logging
from typing import AsyncGenerator

from app.llm.gemini import GeminiLLM
from app.research.tavily_service import TavilyResearchService
from app.llm.brain import BrainLLM

logger = logging.getLogger(__name__)

SYNTHESIS_PROMPT = """\
You are an expert legal researcher. You have been provided with web search results to answer the user's question.

USER QUESTION: {query}

SEARCH RESULTS (Context):
{context}

INSTRUCTIONS:
1. Synthesize a comprehensive, professional answer to the user's question.
2. Ground your claims ONLY on the provided Search Results.
3. Every factual claim MUST be followed by the source citation index (e.g., [Web Source 1], [Web Source 2]).
4. If the search results do not provide enough information to fully answer the query, clearly state what information is missing.
5. Format your output in Markdown, using headers, bullet points, and paragraphs for readability.
"""

class AgenticResearchPipeline:
    """Orchestrates web research using Tavily Search API and Gemini for synthesis."""

    def __init__(self):
        self.tavily = TavilyResearchService()
        self.llm = GeminiLLM()
        self.brain = BrainLLM()

    async def execute_research(self, query: str, user_history: str = "") -> AsyncGenerator[dict, None]:
        """
        Executes the agentic loop. Yields intermediate states, then yields the final result.
        
        Yields dicts with keys:
        - status: str (message for UI)
        - step: str
        - done: bool
        - response: str (the final summarized markdown)
        - sources: list of dict (metadata of the sources used)
        """
        
        yield {
            "status": "Analyzing research question...",
            "step": "analyze",
            "done": False,
        }
        
        analysis = await self.brain.analyze_query(query, user_history)
        search_query = analysis.rewritten_query
        
        yield {
            "status": f"Searching web for: {search_query}...",
            "step": "search",
            "done": False,
        }
        
        results = await self.tavily.search(query=search_query, search_depth="advanced", max_results=5)
        
        if not results:
            yield {
                "status": "No relevant web resources found.",
                "step": "complete",
                "done": True,
                "response": "I couldn't find relevant information on the web to answer your question.",
                "sources": []
            }
            return

        yield {
            "status": f"Found {len(results)} sources. Synthesizing answer...",
            "step": "synthesize",
            "done": False,
        }

        # Format context
        context_parts = []
        sources = []
        for idx, res in enumerate(results, start=1):
            source_label = f"[Web Source {idx}]"
            context_parts.append(f"{source_label} Title: {res['title']}\nURL: {res['url']}\nContent: {res['content']}\n")
            sources.append({
                "id": idx,
                "title": res["title"],
                "url": res["url"],
            })
            
        context = "\n".join(context_parts)
        
        prompt = SYNTHESIS_PROMPT.format(query=query, context=context)
        
        try:
            # Stream the final synthesis
            final_response = []
            async for chunk in self.llm.generate_stream(prompt=prompt, temperature=0.2):
                final_response.append(chunk)
                yield {
                    "status": "Writing response...",
                    "step": "writing",
                    "done": False,
                    "delta": chunk,  # Can be pushed directly to client if needed
                }
            
            complete_response = "".join(final_response)
            
            # Optionally let Brain verify the synthesis, though here we'll just yield it directly.
            yield {
                "status": "Research complete.",
                "step": "complete",
                "done": True,
                "response": complete_response,
                "sources": sources
            }
            
        except Exception as e:
            logger.error("Synthesis failed: %s", e)
            yield {
                "status": "Error during synthesis.",
                "step": "error",
                "done": True,
                "response": "An error occurred while synthesizing the final response from the web search.",
                "sources": [],  # required: prevents KeyError in chat service consumer
            }
