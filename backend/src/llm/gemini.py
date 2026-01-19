"""
Gemini LLM integration for JurisQuery.
Uses Google Gemini 2.0 Flash for text generation with API key rotation.
"""

from google import genai
from google.genai import types
from google.genai.errors import ClientError
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config import settings


# Configure Gemini clients for each API key (for rotation)
clients = [genai.Client(api_key=key) for key in settings.gemini_api_keys]


class GeminiLLM:
    """Gemini 2.0 Flash LLM implementation with API key rotation."""

    def __init__(self, model_name: str = "gemini-2.0-flash"):
        """
        Initialize Gemini LLM.
        
        Args:
            model_name: Gemini model to use
        """
        self.model_name = model_name
        self.current_client_index = 0

    def _get_next_client(self):
        """Rotate to next available client."""
        self.current_client_index = (self.current_client_index + 1) % len(clients)
        return clients[self.current_client_index]

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60),
    )
    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> str:
        """
        Generate text using Gemini with automatic key rotation on rate limits.
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate
            
        Returns:
            str: Generated text
        """
        last_error = None
        
        # Try each available client
        for _ in range(len(clients)):
            client = clients[self.current_client_index]
            try:
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=temperature,
                        max_output_tokens=max_tokens,
                    ),
                )
                return response.text
            except ClientError as e:
                last_error = e
                # If rate limited (429), try next key
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    self._get_next_client()
                    continue
                raise  # Re-raise other errors
        
        # All keys exhausted
        raise last_error or Exception("All API keys exhausted")

    async def generate_stream(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ):
        """
        Generate text with streaming using Gemini.
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Yields:
            str: Generated text chunks
        """
        for chunk in client.models.generate_content_stream(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        ):
            if chunk.text:
                yield chunk.text
