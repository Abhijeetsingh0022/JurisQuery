"""
Qdrant vector store for JurisQuery.
Handles vector storage and retrieval using Qdrant Cloud.
"""
import logging

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    MatchAny,
    PayloadSchemaType,
    PointStruct,
    VectorParams,
)

from app.config import settings

logger = logging.getLogger(__name__)


class QdrantVectorStore:
    """Qdrant vector store implementation."""

    def __init__(self) -> None:
        """Initialise Qdrant client and collection configuration."""
        self.client = AsyncQdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
            timeout=60.0,
        )
        self.collection_name = settings.qdrant_collection_name
        self.dimension = 3072  # text-embedding-004 max dimension

    # ------------------------------------------------------------------
    # Collection Management
    # ------------------------------------------------------------------

    async def ensure_collection(self) -> None:
        """
        Ensure the collection exists with the correct vector dimension.
        Creates the collection if absent; recreates it on dimension mismatch.
        Idempotently creates a keyword payload index on `document_id`.
        """
        collections_resp = await self.client.get_collections()
        existing_names = {
            c.name for c in collections_resp.collections
        }

        if self.collection_name in existing_names:
            info = await self.client.get_collection(self.collection_name)
            existing_dim = info.config.params.vectors.size
            if existing_dim != self.dimension:
                logger.warning(
                    "Qdrant collection dimension mismatch: expected %d, got %d. "
                    "Recreating collection.",
                    self.dimension,
                    existing_dim,
                )
                await self.client.delete_collection(self.collection_name)
                await self._create_collection()
        else:
            await self._create_collection()

        await self._ensure_document_id_index()

    async def _create_collection(self) -> None:
        """Create the Qdrant collection with cosine similarity."""
        await self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=VectorParams(
                size=self.dimension,
                distance=Distance.COSINE,
            ),
        )

    async def _ensure_document_id_index(self) -> None:
        """Create a keyword payload index on `document_id` (idempotent)."""
        try:
            await self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="document_id",
                field_schema=PayloadSchemaType.KEYWORD,
            )
        except Exception:
            pass  # Index already exists

    # ------------------------------------------------------------------
    # Write Operations
    # ------------------------------------------------------------------

    async def upsert(
        self,
        vectors: list[list[float]],
        chunk_ids: list[str],
        document_id: str,
        metadatas: list[dict] | None = None,
    ) -> None:
        """
        Upsert vectors into the collection.

        Args:
            vectors: Embedding vectors to store
            chunk_ids: Corresponding chunk UUIDs (used as point IDs)
            document_id: Parent document ID stored in every point's payload
            metadatas: Optional per-vector metadata merged into the payload
        """
        await self.ensure_collection()

        points = [
            PointStruct(
                id=chunk_id,
                vector=vector,
                payload={
                    "document_id": document_id,
                    "chunk_id": chunk_id,
                    **(metadatas[i] if metadatas and i < len(metadatas) else {}),
                },
            )
            for i, (vector, chunk_id) in enumerate(zip(vectors, chunk_ids))
        ]

        await self.client.upsert(
            collection_name=self.collection_name,
            points=points,
        )

    async def delete_by_document(self, document_id: str) -> None:
        """
        Delete all vectors belonging to a document.

        Args:
            document_id: Document ID whose vectors should be removed
        """
        await self.client.delete(
            collection_name=self.collection_name,
            points_selector=_document_filter(document_id),
        )

    # ------------------------------------------------------------------
    # Read Operations
    # ------------------------------------------------------------------

    async def search(
        self,
        query_vector: list[float],
        document_id: str | list[str],
        top_k: int = 5,
    ) -> list[dict]:
        """
        Search for the most similar vectors within specific document(s).

        Args:
            query_vector: Query embedding vector
            document_id: Scope the search to this document or list of documents
            top_k: Number of results to return

        Returns:
            list[dict]: Results with chunk_id, score, page_number,
                        paragraph_number, and type fields
        """
        await self.ensure_collection()

        response = await self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            query_filter=_document_filter(document_id),
            limit=top_k,
        )

        return [
            {
                "chunk_id": hit.payload.get("chunk_id"),
                "score": hit.score,
                "page_number": hit.payload.get("page_number"),
                "paragraph_number": hit.payload.get("paragraph_number"),
                "type": "vector",
            }
            for hit in response.points
        ]


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _document_filter(document_id: str | list[str]) -> Filter:
    """Return a Qdrant filter that matches a single document ID or any of a list of document IDs."""
    
    match_condition = MatchAny(any=document_id) if isinstance(document_id, list) else MatchValue(value=document_id)
    
    return Filter(
        must=[
            FieldCondition(
                key="document_id",
                match=match_condition,
            )
        ]
    )