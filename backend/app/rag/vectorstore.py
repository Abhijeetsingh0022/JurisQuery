"""
Qdrant vector store for JurisQuery.
Handles vector storage and retrieval using Qdrant Cloud.
"""

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    VectorParams,
)

from app.config import settings


class QdrantVectorStore:
    """Qdrant vector store implementation."""

    def __init__(self):
        """Initialize Qdrant client."""
        self.client = QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
        )
        self.collection_name = settings.qdrant_collection_name
        self.dimension = 3072  # Gemini gemini-embedding-001 dimension

    async def ensure_collection(self) -> None:
        """Ensure the collection exists with proper indexes, create if not."""
        collections = self.client.get_collections().collections
        collection_names = [c.name for c in collections]

        if self.collection_name in collection_names:
            # Check if existing collection has correct dimension
            collection_info = self.client.get_collection(self.collection_name)
            existing_dim = collection_info.config.params.vectors.size
            if existing_dim != self.dimension:
                # Dimension mismatch, need to recreate
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(
                    f"Qdrant collection dimension mismatch: expected {self.dimension}, got {existing_dim}. Recreating collection."
                )
                self.client.delete_collection(self.collection_name)
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.dimension,
                        distance=Distance.COSINE,
                    ),
                )
        else:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.dimension,
                    distance=Distance.COSINE,
                ),
            )
        
        # Ensure payload index for document_id exists (idempotent - recreate if needed)
        # This is needed for filtering queries by document_id
        try:
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="document_id",
                field_schema=PayloadSchemaType.KEYWORD,
            )
        except Exception:
            # Index already exists, ignore
            pass

    async def upsert(
        self,
        vectors: list[list[float]],
        chunk_ids: list[str],
        document_id: str,
        metadatas: list[dict] | None = None,
    ) -> None:
        """
        Upsert vectors to the collection.
        
        Args:
            vectors: List of embedding vectors
            chunk_ids: List of chunk IDs
            document_id: Parent document ID
            metadatas: Optional metadata for each vector
        """
        await self.ensure_collection()

        points = []
        for i, (vector, chunk_id) in enumerate(zip(vectors, chunk_ids)):
            payload = {
                "document_id": document_id,
                "chunk_id": chunk_id,
            }
            
            if metadatas and i < len(metadatas):
                payload.update(metadatas[i])

            points.append(
                PointStruct(
                    id=chunk_id,
                    vector=vector,
                    payload=payload,
                )
            )

        self.client.upsert(
            collection_name=self.collection_name,
            points=points,
        )

    async def search(
        self,
        query_vector: list[float],
        document_id: str,
        top_k: int = 5,
    ) -> list[dict]:
        """
        Search for similar vectors in a specific document.
        
        Args:
            query_vector: Query embedding vector
            document_id: Document ID to search within
            top_k: Number of results to return
            
        Returns:
            list[dict]: List of search results with chunk_id and score
        """
        # Ensure collection and indexes exist
        await self.ensure_collection()
        
        response = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            ),
            limit=top_k,
        )
        results = response.points

        return [
            {
                "chunk_id": hit.payload.get("chunk_id"),
                "score": hit.score,
                "page_number": hit.payload.get("page_number"),
                "paragraph_number": hit.payload.get("paragraph_number"),
            }
            for hit in results
        ]

    async def delete_by_document(self, document_id: str) -> None:
        """
        Delete all vectors belonging to a document.
        
        Args:
            document_id: Document ID to delete vectors for
        """
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            ),
        )
