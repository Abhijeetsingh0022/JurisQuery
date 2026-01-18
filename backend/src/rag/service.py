"""
RAG service for JurisQuery.
Core RAG pipeline: embedding, retrieval, and generation.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.documents.models import Document, DocumentChunk
from src.exceptions import NotFoundError
from src.llm.gemini import GeminiLLM
from src.rag.embeddings import GeminiEmbeddings
from src.rag.schemas import Citation, QueryResponse
from src.rag.vectorstore import QdrantVectorStore
from src.rag.prompts import LEGAL_RAG_PROMPT


async def query_document(
    db: AsyncSession,
    document_id: UUID,
    query: str,
    user_id: str,
    top_k: int = 5,
) -> QueryResponse:
    """
    Query a document using the RAG pipeline.
    
    Args:
        db: Database session
        document_id: ID of the document to query
        query: User's natural language question
        user_id: ID of the requesting user
        top_k: Number of chunks to retrieve
        
    Returns:
        QueryResponse: AI-generated answer with citations
        
    Raises:
        NotFoundError: If document not found
    """
    # Verify document access
    doc_query = select(Document).where(
        Document.id == document_id,
        Document.user_id == user_id,
    )
    result = await db.execute(doc_query)
    document = result.scalar_one_or_none()
    
    if not document:
        raise NotFoundError("Document")
    
    # Initialize components
    embeddings = GeminiEmbeddings()
    vectorstore = QdrantVectorStore()
    llm = GeminiLLM()
    
    # Step 1: Embed the query
    query_embedding = await embeddings.embed_query(query)
    
    # Step 2: Retrieve relevant chunks from vector store
    retrieved_chunks = await vectorstore.search(
        query_vector=query_embedding,
        document_id=str(document_id),
        top_k=top_k,
    )
    
    # Step 3: Load chunk content from database
    chunk_ids = [chunk["chunk_id"] for chunk in retrieved_chunks]
    chunks_query = select(DocumentChunk).where(DocumentChunk.id.in_(chunk_ids))
    chunks_result = await db.execute(chunks_query)
    db_chunks = {str(c.id): c for c in chunks_result.scalars().all()}
    
    # Step 4: Build context from retrieved chunks
    context_parts = []
    citations = []
    
    for i, chunk_data in enumerate(retrieved_chunks):
        chunk_id = chunk_data["chunk_id"]
        db_chunk = db_chunks.get(chunk_id)
        
        if db_chunk:
            context_parts.append(
                f"[Source {i+1}: Page {db_chunk.page_number or 'N/A'}, "
                f"Para {db_chunk.paragraph_number or 'N/A'}]\n{db_chunk.content}"
            )
            
            citations.append(Citation(
                chunk_id=db_chunk.id,
                content=db_chunk.content[:500],  # Truncate for response
                page_number=db_chunk.page_number,
                paragraph_number=db_chunk.paragraph_number,
                relevance_score=chunk_data.get("score", 0.0),
            ))
    
    context = "\n\n---\n\n".join(context_parts)
    
    # Step 5: Generate answer using LLM
    prompt = LEGAL_RAG_PROMPT.format(
        context=context,
        question=query,
    )
    
    answer = await llm.generate(prompt)
    
    return QueryResponse(
        answer=answer,
        citations=citations,
        document_id=document_id,
        query=query,
        model="gemini-2.5-flash",
    )


async def process_document_for_rag(
    db: AsyncSession,
    document_id: UUID,
) -> None:
    """
    Process a document for RAG by chunking and embedding.
    Called after document upload.
    
    Args:
        db: Database session
        document_id: ID of the document to process
    """
    # Get document
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    document = result.scalar_one_or_none()
    
    if not document:
        raise NotFoundError("Document")
    
    # TODO: Implement full processing pipeline
    # 1. Download document from Cloudinary
    # 2. Extract text (PDF/DOCX)
    # 3. Chunk text with overlap
    # 4. Generate embeddings for chunks
    # 5. Store in Qdrant
    # 6. Save chunks to database
    # 7. Update document status
    
    pass
