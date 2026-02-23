"""
Gemini embeddings for JurisQuery.
Generates embeddings using Google's text-embedding-004 model.
"""
from google import genai

from app.config import settings


# Configure Gemini client
client = genai.Client(api_key=settings.gemini_api_key)


class GeminiEmbeddings:
    """Gemini embeddings implementation."""

    def __init__(self, model_name: str = "models/gemini-embedding-001"):
        """
        Initialize Gemini embeddings.
        
        Args:
            model_name: Embedding model to use
        """
        self.model_name = model_name
        self.dimension = 3072  # gemini-embedding-001 dimension

    async def embed_query(self, text: str) -> list[float]:
        """
        Generate embedding for a query text.
        
        Args:
            text: Text to embed
            
        Returns:
            list[float]: Embedding vector
        """
        import asyncio
        response = await asyncio.to_thread(
            client.models.embed_content,
            model=self.model_name,
            contents=text,
        )
        return response.embeddings[0].values

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings for multiple documents.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            list[list[float]]: List of embedding vectors
        """
        import asyncio
        embeddings = []
        
        # Process in batches to respect rate limits
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            for text in batch:
                response = await asyncio.to_thread(
                    client.models.embed_content,
                    model=self.model_name,
                    contents=text,
                )
                embeddings.append(response.embeddings[0].values)
        
        return embeddings
