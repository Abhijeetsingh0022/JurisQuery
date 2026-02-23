"""
Groq LLM integration for JurisQuery.
Uses Groq's fast inference for LLaMA models as a fallback.
"""

from groq import Groq
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings


class GroqLLM:
    """Groq LLM implementation using LLaMA 3."""

    def __init__(self, model_name: str = "llama-3.3-70b-versatile"):
        """
        Initialize Groq LLM.
        
        Args:
            model_name: Groq model to use
        """
        self.model_name = model_name
        self.client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None

    def is_available(self) -> bool:
        """Check if Groq is configured."""
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
    ) -> str:
        """
        Generate text using Groq.
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate
            
        Returns:
            str: Generated text
        """
        if not self.client:
            raise ValueError("Groq API key not configured")

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        return response.choices[0].message.content
