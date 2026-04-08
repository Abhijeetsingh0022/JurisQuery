import logging
from typing import Any

has_tavily = True
try:
    from tavily import AsyncTavilyClient
except ImportError:
    has_tavily = False

from app.config import settings

logger = logging.getLogger(__name__)

class TavilyResearchService:
    """Wrapper around Tavily Search API for agentic web research."""

    def __init__(self) -> None:
        if not settings.tavily_api_key or not has_tavily:
            logger.warning("Tavily API key not found or library not installed. Web research will be disabled.")
            self.client = None
        else:
            self.client = AsyncTavilyClient(api_key=settings.tavily_api_key)

    async def search(self, query: str, search_depth: str = "advanced", max_results: int = 5) -> list[dict[str, Any]]:
        """
        Execute a web search using Tavily.
        
        Args:
            query: The search query string.
            search_depth: "basic" or "advanced".
            max_results: Max number of results.
            
        Returns:
            List of dictionaries containing url, title, and raw content.
        """
        if not self.client:
            return []

        logger.info("Executing Tavily search for: %s", query)
        try:
            response = await self.client.search(
                query=query,
                search_depth=search_depth,
                max_results=max_results,
                include_raw_content=True,
                include_answer=True,
            )
            
            results = []
            if "results" in response:
                for res in response["results"]:
                    results.append({
                        "title": res.get("title", ""),
                        "url": res.get("url", ""),
                        "content": res.get("raw_content", "") or res.get("content", ""),
                        "score": res.get("score", 0.0),
                    })
            return results
        except Exception as e:
            logger.error("Tavily search failed: %s", e)
            return []
