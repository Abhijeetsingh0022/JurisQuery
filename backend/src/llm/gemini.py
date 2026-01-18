"""
Gemini LLM integration for JurisQuery.
Uses Google Gemini 2.5 Flash for text generation.
"""

from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config import settings


# Configure Gemini client
client = genai.Client(api_key=settings.gemini_api_key)


class GeminiLLM:
    """Gemini 2.5 Flash LLM implementation."""

    def __init__(self, model_name: str = "gemini-2.5-flash-preview-05-20"):
        """
        Initialize Gemini LLM.
        
        Args:
            model_name: Gemini model to use
        """
        self.model_name = model_name

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
        Generate text using Gemini.
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate
            
        Returns:
            str: Generated text
        """
        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )

        return response.text

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
