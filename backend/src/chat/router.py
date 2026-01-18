"""
Chat router for JurisQuery.
Handles chat sessions and message history.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.chat import service
from src.chat.schemas import (
    ChatSessionCreate,
    ChatSessionDetailResponse,
    ChatSessionListResponse,
    ChatSessionResponse,
    MessageCreate,
    MessageResponse,
)
from src.database import get_db

router = APIRouter()


@router.post(
    "/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a chat session",
    description="Create a new chat session for a document.",
)
async def create_session(
    request: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new chat session."""
    return await service.create_session(
        db=db,
        document_id=request.document_id,
        user_id=current_user["id"],
        title=request.title,
    )


@router.get(
    "/sessions",
    response_model=ChatSessionListResponse,
    summary="List chat sessions",
    description="Get all chat sessions for the current user.",
)
async def list_sessions(
    document_id: UUID | None = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List chat sessions, optionally filtered by document."""
    return await service.list_sessions(
        db=db,
        user_id=current_user["id"],
        document_id=document_id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/sessions/{session_id}",
    response_model=ChatSessionDetailResponse,
    summary="Get chat session",
    description="Get a chat session with full message history.",
)
async def get_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a chat session with messages."""
    return await service.get_session(
        db=db,
        session_id=session_id,
        user_id=current_user["id"],
    )


@router.post(
    "/sessions/{session_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message",
    description="Send a message and get AI response.",
)
async def send_message(
    session_id: UUID,
    request: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Send a message to a chat session."""
    return await service.send_message(
        db=db,
        session_id=session_id,
        user_id=current_user["id"],
        content=request.content,
    )


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a chat session",
    description="Delete a chat session and all messages.",
)
async def delete_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a chat session."""
    await service.delete_session(
        db=db,
        session_id=session_id,
        user_id=current_user["id"],
    )
