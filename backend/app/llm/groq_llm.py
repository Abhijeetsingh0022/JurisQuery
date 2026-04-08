"""
Groq LLM integration for JurisQuery.
Uses Groq's fast inference for LLaMA models as a fallback.
"""
import asyncio
import logging

from groq import AsyncGroq
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)


class GroqLLM:
    """
    Groq LLM using LLaMA 3 for fast fallback inference.
    Instantiated with a None client when no API key is configured,
    allowing callers to check availability via is_available() before use.
    """

    def __init__(self, model_name: str = "llama-3.3-70b-versatile") -> None:
        """
        Args:
            model_name: Groq model identifier to use for generation
        """
        self.model_name = model_name
        self.client: AsyncGroq | None = (
            AsyncGroq(api_key=settings.groq_api_key) if settings.groq_api_key else None
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def is_available(self) -> bool:
        """Return True if a Groq client has been initialised."""
        return self.client is not None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
    )
    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        json_mode: bool = False,
    ) -> str:
        """
        Generate text using Groq.

        Args:
            prompt: Input prompt
            temperature: Sampling temperature (0.0 – 1.0)
            max_tokens: Maximum tokens to generate
            json_mode: If True, enforces JSON response format

        Returns:
            Generated text string

        Raises:
            RuntimeError: If Groq is not configured
        """
        if not self.client:
            raise RuntimeError("Groq API key is not configured")

        kwargs = {
            "model": self.model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await self.client.chat.completions.create(**kwargs)
        text = response.choices[0].message.content
        logger.debug("Groq generation complete: %d chars", len(text or ""))
        return text