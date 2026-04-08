"""
RAG service for JurisQuery.
Core RAG pipeline: embedding, retrieval, and generation.
"""
import io
import logging
import re
from uuid import UUID

import httpx
import pypdf
import docx
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.documents.models import Document, DocumentChunk, DocumentStatus, ChunkType
from app.exceptions import BadRequestError, NotFoundError
from app.ipc.bns_service import detect_and_embed_bns_updates
from app.llm.brain import BrainLLM
from app.llm.gemini import GeminiLLM
from app.llm.groq_llm import GroqLLM
from app.rag.embeddings import GeminiEmbeddings
from app.rag.prompts import LEGAL_RAG_PROMPT
from app.rag.schemas import Citation, QueryResponse
from app.rag.vectorstore import QdrantVectorStore

logger = logging.getLogger(__name__)

_STOP_WORDS = {"the", "a", "an", "in", "on", "at", "for", "to", "of", "and", "or", "is"}

_PARENT_CHUNK_SIZE = 2000
_CHILD_CHUNK_SIZE = 500
_PARENT_OVERLAP = 200
_CHILD_OVERLAP = 50
_METADATA_HEADER_LIMIT = 1500
_METADATA_MIN_LENGTH = 100


# ---------------------------------------------------------------------------
# Retrieval components
# ---------------------------------------------------------------------------

async def _keyword_search(
    db: AsyncSession,
    document_id: UUID,
    query: str,
    limit: int = 15,
) -> list[dict]:
    """
    Search document chunks using keyword matching (Postgres ILIKE).
    Scores results by term frequency across filtered stop words.
    """
    terms = [
        t for t in query.lower().split()
        if len(t) > 3 and t not in _STOP_WORDS
    ]
    if not terms:
        return []

    conditions = [DocumentChunk.content.ilike(f"%{term}%") for term in terms]

    stmt = (
        select(DocumentChunk)
        .where(
            DocumentChunk.document_id == document_id,
            or_(*conditions),
        )
        .limit(limit * 2)
    )
    result = await db.execute(stmt)
    chunks = result.scalars().all()

    hits = []
    for chunk in chunks:
        content_lower = chunk.content.lower()
        score = sum(1 for term in terms if term in content_lower) / len(terms)
        hits.append({
            "chunk_id": str(chunk.id),
            "score": float(score),
            "type": "keyword",
        })

    hits.sort(key=lambda x: x["score"], reverse=True)
    return hits[:limit]


def _rrf_fusion(
    vector_results: list[dict],
    keyword_results: list[dict],
    k: int = 60,
) -> list[dict]:
    """
    Reciprocal Rank Fusion to merge and re-rank vector + keyword results.
    RRF score = Σ 1 / (rank + k) across all ranked lists.
    """
    scores: dict[str, float] = {}

    for rank, hit in enumerate(vector_results):
        scores[hit["chunk_id"]] = scores.get(hit["chunk_id"], 0.0) + 1 / (rank + k)

    for rank, hit in enumerate(keyword_results):
        scores[hit["chunk_id"]] = scores.get(hit["chunk_id"], 0.0) + 1 / (rank + k)

    all_hits = {h["chunk_id"]: h for h in vector_results}
    all_hits.update({h["chunk_id"]: h for h in keyword_results})

    fused = []
    for chunk_id, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        if hit := all_hits.get(chunk_id):
            fused.append({**hit, "score": score})

    return fused


# ---------------------------------------------------------------------------
# Query Pipeline
# ---------------------------------------------------------------------------

async def query_document(
    db: AsyncSession,
    document_id: UUID,
    query: str,
    user_id: str,
    chat_history: list[dict] | None = None,
    top_k: int = 15,
) -> QueryResponse:
    """
    Query a document using the full hybrid RAG pipeline.

    Steps: auth → query understanding → hybrid retrieval →
           parent-context expansion → generation → verification → refinement.

    Args:
        db: Database session
        document_id: ID of the document to query
        query: User's natural language question
        user_id: ID of the requesting user
        chat_history: Prior conversation turns [{"role": ..., "content": ...}]
        top_k: Number of chunks to retrieve

    Returns:
        QueryResponse with AI-generated answer and source citations

    Raises:
        NotFoundError: If document not found or not owned by user
    """
    # 1. Verify document ownership
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise NotFoundError("Document")

    # 2. Initialise components
    embeddings = GeminiEmbeddings()
    vectorstore = QdrantVectorStore()
    gemini_llm = GeminiLLM()
    groq_llm = GroqLLM()
    brain = BrainLLM()

    # 3. Format chat history (last 6 turns)
    history_str = _format_chat_history(chat_history)

    # 4. Query understanding via Brain LLM
    query_analysis = await brain.analyze_query(query, history_str)
    logger.info(
        "Query analysis: type=%s entities=%s keywords=%s",
        query_analysis.query_type,
        query_analysis.key_entities,
        query_analysis.search_keywords,
    )

    # 5. Embed rewritten query for semantic search
    query_embedding = await embeddings.embed_query(query_analysis.rewritten_query)

    # 6a. Semantic search (Qdrant)
    vector_results = await vectorstore.search(
        query_vector=query_embedding,
        document_id=str(document_id),
        top_k=top_k,
    )

    # 6b. Keyword search (Postgres)
    enhanced_query = f"{query} {' '.join(query_analysis.search_keywords)}"
    keyword_results = await _keyword_search(
        db=db,
        document_id=document_id,
        query=enhanced_query,
        limit=top_k,
    )

    # 6c. Fuse results via RRF
    retrieved_chunks = (
        _rrf_fusion(vector_results, keyword_results)[:top_k]
        if keyword_results
        else vector_results
    )

    # 7. Load child chunks from DB
    child_ids = [c["chunk_id"] for c in retrieved_chunks]
    if not child_ids:
        return QueryResponse(
            answer="I couldn't find any relevant information in the document to answer your question.",
            citations=[],
            document_id=document_id,
            query=query,
            model="none",
        )

    child_result = await db.execute(
        select(DocumentChunk).where(DocumentChunk.id.in_(child_ids))
    )
    db_children = {str(c.id): c for c in child_result.scalars().all()}

    # 8. Expand to parent chunks for richer context
    parent_ids = {
        child.parent_chunk_id
        for child in db_children.values()
        if child.parent_chunk_id
    }

    if parent_ids:
        parent_result = await db.execute(
            select(DocumentChunk).where(DocumentChunk.id.in_(parent_ids))
        )
        db_parents = {str(c.id): c for c in parent_result.scalars().all()}
    else:
        db_parents = db_children  # Fallback for legacy data

    # 9. Build prompt context and citations
    context, citations = _build_context_and_citations(
        document=document,
        retrieved_chunks=retrieved_chunks,
        db_children=db_children,
        db_parents=db_parents,
    )

    # 10. Generate answer (Gemini → Groq fallback)
    prompt = LEGAL_RAG_PROMPT.format(
        context=context,
        question=query,
        chat_history=history_str,
    )
    answer, model_used = await _generate_with_fallback(gemini_llm, groq_llm, prompt)

    # 11. Verify grounding via Brain LLM
    verification = await brain.verify_response(answer, context)
    logger.info(
        "Response verification: grounded=%s confidence=%.2f needs_refinement=%s",
        verification.is_grounded,
        verification.confidence_score,
        verification.needs_refinement,
    )
    if verification.ungrounded_claims:
        logger.warning("Ungrounded claims detected: %s", verification.ungrounded_claims)

    # 12. Conditional refinement
    final_answer = answer
    if verification.needs_refinement:
        logger.info("Triggering response refinement")
        final_answer = await brain.refine_response(
            original_response=answer,
            context=context,
            verification=verification,
            query=query,
        )
        model_used = f"{model_used} (refined)"

    # 13. Statute Bridge: auto-detect IPC section refs and append BNS 2023 callouts
    try:
        final_answer = await detect_and_embed_bns_updates(final_answer, db)
    except Exception as _bns_exc:
        logger.warning("BNS augmentation failed (non-critical): %s", _bns_exc)

    return QueryResponse(
        answer=final_answer,
        citations=citations,
        document_id=document_id,
        query=query,
        model=model_used,
    )


# ---------------------------------------------------------------------------
# Document Processing Pipeline
# ---------------------------------------------------------------------------

async def process_document_for_rag(
    document_id: UUID,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """
    Process a document for RAG: extract → chunk → embed → index.
    Runs as a background task with its own DB session.

    Args:
        document_id: ID of the document to process
        session_factory: Factory to create a new async DB session
    """
    async with session_factory() as db:
        document = None
        try:
            result = await db.execute(
                select(Document).where(Document.id == document_id)
            )
            document = result.scalar_one_or_none()
            if not document:
                logger.error("Document %s not found for processing", document_id)
                return

            document.status = DocumentStatus.PROCESSING
            await db.commit()

            # Download file
            async with httpx.AsyncClient() as client:
                response = await client.get(document.file_url)
                response.raise_for_status()
                content = response.content

            # Extract text per page
            extracted_pages = _extract_text(content, document.file_type)

            document.status = DocumentStatus.VECTORIZING
            document.page_count = len(extracted_pages) if document.file_type == "pdf" else None
            await db.commit()

            # Build parent-child chunk hierarchy
            parent_chunks = _build_chunk_hierarchy(extracted_pages)

            if not parent_chunks:
                document.status = DocumentStatus.FAILED
                document.error_message = "No text could be extracted from the document."
                await db.commit()
                return

            document.chunk_count = sum(
                1 + len(p["children"]) for p in parent_chunks
            )

            # Persist parents, then children
            db_parent_pairs = await _save_parent_chunks(db, document.id, parent_chunks)
            await db.flush()

            db_children, child_texts = await _save_child_chunks(db, document.id, db_parent_pairs)
            await db.flush()

            # Embed child chunks and index in Qdrant
            vectors = await GeminiEmbeddings().embed_documents(child_texts)
            await QdrantVectorStore().upsert(
                vectors=vectors,
                chunk_ids=[str(c.id) for c in db_children],
                document_id=str(document.id),
                metadatas=[_chunk_metadata(c) for c in db_children],
            )

            document.status = DocumentStatus.READY
            await db.commit()
            logger.info(
                "Document %s processed: %d parents, %d children",
                document_id,
                len(parent_chunks),
                len(db_children),
            )

        except Exception as e:
            logger.exception("Error processing document %s", document_id)
            if document:
                document.status = DocumentStatus.FAILED
                document.error_message = str(e)
                await db.commit()


# ---------------------------------------------------------------------------
# Text Extraction
# ---------------------------------------------------------------------------

def _extract_text(content: bytes, file_type: str) -> list[tuple[str, int]]:
    """Dispatch text extraction based on file type."""
    if file_type == "pdf":
        return _extract_pdf(content)
    if file_type == "docx":
        return _extract_docx(content)
    if file_type == "txt":
        return [(content.decode("utf-8"), 1)]
    raise BadRequestError("Unsupported file type")


def _extract_pdf(content: bytes) -> list[tuple[str, int]]:
    """Extract (text, page_number) tuples from a PDF."""
    try:
        reader = pypdf.PdfReader(io.BytesIO(content))
        return [
            (text, i + 1)
            for i, page in enumerate(reader.pages)
            if (text := page.extract_text()) and text.strip()
        ]
    except Exception:
        logger.exception("Error extracting PDF text")
        raise


def _extract_docx(content: bytes) -> list[tuple[str, int]]:
    """Extract full text from a DOCX file as a single page."""
    try:
        doc = docx.Document(io.BytesIO(content))
        text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        return [(text, 1)] if text else []
    except Exception:
        logger.exception("Error extracting DOCX text")
        raise


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def _build_chunk_hierarchy(
    extracted_pages: list[tuple[str, int]],
) -> list[dict]:
    """
    Build a parent-child chunk hierarchy from extracted pages.

    Parents (~2000 chars) provide rich context for generation.
    Children (~500 chars) are embedded for precise retrieval.
    A special METADATA chunk is created from the first page header.
    """
    parent_chunks: list[dict] = []
    current_section: str | None = None

    # Metadata chunk from first-page header
    if extracted_pages:
        first_text, first_page = extracted_pages[0]
        header_end = first_text.lower().find("judgment")
        if header_end < 0 or header_end > 2000:
            header_end = min(_METADATA_HEADER_LIMIT, len(first_text))

        metadata_text = first_text[:header_end].strip()
        if len(metadata_text) >= _METADATA_MIN_LENGTH:
            parent_chunks.append(_make_chunk_dict(
                content=f"DOCUMENT METADATA (Page 1 Header):\n{metadata_text}",
                page=first_page,
                paragraph=0,
                section_title="DOCUMENT_METADATA",
                child_content=f"Document metadata: bench, judges, parties, case number. {metadata_text}",
            ))
            logger.info("Created METADATA chunk (%d chars)", len(metadata_text))

    for text, page_num in extracted_pages:
        for section_header, section_content in _split_by_headers(text):
            if section_header:
                current_section = section_header

            for para_idx, parent_text in enumerate(
                _chunk_text(section_content, _PARENT_CHUNK_SIZE, _PARENT_OVERLAP), start=1
            ):
                children = [
                    {
                        "content": child,
                        "page": page_num,
                        "paragraph": child_idx,
                        "section_title": current_section,
                        "chunk_type": ChunkType.CHILD,
                    }
                    for child_idx, child in enumerate(
                        _chunk_text(parent_text, _CHILD_CHUNK_SIZE, _CHILD_OVERLAP), start=1
                    )
                ]
                parent_chunks.append({
                    "content": parent_text,
                    "page": page_num,
                    "paragraph": para_idx,
                    "section_title": current_section,
                    "chunk_type": ChunkType.PARENT,
                    "children": children,
                })

    return parent_chunks


def _make_chunk_dict(
    content: str,
    page: int,
    paragraph: int,
    section_title: str,
    child_content: str,
) -> dict:
    """Construct a parent chunk dict with a single child."""
    return {
        "content": content,
        "page": page,
        "paragraph": paragraph,
        "section_title": section_title,
        "chunk_type": ChunkType.PARENT,
        "children": [{
            "content": child_content,
            "page": page,
            "paragraph": paragraph,
            "section_title": section_title,
            "chunk_type": ChunkType.CHILD,
        }],
    }


def _chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """
    Split text into overlapping chunks, breaking at natural boundaries
    (newlines preferred, spaces as fallback).
    """
    if not text:
        return []

    chunks, start, text_len = [], 0, len(text)

    while start < text_len:
        end = min(start + chunk_size, text_len)
        if end < text_len:
            boundary = text.rfind("\n", start, end)
            if boundary < start + (chunk_size - overlap):
                boundary = text.rfind(" ", start, end)
            if boundary > start:
                end = boundary

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap if end < text_len else text_len

    return chunks


# ---------------------------------------------------------------------------
# Header Detection
# ---------------------------------------------------------------------------

_HEADER_PATTERNS = [
    re.compile(r'^(?:ARTICLE|SECTION|CHAPTER|PART)\s+[0-9IVX]+', re.IGNORECASE),
    re.compile(r'^\d+\.\s+[A-Z][a-zA-Z\s]+$'),
]


def _is_header(line: str) -> bool:
    """Return True if the line looks like a legal document section header."""
    line = line.strip()
    if not line or len(line) > 100:
        return False
    if any(p.match(line) for p in _HEADER_PATTERNS):
        return True
    if line.isupper() and 4 < len(line) and len(line.split()) < 10:
        return True
    return False


def _split_by_headers(text: str) -> list[tuple[str | None, str]]:
    """
    Split text into (header, content) segments at detected section headers.
    The header line is included at the start of its content block.
    """
    segments: list[tuple[str | None, str]] = []
    current_header: str | None = None
    buffer: list[str] = []

    for line in text.split("\n"):
        if _is_header(line):
            if buffer:
                segments.append((current_header, "\n".join(buffer)))
                buffer = []
            current_header = line.strip()
        buffer.append(line)

    if buffer:
        segments.append((current_header, "\n".join(buffer)))

    return segments


# ---------------------------------------------------------------------------
# DB Persistence Helpers
# ---------------------------------------------------------------------------

async def _save_parent_chunks(
    db: AsyncSession,
    document_id: UUID,
    parent_chunks: list[dict],
) -> list[tuple[DocumentChunk, list[dict]]]:
    """Persist parent chunks and return (db_obj, children_data) pairs."""
    pairs = []
    for idx, pdata in enumerate(parent_chunks):
        chunk = DocumentChunk(
            document_id=document_id,
            chunk_index=idx,
            content=pdata["content"],
            page_number=pdata["page"],
            paragraph_number=pdata.get("paragraph"),
            section_title=pdata.get("section_title"),
            chunk_type=ChunkType.PARENT,
            parent_chunk_id=None,
        )
        db.add(chunk)
        pairs.append((chunk, pdata["children"]))
    return pairs


async def _save_child_chunks(
    db: AsyncSession,
    document_id: UUID,
    parent_pairs: list[tuple[DocumentChunk, list[dict]]],
) -> tuple[list[DocumentChunk], list[str]]:
    """Persist child chunks linked to their parents. Returns (db_chunks, texts)."""
    db_children: list[DocumentChunk] = []
    texts: list[str] = []
    idx = 0

    for parent, children_data in parent_pairs:
        for cdata in children_data:
            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=idx,
                content=cdata["content"],
                page_number=cdata["page"],
                paragraph_number=cdata.get("paragraph"),
                section_title=cdata.get("section_title"),
                chunk_type=ChunkType.CHILD,
                parent_chunk_id=parent.id,
            )
            db.add(chunk)
            db_children.append(chunk)
            texts.append(cdata["content"])
            idx += 1

    return db_children, texts


def _chunk_metadata(chunk: DocumentChunk) -> dict:
    """Serialise a DocumentChunk's metadata for Qdrant upsert."""
    return {
        "page_number": chunk.page_number,
        "paragraph_number": chunk.paragraph_number,
        "chunk_index": chunk.chunk_index,
        "section_title": chunk.section_title,
        "parent_chunk_id": str(chunk.parent_chunk_id),
        "chunk_type": chunk.chunk_type,
    }


# ---------------------------------------------------------------------------
# Generation Helpers
# ---------------------------------------------------------------------------

async def _generate_with_fallback(
    gemini: GeminiLLM,
    groq: GroqLLM,
    prompt: str,
) -> tuple[str, str]:
    """
    Attempt generation with Gemini; fall back to Groq on failure.
    Returns (answer, model_name).
    """
    try:
        answer = await gemini.generate(prompt)
        model = "gemini-2.5-flash"
    except Exception as e:
        logger.warning("Gemini failed, falling back to Groq: %s", e)
        if not groq.is_available():
            raise
        answer = await groq.generate(prompt)
        model = "groq-llama-3.3-70b"

    if not answer or len(answer.strip()) < 5:
        answer = (
            "I apologize, but I encountered an issue generating a response. "
            "Please try rephrasing your question."
        )
        model = f"{model}+error-fallback"

    return answer, model


def _format_chat_history(chat_history: list[dict] | None) -> str:
    """Format the last 6 conversation turns into a readable string."""
    if not chat_history:
        return ""
    return "\n".join(
        f"{'User' if msg['role'] == 'user' else 'JurisQuery'}: {msg['content']}"
        for msg in chat_history[-6:]
    )


def _build_context_and_citations(
    document: Document,
    retrieved_chunks: list[dict],
    db_children: dict[str, DocumentChunk],
    db_parents: dict[str, DocumentChunk],
) -> tuple[str, list[Citation]]:
    """
    Build the prompt context string and citation list from retrieved chunks.
    De-duplicates on parent chunk so each parent appears only once.
    """
    parts = [
        f"**DOCUMENT: {document.original_filename}**\n"
        f"Total Pages: {document.page_count or 'Unknown'} | "
        f"Retrieved Sources: {len(db_parents)}\n"
    ]
    citations: list[Citation] = []
    added_parents: set[str] = set()

    for chunk_data in retrieved_chunks:
        child = db_children.get(chunk_data["chunk_id"])
        if not child:
            continue

        parent_id = str(child.parent_chunk_id) if child.parent_chunk_id else str(child.id)
        parent = db_parents.get(parent_id)

        if parent and parent_id not in added_parents:
            added_parents.add(parent_id)
            source_id = len(added_parents)
            section_info = f" | Section: {parent.section_title}" if parent.section_title else ""
            parts.append(
                f"SOURCE [{source_id}] (Page {parent.page_number or 'N/A'}{section_info}):\n{parent.content}"
            )
            citations.append(Citation(
                source_id=source_id,
                chunk_id=parent.id,
                content=parent.content[:500],
                page_number=parent.page_number,
                paragraph_number=parent.paragraph_number,
                relevance_score=chunk_data.get("score", 0.0),
            ))

    return "\n\n---\n\n".join(parts), citations


async def retrieve_branched_context(
    db: AsyncSession,
    user_id: str,
    folder_id: UUID,
    query: str,
    chat_history: list[dict] | None = None,
    top_k_per_doc: int = 3,
) -> QueryResponse:
    """
    Map-Reduce (Branched RAG) pipeline for Case Folders.
    1. Loads all documents in the folder.
    2. Uses BrainLLM's decomposer to map the query into document-specific sub-queries.
    3. Runs parallel vector searches across them.
    4. Synthesizes a master summary.
    """
    master_context, citations = await prepare_branched_rag_context(
        db=db,
        user_id=user_id,
        folder_id=folder_id,
        query=query,
        chat_history=chat_history,
        top_k_per_doc=top_k_per_doc
    )
    
    history_str = _format_chat_history(chat_history) if chat_history else "No previous history."
    prompt = LEGAL_RAG_PROMPT.format(
        context=master_context,
        question=query,
        chat_history=history_str,
    )
    
    gemini_llm = GeminiLLM()
    groq_llm = GroqLLM()
    answer, model_used = await _generate_with_fallback(gemini_llm, groq_llm, prompt)
    
    return QueryResponse(
        answer=answer,
        citations=citations,
        document_id=folder_id, # returning folder id in document_id field to conform to schema
        query=query,
        model=model_used
    )


async def prepare_branched_rag_context(
    db: AsyncSession,
    user_id: str,
    folder_id: UUID,
    query: str,
    chat_history: list[dict] | None = None,
    top_k_per_doc: int = 3,
) -> tuple[str, list[Citation]]:
    """
    Retrieval part of the Branched RAG pipeline.
    Returns (master_context, citations).
    """
    from app.folders.models import CaseFolder
    import asyncio
    from sqlalchemy.orm import selectinload
    
    # 1. Fetch Folder & Documents
    stmt = (
        select(CaseFolder)
        .where(CaseFolder.id == folder_id, CaseFolder.user_id == user_id)
        .options(selectinload(CaseFolder.folder_documents))
    )
    result = await db.execute(stmt)
    folder = result.scalar_one_or_none()
    
    if not folder:
        raise NotFoundError("CaseFolder")
        
    doc_ids = [str(fd.document_id) for fd in folder.folder_documents]
    if not doc_ids:
        return "No documents in folder.", []
        
    stmt_docs = select(Document).where(Document.id.in_(doc_ids), Document.user_id == user_id)
    result_docs = await db.execute(stmt_docs)
    documents = list(result_docs.scalars().all())
    doc_map = {str(d.id): d for d in documents}
    
    # Format available docs for brain decomposition
    docs_context = "\n".join([
        f"- ID: {d.id} | Filename: {d.original_filename}" for d in documents
    ])
    
    # 2. Decompose Question
    brain = BrainLLM()
    sub_queries = await brain.decompose_query(query, docs_context)
    
    # Fallback if decomposition fails
    if not sub_queries:
        from app.llm.brain import DecomposedQuery
        sub_queries = [DecomposedQuery(document_id=str(d.id), query=query) for d in documents]
        
    # 3. Parallel Retrieval
    embeddings = GeminiEmbeddings()
    vectorstore = QdrantVectorStore()
    
    async def fetch_for_subquery(sq):
        if sq.document_id not in doc_map:
            return sq.document_id, []
        try:
            q_emb = await embeddings.embed_query(sq.query)
            res = await vectorstore.search(q_emb, document_id=sq.document_id, top_k=top_k_per_doc)
            return sq.document_id, res
        except Exception as e:
            logger.error("Branched retrieve failed for doc %s: %s", sq.document_id, e)
            return sq.document_id, []
            
    tasks = [fetch_for_subquery(sq) for sq in sub_queries]
    batch_results = await asyncio.gather(*tasks)
    
    # 4. Aggregate chunks
    all_chunk_ids = []
    for _doc_id, res in batch_results:
        all_chunk_ids.extend([c["chunk_id"] for c in res if c.get("chunk_id")])
        
    if not all_chunk_ids:
        return "No relevant context found.", []
        
    child_result = await db.execute(
        select(DocumentChunk).where(DocumentChunk.id.in_(all_chunk_ids))
    )
    db_children = {str(c.id): c for c in child_result.scalars().all()}
    
    parent_ids = {c.parent_chunk_id for c in db_children.values() if c.parent_chunk_id}
    db_parents = {}
    if parent_ids:
        parent_result = await db.execute(select(DocumentChunk).where(DocumentChunk.id.in_(parent_ids)))
        db_parents = {str(c.id): c for c in parent_result.scalars().all()}
    else:
        db_parents = db_children
        
    # Build master context & citations
    citations = []
    parts = []
    added_parents = set()
    source_counter = 1
    
    for doc_id, doc in doc_map.items():
        doc_parts = []
        for d_id, chunk_list in batch_results:
            if d_id != doc_id: continue
            for chunk_data in chunk_list:
                child = db_children.get(chunk_data["chunk_id"])
                if not child: continue
                pid = str(child.parent_chunk_id) if child.parent_chunk_id else str(child.id)
                parent = db_parents.get(pid)
                if parent and pid not in added_parents:
                    added_parents.add(pid)
                    doc_parts.append(f"SOURCE [{source_counter}] (Page {parent.page_number}):\n{parent.content}")
                    citations.append(Citation(
                        source_id=source_counter,
                        chunk_id=parent.id,
                        content=parent.content[:500],
                        page_number=parent.page_number, 
                        relevance_score=chunk_data.get("score", 0.0)
                    ))
                    source_counter += 1
        if doc_parts:
            parts.append(f"### DOCUMENT: {doc.original_filename} ###")
            parts.extend(doc_parts)
            
    return "\n\n".join(parts), citations