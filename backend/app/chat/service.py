"""
Chat service for JurisQuery.
Business logic for chat sessions and messages.
"""
import logging
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.chat.models import ChatSession, Message, MessageRole
from app.chat.schemas import ChatSessionDetailResponse, ChatSessionListResponse
from app.documents.models import Document
from app.exceptions import ForbiddenError, NotFoundError
from app.llm.brain import BrainLLM
from app.rag import service as rag_service

logger = logging.getLogger(__name__)


async def create_session(
    db: AsyncSession,
    user_id: str,
    document_id: UUID | None = None,
    folder_id: UUID | None = None,
    title: str | None = None,
) -> ChatSession:
    """
    Create a new chat session for a document or a folder.

    Args:
        db: Database session
        user_id: Owner of the session
        document_id: Optional Document to chat about
        folder_id: Optional CaseFolder to chat about
        title: Optional session title

    Returns:
        ChatSession: Created session
    """
    if not document_id and not folder_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Must provide either document_id or folder_id")

    session_title = title

    if document_id:
        doc_query = select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id,
        )
        result = await db.execute(doc_query)
        document = result.scalar_one_or_none()

        if not document:
            raise NotFoundError("Document")
        session_title = title or f"Chat about {document.original_filename}"

    if folder_id:
        # Avoid circular imports by importing here or at top
        from app.folders.models import CaseFolder
        folder_query = select(CaseFolder).where(
            CaseFolder.id == folder_id,
            CaseFolder.user_id == user_id,
        )
        result = await db.execute(folder_query)
        folder = result.scalar_one_or_none()
        
        if not folder:
            raise NotFoundError("CaseFolder")
        session_title = title or f"Chat about {folder.name}"

    session = ChatSession(
        user_id=user_id,
        document_id=document_id,
        folder_id=folder_id,
        title=session_title,
    )

    db.add(session)
    await db.flush()
    await db.refresh(session)

    logger.info("Created chat session %s for user %s", session.id, user_id)
    return session


async def list_sessions(
    db: AsyncSession,
    user_id: str,
    document_id: UUID | None = None,
    folder_id: UUID | None = None,
    skip: int = 0,
    limit: int = 20,
) -> ChatSessionListResponse:
    """List chat sessions for a user."""
    # Base query
    query = select(ChatSession).where(ChatSession.user_id == user_id)
    count_query = select(func.count()).select_from(ChatSession).where(
        ChatSession.user_id == user_id
    )

    # Filter if specified
    if document_id:
        query = query.where(ChatSession.document_id == document_id)
        count_query = count_query.where(ChatSession.document_id == document_id)
    if folder_id:
        query = query.where(ChatSession.folder_id == folder_id)
        count_query = count_query.where(ChatSession.folder_id == folder_id)

    # Get total
    total = await db.scalar(count_query) or 0

    # Get sessions
    query = query.order_by(ChatSession.updated_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    sessions = list(result.scalars().all())

    return ChatSessionListResponse(sessions=sessions, total=total)


async def get_session(
    db: AsyncSession,
    session_id: UUID,
    user_id: str,
) -> ChatSessionDetailResponse:
    """Get a chat session with full message history."""
    query = (
        select(ChatSession)
        .where(ChatSession.id == session_id)
        .options(selectinload(ChatSession.messages))
    )
    result = await db.execute(query)
    session = result.scalar_one_or_none()

    if not session:
        raise NotFoundError("Chat session")

    if session.user_id != user_id:
        raise ForbiddenError()

    return ChatSessionDetailResponse(
        id=session.id,
        document_id=session.document_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=len(session.messages),
        messages=session.messages,
    )


async def send_message(
    db: AsyncSession,
    session_id: UUID,
    user_id: str,
    content: str,
) -> Message:
    """
    Send a message and get AI response via RAG.

    Args:
        db: Database session
        session_id: Chat session ID
        user_id: User sending the message
        content: Message content

    Returns:
        Message: AI response message
    """
    # Fetch session with eager loaded messages
    stmt = (
        select(ChatSession)
        .where(ChatSession.id == session_id)
        .options(selectinload(ChatSession.messages))
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if not session:
        raise NotFoundError("Chat session")

    if session.user_id != user_id:
        raise ForbiddenError()

    # Track if this is the start of the conversation
    is_first_message = len(session.messages) == 0

    # Save user message
    user_message = Message(
        session_id=session_id,
        role=MessageRole.USER,
        content=content,
    )
    db.add(user_message)

    # Build history for RAG context (including the new user message)
    history = [
        {"role": m.role, "content": m.content}
        for m in session.messages
    ]
    history.append({"role": "user", "content": content})

    # Get AI response using RAG service
    try:
        from app.rag import service as rag_service
        if session.folder_id:
            response = await rag_service.retrieve_branched_context(
                db=db,
                user_id=user_id,
                folder_id=session.folder_id,
                query=content,
                chat_history=history,
            )
        else:
            response = await rag_service.query_document(
                db=db,
                document_id=session.document_id,
                query=content,
                user_id=user_id,
                chat_history=history,
            )
    except Exception as e:
        logger.error("RAG query failed for session %s: %s", session_id, e)
        # Construct a fallback error response
        from app.rag.schemas import QueryResponse
        response = QueryResponse(
                answer="I'm sorry, I encountered an internal error while processing your request. Please try again in a moment.",
                citations=[],
                document_id=session.document_id or session.folder_id,
                query=content,
                model="error-fallback",
            )

    # Save assistant message
    assistant_message = Message(
        session_id=session_id,
        role=MessageRole.ASSISTANT,
        content=response.answer,
        citations=[c.model_dump(mode="json") for c in response.citations],
    )
    db.add(assistant_message)

    # Update session title asynchronously if it's the first message
    if is_first_message:
        await _maybe_update_title(session, content)

    await db.flush()
    await db.refresh(assistant_message)

    return assistant_message


async def _maybe_update_title(session: ChatSession, first_message: str) -> None:
    """Generate and update a descriptive chat title based on the first message."""
    try:
        brain = BrainLLM()
        new_title = await brain.generate_chat_title(first_message)
        if new_title and new_title != "New Conversation":
            session.title = new_title
            logger.info("Updated title for session %s: %s", session.id, new_title)
    except Exception as e:
        logger.warning("Failed to generate chat title for session %s: %s", session.id, e)


async def delete_session(
    db: AsyncSession,
    session_id: UUID,
    user_id: str,
) -> None:
    """Delete a chat session."""
    query = select(ChatSession).where(ChatSession.id == session_id)
    result = await db.execute(query)
    session = result.scalar_one_or_none()

    if not session:
        raise NotFoundError("Chat session")

    if session.user_id != user_id:
        raise ForbiddenError()

    await db.delete(session)
    logger.info("Deleted chat session %s", session_id)


async def stream_message(
    db: AsyncSession,
    session_id: UUID,
    user_id: str,
    content: str,
    search_mode: str | None = "document",
):
    """
    Stream an AI response token-by-token using Server-Sent Events.

    Yields SSE-formatted strings: ``data: <token>\\n\\n``
    After streaming completes, persists both user and assistant messages to DB.
    Sends a final ``data: [DONE]\\n\\n`` sentinel so the client knows to stop.

    Args:
        db: Database session
        session_id: Chat session ID
        user_id: Authenticated user
        content: User message content

    Yields:
        SSE-formatted text chunks
    """
    # 1. Fetch and authorise session
    stmt = (
        select(ChatSession)
        .where(ChatSession.id == session_id)
        .options(selectinload(ChatSession.messages))
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if not session:
        yield "data: [ERROR] Session not found\n\n"
        return

    if session.user_id != user_id:
        yield "data: [ERROR] Access denied\n\n"
        return

    is_first_message = len(session.messages) == 0

    # 2. Save user message immediately
    user_message = Message(
        session_id=session_id,
        role=MessageRole.USER,
        content=content,
    )
    db.add(user_message)
    await db.flush()

    # 3. Build history for context
    history = [
        {"role": m.role, "content": m.content}
        for m in session.messages
    ]
    history.append({"role": "user", "content": content})

    # 4. Build prompt via Brain LLM query analysis + context retrieval
    from app.llm.brain import BrainLLM
    from app.llm.gemini import GeminiLLM
    from app.llm.groq_llm import GroqLLM
    from app.rag import service as rag_service
    from app.rag.prompts import LEGAL_RAG_PROMPT
    from app.rag.embeddings import GeminiEmbeddings
    from app.rag.vectorstore import QdrantVectorStore
    from sqlalchemy import select as sa_select
    from app.documents.models import Document, DocumentChunk

    try:
        full_answer_parts: list[str] = []
        citations = []

        if search_mode == "web":
            from app.research.agent import AgenticResearchPipeline
            from app.rag.schemas import Citation
            agent = AgenticResearchPipeline()
            try:
                history_str = rag_service._format_chat_history(history)
                async for step in agent.execute_research(content, history_str):
                    if step.get("done", False):
                        # The answer was already streamed token-by-token via `delta`.
                        # Here we only need to capture the final citations.
                        citations = [
                            Citation(
                                chunk_id="web",
                                content=f"URL: {s['url']}\nTitle: {s['title']}",
                                relevance_score=1.0,
                                source_id=str(s.get('id', '')),
                                page_number=None,
                            )
                            for s in step.get("sources", [])
                        ]
                    elif "delta" in step:
                        # Token-level stream from the synthesis LLM
                        tok = step["delta"]
                        full_answer_parts.append(tok)
                        safe_token = tok.replace("\n", "\\n")
                        yield f"data: {safe_token}\n\n"
                    else:
                        # Agentic status update (e.g. "Searching web...")
                        yield f"data: [STATUS] {step.get('status', '')}\n\n"
            except Exception as e:
                logger.error("Web research stream failed: %s", e)
                err_msg = "Sorry, I encountered an error during web research."
                yield f"data: {err_msg}\n\n"
                full_answer_parts = [err_msg]
        elif session.folder_id:
            # TRUE Branched RAG Streaming
            try:
                master_context, citations_list = await rag_service.prepare_branched_rag_context(
                    db=db,
                    user_id=user_id,
                    folder_id=session.folder_id,
                    query=content,
                    chat_history=history,
                )
                
                history_str = rag_service._format_chat_history(history)
                prompt = LEGAL_RAG_PROMPT.format(
                    context=master_context,
                    question=content,
                    chat_history=history_str,
                )
                
                gemini_llm = GeminiLLM()
                async for token in gemini_llm.generate_stream(prompt):
                    full_answer_parts.append(token)
                    safe_token = token.replace("\n", "\\n")
                    yield f"data: {safe_token}\n\n"
                
                citations = citations_list
            except Exception as e:
                logger.error("Branched RAG stream failed: %s", e)
                err_msg = "Sorry, I encountered an error querying the folder."
                yield f"data: {err_msg}\n\n"
                full_answer_parts = [err_msg]
                citations = []
        else:
            # Single-document hybrid RAG — build prompt, then stream generation
            try:
                doc_result = await db.execute(
                    sa_select(Document).where(
                        Document.id == session.document_id,
                        Document.user_id == user_id,
                    )
                )
                document = doc_result.scalar_one_or_none()
                if not document:
                    raise Exception("Document not found")

                brain = BrainLLM()
                history_str = rag_service._format_chat_history(history)
                query_analysis = await brain.analyze_query(content, history_str)

                embeddings = GeminiEmbeddings()
                vectorstore = QdrantVectorStore()
                query_embedding = await embeddings.embed_query(query_analysis.rewritten_query)

                from sqlalchemy import or_
                vector_results = await vectorstore.search(
                    query_vector=query_embedding,
                    document_id=str(session.document_id),
                    top_k=15,
                )
                kw_query = f"{content} {' '.join(query_analysis.search_keywords)}"
                keyword_results = await rag_service._keyword_search(
                    db=db, document_id=session.document_id, query=kw_query, limit=15
                )
                retrieved = (
                    rag_service._rrf_fusion(vector_results, keyword_results)[:15]
                    if keyword_results
                    else vector_results
                )

                child_ids = [c["chunk_id"] for c in retrieved]
                child_result = await db.execute(
                    sa_select(DocumentChunk).where(DocumentChunk.id.in_(child_ids))
                )
                db_children = {str(c.id): c for c in child_result.scalars().all()}
                parent_ids = {c.parent_chunk_id for c in db_children.values() if c.parent_chunk_id}
                if parent_ids:
                    p_result = await db.execute(
                        sa_select(DocumentChunk).where(DocumentChunk.id.in_(parent_ids))
                    )
                    db_parents = {str(c.id): c for c in p_result.scalars().all()}
                else:
                    db_parents = db_children

                context, citations = rag_service._build_context_and_citations(
                    document=document,
                    retrieved_chunks=retrieved,
                    db_children=db_children,
                    db_parents=db_parents,
                )

                prompt = LEGAL_RAG_PROMPT.format(
                    context=context,
                    question=content,
                    chat_history=history_str,
                )

                gemini_llm = GeminiLLM()
                async for token in gemini_llm.generate_stream(prompt):
                    full_answer_parts.append(token)
                    # SSE requires newlines inside data to be escaped
                    safe_token = token.replace("\n", "\\n")
                    yield f"data: {safe_token}\n\n"

            except Exception as e:
                logger.error("Single-doc stream failed for session %s: %s", session_id, e)
                err_msg = "Sorry, I encountered an error while searching the document."
                yield f"data: {err_msg}\n\n"
                full_answer_parts = [err_msg]
                citations = []

    except Exception as outer_e:
        logger.exception("Unexpected error in stream_message for session %s", session_id)
        yield "data: [ERROR] An unexpected error occurred.\n\n"
        full_answer_parts = ["An unexpected error occurred."]
        citations = []

    finally:
        # 5. Persist assistant message regardless of success/failure
        final_answer = "".join(full_answer_parts)
        if final_answer:
            assistant_message = Message(
                session_id=session_id,
                role=MessageRole.ASSISTANT,
                content=final_answer,
                citations=[c.model_dump(mode="json") for c in (citations or [])],
            )
            db.add(assistant_message)

            if is_first_message:
                await _maybe_update_title(session, content)

            await db.commit()

        # 6. Send done sentinel
        yield "data: [DONE]\n\n"
