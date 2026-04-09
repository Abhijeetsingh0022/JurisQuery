"""
Gemini embeddings for JurisQuery.
Generates embeddings using Google's text-embedding-004 model.
"""
import asyncio

from google import genai

from app.config import settings


# Configure Gemini client
client = genai.Client(api_key=settings.gemini_api_key)


class GeminiEmbeddings:
    """Gemini embeddings implementation."""

    def __init__(self, model_name: str = "models/gemini-embedding-2-preview") -> None:
        """
        Initialize Gemini embeddings.

        Args:
            model_name: Embedding model to use
        """
        self.model_name = model_name
        self.dimension = 3072  # gemini-embedding-2-preview dimension

    async def embed_query(self, text: str) -> list[float]:
        """
        Generate embedding for a query text.

        Args:
            text: Text to embed

        Returns:
            list[float]: Embedding vector
        """
        response = await asyncio.to_thread(
            client.models.embed_content,
            model=self.model_name,
            contents=text,
        )
        return response.embeddings[0].values

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
            try:
                response = await asyncio.to_thread(
                    client.models.embed_content,
                    model=self.model_name,
                    contents=batch,
                )
                embeddings.extend(e.values for e in response.embeddings)
            except Exception as e:
                logger.error("Batch embedding failed for range %d-%d: %s", i, i + len(batch), e)
                raise

        return embeddings