"""
RAG service for JurisQuery.
Core RAG pipeline: embedding, retrieval, and generation.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


import io
import logging

import httpx
import pypdf
import docx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.documents.models import Document, DocumentChunk, DocumentStatus
from src.exceptions import NotFoundError, BadRequestError
from src.llm.gemini import GeminiLLM
from src.llm.groq_llm import GroqLLM
from src.rag.embeddings import GeminiEmbeddings
from src.rag.schemas import Citation, QueryResponse
from src.rag.vectorstore import QdrantVectorStore
from src.rag.prompts import LEGAL_RAG_PROMPT

logger = logging.getLogger(__name__)


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
    gemini_llm = GeminiLLM()
    groq_llm = GroqLLM()
    
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
    if not chunk_ids:
        # Handle case where no chunks are found (e.g. empty document or low similarity)
        return QueryResponse(
            answer="I couldn't find any relevant information in the document to answer your question.",
            citations=[],
            document_id=document_id,
            query=query,
            model="none",
        )

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
    
    # Step 5: Generate answer using LLM (with fallback)
    prompt = LEGAL_RAG_PROMPT.format(
        context=context,
        question=query,
    )
    
    model_used = "gemini-2.0-flash"
    try:
        answer = await gemini_llm.generate(prompt)
    except Exception as e:
        logger.warning(f"Gemini failed, falling back to Groq: {e}")
        if groq_llm.is_available():
            answer = await groq_llm.generate(prompt)
            model_used = "groq-llama-3.3-70b"
        else:
            raise  # Re-raise if no fallback
    
    return QueryResponse(
        answer=answer,
        citations=citations,
        document_id=document_id,
        query=query,
        model=model_used,
    )


def extract_text_from_pdf(content: bytes) -> list[tuple[str, int]]:
    """Extract text from PDF, returning list of (text, page_number)."""
    text_chunks = []
    try:
        pdf_file = io.BytesIO(content)
        reader = pypdf.PdfReader(pdf_file)
        
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text.strip():
                text_chunks.append((text, i + 1))
    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
        raise
        
    return text_chunks


def extract_text_from_docx(content: bytes) -> list[tuple[str, int]]:
    """Extract text from DOCX, returning list of (text, page_number)."""
    # DOCX doesn't have true pagination, so we'll treat paragraphs as chunks
    # or just return everything as page 1 for now
    text_chunks = []
    try:
        docx_file = io.BytesIO(content)
        doc = docx.Document(docx_file)
        
        full_text = []
        for para in doc.paragraphs:
            if para.text.strip():
                full_text.append(para.text)
        
        if full_text:
            text_chunks.append(("\n".join(full_text), 1))
            
    except Exception as e:
        logger.error(f"Error extracting DOCX text: {e}")
        raise
        
    return text_chunks


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Simple recursive character text splitter logic."""
    if not text:
        return []
    
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = start + chunk_size
        if end >= text_len:
            chunks.append(text[start:])
            break
            
        # Try to break at newline or space
        # Find last newline in the overlap zone
        boundary = text.rfind("\n", start, end)
        if boundary == -1 or boundary < start + (chunk_size - overlap):
            boundary = text.rfind(" ", start, end)
            
        if boundary != -1 and boundary > start:
            end = boundary
            
        chunks.append(text[start:end].strip())
        start = end - overlap if end < text_len else text_len
        
    return [c for c in chunks if c.strip()]


async def process_document_for_rag(
    document_id: UUID,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """
    Process a document for RAG by chunking and embedding.
    Runs in a background task with its own DB session.
    
    Args:
        document_id: ID of the document to process
        session_factory: Factory to create a new DB session
    """
    async with session_factory() as db:
        try:
            # 1. Get document
            query = select(Document).where(Document.id == document_id)
            result = await db.execute(query)
            document = result.scalar_one_or_none()
            
            if not document:
                logger.error(f"Document {document_id} not found for processing")
                return
            
            # Update status to PROCESSING
            document.status = DocumentStatus.PROCESSING
            await db.commit()
            
            # 2. Download content
            async with httpx.AsyncClient() as client:
                response = await client.get(document.file_url)
                response.raise_for_status()
                content = response.content
                
            # 3. Extract text
            extracted_data = [] # List of (text, page_number)
            if document.file_type == "pdf":
                extracted_data = extract_text_from_pdf(content)
            elif document.file_type == "docx":
                extracted_data = extract_text_from_docx(content)
            elif document.file_type == "txt":
                extracted_data = [(content.decode("utf-8"), 1)]
            else:
                raise BadRequestError("Unsupported file type")

            # Update status to VECTORIZING
            document.status = DocumentStatus.VECTORIZING
            document.page_count = len(extracted_data) if document.file_type == "pdf" else None
            await db.commit()

            # 4. Chunking
            all_chunks = []
            for text, page_num in extracted_data:
                text_chunks = chunk_text(text)
                for para_idx, chunk_content in enumerate(text_chunks, start=1):
                    all_chunks.append({
                        "content": chunk_content,
                        "page": page_num,
                        "paragraph": para_idx,  # Track paragraph number within page
                    })
            
            document.chunk_count = len(all_chunks)
            if not all_chunks:
                document.status = DocumentStatus.FAILED
                document.error_message = "No text could be extracted from the document."
                await db.commit()
                return

            # 5. Embedding
            embeddings_service = GeminiEmbeddings()
            texts_to_embed = [c["content"] for c in all_chunks]
            vectors = await embeddings_service.embed_documents(texts_to_embed)
            
            # 6. Save chunks to DB first to get IDs
            db_chunks = []
            for i, chunk_data in enumerate(all_chunks):
                db_chunk = DocumentChunk(
                    document_id=document.id,
                    chunk_index=i,
                    content=chunk_data["content"],
                    page_number=chunk_data["page"],
                    paragraph_number=chunk_data.get("paragraph"),
                )
                db.add(db_chunk)
                db_chunks.append(db_chunk)
            
            await db.flush() # Generate IDs
            
            # 7. Upsert to Qdrant
            vectorstore = QdrantVectorStore()
            chunk_ids = [str(c.id) for c in db_chunks]
            metadatas = [
                {
                    "page_number": c.page_number,
                    "paragraph_number": c.paragraph_number,
                    "chunk_index": c.chunk_index
                } 
                for c in db_chunks
            ]
            
            await vectorstore.upsert(
                vectors=vectors,
                chunk_ids=chunk_ids,
                document_id=str(document.id),
                metadatas=metadatas
            )
            
            # 8. Finalize
            document.status = DocumentStatus.READY
            await db.commit()
            logger.info(f"Document {document_id} processed successfully")
            
        except Exception as e:
            logger.exception(f"Error processing document {document_id}")
            if document:
                document.status = DocumentStatus.FAILED
                document.error_message = str(e)
                await db.commit()

