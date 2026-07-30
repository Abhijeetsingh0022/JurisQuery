"""
Gemini embeddings for JurisQuery.
Generates embeddings using Google's text-embedding-004 model.
"""
import asyncio
import logging

from google import genai
from google.genai.errors import ClientError

from app.config import settings

logger = logging.getLogger(__name__)

# Configure Gemini clients for API key rotation
clients = [genai.Client(api_key=key) for key in settings.gemini_api_keys]


class GeminiEmbeddings:
    """Gemini embeddings implementation with API key rotation."""

    def __init__(self, model_name: str = "models/gemini-embedding-2-preview") -> None:
        """
        Initialize Gemini embeddings.

        Args:
            model_name: Embedding model to use
        """
        self.model_name = model_name
        self.dimension = 3072  # gemini-embedding-2-preview dimension
        self.current_client_index = 0

    def _get_client(self):
        """Get current client and prepare fallback rotation."""
        if not clients:
            raise RuntimeError("No Gemini API keys configured.")
        return clients[self.current_client_index]

    def _rotate_client(self):
        """Rotate client index for key fallback."""
        if len(clients) > 1:
            self.current_client_index = (self.current_client_index + 1) % len(clients)
            logger.info("Rotated to next Gemini API key (index %d)", self.current_client_index)

    async def embed_query(self, text: str) -> list[float]:
        """
        Generate embedding for a query text.

        Args:
            text: Text to embed

        Returns:
            list[float]: Embedding vector
        """
        last_error = None
        for _ in range(max(1, len(clients))):
            client = self._get_client()
            try:
                response = await asyncio.to_thread(
                    client.models.embed_content,
                    model=self.model_name,
                    contents=text,
                )
                return response.embeddings[0].values
            except ClientError as e:
                last_error = e
                logger.warning("Gemini embed_query error: %s", e)
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) or "API_KEY_INVALID" in str(e):
                    self._rotate_client()
                    continue
                raise
            except Exception as e:
                logger.error("Unexpected error in embed_query: %s", e)
                raise
        if last_error:
            raise last_error

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings for multiple documents using native batching.

        Args:
            texts: List of texts to embed

        Returns:
            list[list[float]]: List of embedding vectors
        """
        embeddings = []
        # Gemini native batch limit is usually 100 for embed_content
        batch_size = 100

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            last_error = None
            success = False
            for _ in range(max(1, len(clients))):
                client = self._get_client()
                try:
                    response = await asyncio.to_thread(
                        client.models.embed_content,
                        model=self.model_name,
                        contents=batch,
                    )
                    embeddings.extend(e.values for e in response.embeddings)
                    success = True
                    break
                except ClientError as e:
                    last_error = e
                    logger.warning("Batch embedding API error for range %d-%d: %s", i, i + len(batch), e)
                    if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) or "API_KEY_INVALID" in str(e):
                        self._rotate_client()
                        continue
                    raise
                except Exception as e:
                    logger.error("Batch embedding failed for range %d-%d: %s", i, i + len(batch), e)
                    raise

            if not success and last_error:
                logger.error("Batch embedding failed permanently for range %d-%d: %s", i, i + len(batch), last_error)
                raise last_error

        return embeddings