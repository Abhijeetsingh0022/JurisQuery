"""
RAG service for JurisQuery.
Core RAG pipeline: embedding, retrieval, and generation.
"""

from uuid import UUID

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession


import io
import logging
import re

import httpx
import pypdf
import docx
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


async def search_document_keywords(
    db: AsyncSession,
    document_id: UUID,
    query: str,
    limit: int = 15,
) -> list[dict]:
    """
    Search document chunks using keyword matching (Postgres).
    Uses simple ILIKE for major terms and scoring based on term frequency.
    """
    # Simply split query into meaningful terms (filtering out small words)
    stop_words = {"the", "a", "an", "in", "on", "at", "for", "to", "of", "and", "or", "is"}
    terms = [t for t in query.lower().split() if len(t) > 3 and t not in stop_words]
    
    if not terms:
        return []

    # Build a query that looks for these terms in content
    # We'll use a simple scoring: count how many terms appear
    
    # Build conditions using SQLAlchemy expressions (avoiding SQL injection)
    conditions = []
    for term in terms:
        term_pattern = f"%{term}%"
        conditions.append(DocumentChunk.content.ilike(term_pattern))

    if not conditions:
        return []

    # For scoring, we count matching terms programmatically after fetch
    # This is safer than building raw SQL CASE statements
    stmt = (
        select(DocumentChunk)
        .where(
            DocumentChunk.document_id == document_id,
            or_(*conditions)
        )
        .limit(limit * 2)  # Fetch extra to allow for re-ranking
    )
    
    result = await db.execute(stmt)
    chunks = result.scalars().all()
    
    # Score chunks by counting term matches
    hits = []
    for chunk in chunks:
        content_lower = chunk.content.lower()
        score = sum(1 for term in terms if term in content_lower)
        norm_score = score / len(terms) if terms else 0
        hits.append({
            "chunk_id": str(chunk.id),
            "score": float(norm_score),
            "type": "keyword"
        })
    
    # Sort by score and limit
    hits.sort(key=lambda x: x["score"], reverse=True)
    return hits[:limit]


def perform_rrf_fusion(
    vector_results: list[dict], 
    keyword_results: list[dict], 
    k: int = 60
) -> list[dict]:
    """
    Reciprocal Rank Fusion to merge and re-rank results.
    Score = 1 / (rank + k)
    """
    scores = {}
    
    # Process vector results
    for rank, hit in enumerate(vector_results):
        chunk_id = hit["chunk_id"]
        if chunk_id not in scores:
            scores[chunk_id] = 0.0
        scores[chunk_id] += 1 / (rank + k)
        
    # Process keyword results
    for rank, hit in enumerate(keyword_results):
        chunk_id = hit["chunk_id"]
        if chunk_id not in scores:
            scores[chunk_id] = 0.0
        scores[chunk_id] += 1 / (rank + k)
        
    # Sort by fused score
    sorted_ids = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    # Reconstruct fused list with metadata from sources
    fused_results = []
    
    # Create lookup map for existing data
    all_hits = {h["chunk_id"]: h for h in vector_results}
    all_hits.update({h["chunk_id"]: h for h in keyword_results})
    
    for chunk_id, score in sorted_ids:
        original_hit = all_hits.get(chunk_id)
        if original_hit:
            fused_hit = original_hit.copy()
            fused_hit["score"] = score  # Update with RRF score
            fused_results.append(fused_hit)
            
    return fused_results


async def query_document(
    db: AsyncSession,
    document_id: UUID,
    query: str,
    user_id: str,
    chat_history: list[dict] | None = None,
    top_k: int = 15,
) -> QueryResponse:
    """
    Query a document using the RAG pipeline.
    
    Args:
        db: Database session
        document_id: ID of the document to query
        query: User's natural language question
        user_id: ID of the requesting user
        chat_history: List of previous messages [{"role": "user", "content": "..."}, ...]
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
    
    # Import Brain LLM for query optimization
    from src.llm.brain import BrainLLM
    brain = BrainLLM()
    
    # Format chat history if provided
    history_str = ""
    if chat_history:
        history_parts = []
        for msg in chat_history[-6:]:  # Keep last 6 messages
            role = "User" if msg["role"] == "user" else "JurisQuery"
            history_parts.append(f"{role}: {msg['content']}")
        history_str = "\n".join(history_parts)
    
    # Step 1: Query Understanding (Brain LLM)
    # Analyze query to understand intent and rewrite for better search
    query_analysis = await brain.analyze_query(query, history_str)
    logger.info(
        f"Query Analysis: type={query_analysis.query_type}, "
        f"entities={query_analysis.key_entities}, "
        f"keywords={query_analysis.search_keywords}"
    )
    
    # Use rewritten query for embedding (richer context)
    search_query = query_analysis.rewritten_query
    query_embedding = await embeddings.embed_query(search_query)
    
    # Step 2: Parallel Retrieval (Hybrid Search)
    
    # 2a. Semantic Search (Qdrant)
    vector_results = await vectorstore.search(
        query_vector=query_embedding,
        document_id=str(document_id),
        top_k=top_k,
    )
    
    # 2b. Keyword Search (Database)
    # Combine original query with Brain-extracted keywords for better coverage
    enhanced_keyword_query = f"{query} {' '.join(query_analysis.search_keywords)}"
    keyword_results = await search_document_keywords(
        db=db,
        document_id=document_id,
        query=enhanced_keyword_query,
        limit=top_k
    )
    
    # 2c. Reciprocal Rank Fusion
    if keyword_results:
        retrieved_chunks = perform_rrf_fusion(vector_results, keyword_results)[:top_k]
    else:
        retrieved_chunks = vector_results
    
    # Step 3: Load CHILD chunks from database (they were searched)
    child_chunk_ids = [chunk["chunk_id"] for chunk in retrieved_chunks]
    if not child_chunk_ids:
        return QueryResponse(
            answer="I couldn't find any relevant information in the document to answer your question.",
            citations=[],
            document_id=document_id,
            query=query,
            model="none",
        )

    child_chunks_query = select(DocumentChunk).where(DocumentChunk.id.in_(child_chunk_ids))
    child_chunks_result = await db.execute(child_chunks_query)
    db_child_chunks = {str(c.id): c for c in child_chunks_result.scalars().all()}
    
    # Step 4: Get unique PARENT chunk IDs from the found children
    parent_ids = set()
    for chunk_data in retrieved_chunks:
        child = db_child_chunks.get(chunk_data["chunk_id"])
        if child and child.parent_chunk_id:
            parent_ids.add(child.parent_chunk_id)
    
    # If no parents found (legacy data), fall back to using children as context
    if parent_ids:
        parent_query = select(DocumentChunk).where(DocumentChunk.id.in_(list(parent_ids)))
        parent_result = await db.execute(parent_query)
        db_parent_chunks = {str(c.id): c for c in parent_result.scalars().all()}
    else:
        # Fallback: use child chunks directly (for backward compatibility)
        db_parent_chunks = db_child_chunks
    
    # Step 5: Build context from PARENT chunks (richer context)
    context_parts = []
    citations = []
    
    # Add document metadata header
    context_parts.append(
        f"**DOCUMENT: {document.original_filename}**\n"
        f"Total Pages: {document.page_count or 'Unknown'} | "
        f"Retrieved Sources: {len(db_parent_chunks)}\n"
    )
    
    # Track which parents we've already added to avoid duplicates
    added_parents = set()
    
    for i, chunk_data in enumerate(retrieved_chunks):
        child_id = chunk_data["chunk_id"]
        child = db_child_chunks.get(child_id)
        
        if not child:
            continue
        
        # Get parent chunk for context
        parent_id = str(child.parent_chunk_id) if child.parent_chunk_id else child_id
        parent = db_parent_chunks.get(parent_id)
        
        # Use child for citation (specific match)
        citations.append(Citation(
            chunk_id=child.id,
            content=child.content[:500],
            page_number=child.page_number,
            paragraph_number=child.paragraph_number,
            relevance_score=chunk_data.get("score", 0.0),
        ))
        
        # Add parent to context only once (avoid duplicates)
        if parent and parent_id not in added_parents:
            added_parents.add(parent_id)
            section_info = f" | Section: {parent.section_title}" if parent.section_title else ""
            context_parts.append(
                f"[Source {len(added_parents)}: Page {parent.page_number or 'N/A'}{section_info}]\n{parent.content}"
            )
    
    context = "\n\n---\n\n".join(context_parts)
    
    # Step 5: Generate answer using LLM (with fallback)
    # Check if prompt accepts chat_history, if not append it to context or question
    # We will update the prompt template separately, but for now let's format safely
    
    prompt = LEGAL_RAG_PROMPT.format(
        context=context,
        question=query,
        chat_history=history_str
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
    
    # Step 6: Verify response grounding (Brain LLM Phase B)
    verification = await brain.verify_response(answer, context)
    logger.info(
        f"Response Verification: grounded={verification.is_grounded}, "
        f"confidence={verification.confidence_score:.2f}, "
        f"needs_refinement={verification.needs_refinement}"
    )
    
    # If verification finds issues, log them for monitoring
    if verification.ungrounded_claims:
        logger.warning(f"Ungrounded claims detected: {verification.ungrounded_claims}")
    
    # Step 7: Conditional Response Refinement (Brain LLM Phase C)
    final_answer = answer
    if verification.needs_refinement:
        logger.info("Triggering response refinement due to low confidence or ungrounded claims")
        final_answer = await brain.refine_response(
            original_response=answer,
            context=context,
            verification=verification,
            query=query,
        )
        model_used = f"{model_used}+brain-refined"
    
    return QueryResponse(
        answer=final_answer,
        citations=citations,
        document_id=document_id,
        query=query,
        model=model_used,
    )


def is_header(line: str) -> bool:
    """Check if a line looks like a legal document header."""
    line = line.strip()
    if not line or len(line) > 100:  # Headers usually aren't super long
        return False
        
    # Pattern 1: Standard keywords
    # "Article 1", "Section IV", "Chapter 5", "PART III"
    if re.match(r'^(?:ARTICLE|SECTION|CHAPTER|PART)\s+[0-9IVX]+', line, re.IGNORECASE):
        return True
        
    # Pattern 2: Numbered lists often used as headers in Indian law
    # "1. Short title", "2. Definitions" (Check for bold upper logic if possible, but here just regex)
    # We insist on a letter following to avoid simple list items
    if re.match(r'^\d+\.\s+[A-Z][a-zA-Z\s]+$', line):
        return True
    
    # Pattern 3: All caps short lines (often titles)
    # Exclude simple words like "THE", "AND"
    if line.isupper() and len(line) > 4 and len(line.split()) < 10:
        return True

    return False


def split_by_headers(text: str) -> list[tuple[str | None, str]]:
    """Split text into segments based on detected headers."""
    lines = text.split('\n')
    segments = []
    
    current_header = None
    current_buffer = []
    
    for line in lines:
        if is_header(line):
            # If we have content in buffer, save it with previous header
            if current_buffer:
                segments.append((current_header, "\n".join(current_buffer)))
                current_buffer = []
            
            # This line becomes the new header, also add it to content for context
            current_header = line.strip()
            current_buffer.append(line)
        else:
            current_buffer.append(line)
            
    # Flush remaining buffer
    if current_buffer:
        segments.append((current_header, "\n".join(current_buffer)))
        
    return segments


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

            # 4. Chunking with Parent-Child Hierarchy
            # Strategy: Create PARENT chunks (~2000 chars) for context
            #           Create CHILD chunks (~500 chars) for precise search
            #           Only CHILD chunks are embedded; on retrieval, return PARENT
            
            from src.documents.models import ChunkType
            
            parent_chunks = []
            current_section = None
            
            # 4a. SPECIAL: Create a METADATA chunk from first page header
            # This captures bench names, case numbers, parties which are typically
            # in the first 1500 chars of legal judgments
            if extracted_data:
                first_page_text, first_page_num = extracted_data[0]
                # Extract header portion (first ~1500 chars or until "JUDGMENT" keyword)
                header_end = first_page_text.lower().find("judgment")
                if header_end == -1 or header_end > 2000:
                    header_end = min(1500, len(first_page_text))
                
                metadata_content = first_page_text[:header_end].strip()
                if metadata_content and len(metadata_content) > 100:
                    # Create a special METADATA parent chunk
                    parent_chunks.append({
                        "content": f"DOCUMENT METADATA (Page 1 Header):\n{metadata_content}",
                        "page": first_page_num,
                        "paragraph": 0,  # Special paragraph 0 for metadata
                        "section_title": "DOCUMENT_METADATA",
                        "chunk_type": ChunkType.PARENT,
                        "children": [{
                            "content": f"Document metadata: bench, judges, parties, case number. {metadata_content}",
                            "page": first_page_num,
                            "paragraph": 0,
                            "section_title": "DOCUMENT_METADATA",
                            "chunk_type": ChunkType.CHILD,
                        }]
                    })
                    logger.info(f"Created METADATA chunk from first page ({len(metadata_content)} chars)")
            
            for text, page_num in extracted_data:
                sections = split_by_headers(text)
                
                for section_header, section_content in sections:
                    if section_header:
                        current_section = section_header
                    
                    # Create PARENT chunks (large, for context)
                    parent_texts = chunk_text(section_content, chunk_size=2000, overlap=200)
                    
                    for para_idx, parent_content in enumerate(parent_texts, start=1):
                        parent_chunks.append({
                            "content": parent_content,
                            "page": page_num,
                            "paragraph": para_idx,
                            "section_title": current_section,
                            "chunk_type": ChunkType.PARENT,
                            "children": []  # Will hold child chunk data
                        })
                        
                        # Create CHILD chunks from this parent (small, for search)
                        child_texts = chunk_text(parent_content, chunk_size=500, overlap=50)
                        for child_idx, child_content in enumerate(child_texts, start=1):
                            parent_chunks[-1]["children"].append({
                                "content": child_content,
                                "page": page_num,
                                "paragraph": child_idx,
                                "section_title": current_section,
                                "chunk_type": ChunkType.CHILD,
                            })
            
            # Count total chunks (parents + children)
            total_parents = len(parent_chunks)
            total_children = sum(len(p["children"]) for p in parent_chunks)
            document.chunk_count = total_parents + total_children
            
            if not parent_chunks:
                document.status = DocumentStatus.FAILED
                document.error_message = "No text could be extracted from the document."
                await db.commit()
                return

            # 5. Save PARENT chunks to DB first
            db_parent_chunks = []
            parent_index = 0
            for pdata in parent_chunks:
                db_parent = DocumentChunk(
                    document_id=document.id,
                    chunk_index=parent_index,
                    content=pdata["content"],
                    page_number=pdata["page"],
                    paragraph_number=pdata.get("paragraph"),
                    section_title=pdata.get("section_title"),
                    chunk_type=ChunkType.PARENT,
                    parent_chunk_id=None,  # Parents have no parent
                )
                db.add(db_parent)
                db_parent_chunks.append((db_parent, pdata["children"]))
                parent_index += 1
            
            await db.flush()  # Generate parent IDs
            
            # 6. Save CHILD chunks and collect for embedding
            db_child_chunks = []
            child_texts_to_embed = []
            child_index = 0
            
            for db_parent, children_data in db_parent_chunks:
                for cdata in children_data:
                    db_child = DocumentChunk(
                        document_id=document.id,
                        chunk_index=child_index,
                        content=cdata["content"],
                        page_number=cdata["page"],
                        paragraph_number=cdata.get("paragraph"),
                        section_title=cdata.get("section_title"),
                        chunk_type=ChunkType.CHILD,
                        parent_chunk_id=db_parent.id,  # Link to parent
                    )
                    db.add(db_child)
                    db_child_chunks.append(db_child)
                    child_texts_to_embed.append(cdata["content"])
                    child_index += 1
            
            await db.flush()  # Generate child IDs
            
            # 7. Embed only CHILD chunks (for precise search)
            embeddings_service = GeminiEmbeddings()
            vectors = await embeddings_service.embed_documents(child_texts_to_embed)
            
            # 8. Upsert CHILD chunks to Qdrant with parent_chunk_id in metadata
            vectorstore = QdrantVectorStore()
            chunk_ids = [str(c.id) for c in db_child_chunks]
            metadatas = [
                {
                    "page_number": c.page_number,
                    "paragraph_number": c.paragraph_number,
                    "chunk_index": c.chunk_index,
                    "section_title": c.section_title,
                    "parent_chunk_id": str(c.parent_chunk_id),  # Key for retrieval
                    "chunk_type": c.chunk_type,
                } 
                for c in db_child_chunks
            ]
            
            await vectorstore.upsert(
                vectors=vectors,
                chunk_ids=chunk_ids,
                document_id=str(document.id),
                metadatas=metadatas
            )
            
            # 9. Finalize
            document.status = DocumentStatus.READY
            await db.commit()
            logger.info(f"Document {document_id} processed: {total_parents} parents, {total_children} children")
            
        except Exception as e:
            logger.exception(f"Error processing document {document_id}")
            if document:
                document.status = DocumentStatus.FAILED
                document.error_message = str(e)
                await db.commit()

