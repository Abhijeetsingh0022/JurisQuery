"""
Chat service for JurisQuery.
Business logic for chat sessions and messages.
"""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.chat.models import ChatSession, Message, MessageRole
from app.chat.schemas import ChatSessionDetailResponse, ChatSessionListResponse
from app.documents.models import Document
from app.exceptions import ForbiddenError, NotFoundError
from app.rag import service as rag_service


async def create_session(
    db: AsyncSession,
    document_id: UUID,
    user_id: str,
    title: str | None = None,
) -> ChatSession:
    """
    Create a new chat session for a document.
    
    Args:
        db: Database session
        document_id: Document to chat about
        user_id: Owner of the session
        title: Optional session title
        
    Returns:
        ChatSession: Created session
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
    
    session = ChatSession(
        user_id=user_id,
        document_id=document_id,
        title=title or f"Chat about {document.original_filename}",
    )
    
    db.add(session)
    await db.flush()
    await db.refresh(session)
    
    return session


async def list_sessions(
    db: AsyncSession,
    user_id: str,
    document_id: UUID | None = None,
    skip: int = 0,
    limit: int = 20,
) -> ChatSessionListResponse:
    """List chat sessions for a user."""
    # Base query
    query = select(ChatSession).where(ChatSession.user_id == user_id)
    count_query = select(func.count()).select_from(ChatSession).where(
        ChatSession.user_id == user_id
    )
    
    # Filter by document if specified
    if document_id:
        query = query.where(ChatSession.document_id == document_id)
        count_query = count_query.where(ChatSession.document_id == document_id)
    
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
    Send a message and get AI response.
    
    Args:
        db: Database session
        session_id: Chat session ID
        user_id: User sending the message
        content: Message content
        
    Returns:
        Message: AI response message
    """
    # Get chat history (exclude current empty list check, we rely on session relationship)
    # We need to manually load messages if not eagerly loaded or rely on what's available
    # The get_session call uses selectinload, but here we did a simple select.
    # Let's optimize by eager loading messages for the session here too.
    
    # Re-query session with messages
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

    # Format history and check if this is the first message
    is_first_message = len(session.messages) == 0
    history = [
        {"role": m.role, "content": m.content} 
        for m in session.messages
    ]
    
    # Save user message
    user_message = Message(
        session_id=session_id,
        role=MessageRole.USER,
        content=content,
    )
    db.add(user_message)
    
    # Add current message to history for RAG context
    history.append({"role": "user", "content": content})
    
    # Get AI response using RAG
    response = await rag_service.query_document(
        db=db,
        document_id=session.document_id,
        query=content,
        user_id=user_id,
        chat_history=history,
    )
    
    # Save assistant message
    assistant_message = Message(
        session_id=session_id,
        role=MessageRole.ASSISTANT,
        content=response.answer,
        citations=[c.model_dump(mode="json") for c in response.citations],
    )
    db.add(assistant_message)
    
    # Update session title if this was the first message
    if is_first_message:
        try:
            from app.llm.brain import BrainLLM
            brain = BrainLLM()
            new_title = await brain.generate_chat_title(content)
            session.title = new_title
            # The session is already in the db session, modifications will be flushed
        except Exception as e:
            pass  # Non-blocking if title generation fails
    
    await db.flush()
    await db.refresh(assistant_message)
    
    return assistant_message


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
