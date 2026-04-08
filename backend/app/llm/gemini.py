"""
Gemini LLM integration for JurisQuery.
Text generation with automatic API key rotation and rate-limit handling.
"""
import asyncio
import logging
from collections.abc import AsyncIterator

from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)

# One client per API key — rotated on rate-limit errors
_clients: list[genai.Client] = [
    genai.Client(api_key=key) for key in settings.gemini_api_keys
]


class GeminiLLM:
    """
    Gemini LLM with round-robin API key rotation.
    Rotation is triggered on 429 / RESOURCE_EXHAUSTED responses.
    Retries and back-off are handled by tenacity.
    """

    def __init__(self, model_name: str = "gemini-flash-lite-latest") -> None:
        """
        Args:
            model_name: Gemini model identifier to use for generation
        """
        self.model_name = model_name
        self._client_index = 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=3),
        reraise=True,
    )
    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        json_mode: bool = False,
    ) -> str:
        """
        Generate text, rotating API keys on rate-limit errors.

        Args:
            prompt: Input prompt
            temperature: Sampling temperature (0.0 – 1.0)
            max_tokens: Maximum tokens to generate
            json_mode: If True, enforces JSON output via response_mime_type

        Returns:
            Generated text string, or "" if blocked by safety filters

        Raises:
            Exception: Re-raised after all keys are exhausted
        """
        last_error: Exception | None = None

        for _ in range(len(_clients)):
            client = self._next_client()
            try:
                config = types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                )
                if json_mode:
                    config.response_mime_type = "application/json"

                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=self.model_name,
                    contents=prompt,
                    config=config,
                )
                return self._extract_text(response)

            except Exception as e:
                last_error = e
                if _is_rate_limit(e):
                    logger.warning("Gemini rate limit hit, rotating to next key")
                    continue
                logger.error("Gemini API error: %s", e)
                raise

        raise last_error or RuntimeError("All Gemini API keys exhausted")

    async def generate_stream(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> AsyncIterator[str]:
        """
        Stream generated text chunk by chunk.

        Args:
            prompt: Input prompt
            temperature: Sampling temperature (0.0 – 1.0)
            max_tokens: Maximum tokens to generate

        Yields:
            Non-empty text chunks as they arrive
        """
        client = self._next_client()
        try:
            stream = await client.aio.models.generate_content_stream(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )
            async for chunk in stream:
                if chunk.text:
                    yield chunk.text
        except AttributeError:
            # Fallback to threading if older SDK without .aio
            stream = await asyncio.to_thread(
                client.models.generate_content_stream,
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )
            while True:
                try:
                    chunk = await asyncio.to_thread(next, stream)
                    if chunk.text:
                        yield chunk.text
                except StopIteration:
                    break

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _next_client(self) -> genai.Client:
        """Advance to and return the next client in round-robin order."""
        self._client_index = (self._client_index + 1) % len(_clients)
        return _clients[self._client_index]

    @staticmethod
    def _extract_text(response) -> str:
        """Safely extract text from a Gemini response, returning '' on safety blocks."""
        try:
            if hasattr(response, "text") and response.text:
                return response.text
            logger.warning("Gemini returned an empty response (possibly safety-filtered)")
            return ""
        except Exception as e:
            logger.warning("Error extracting text from Gemini response: %s", e)
            return ""


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _is_rate_limit(error: Exception) -> bool:
    """Return True if *error* indicates a Gemini rate-limit, 503 unavailable, or quota exhaustion."""
    msg = str(error)
    return any(token in msg for token in ("429", "503", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "Quota"))