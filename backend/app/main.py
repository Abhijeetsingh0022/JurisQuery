"""
JurisQuery Backend API - Main Application Entry Point.
FastAPI application with RAG capabilities for legal document analysis.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_db, init_db

from app.auth.router import router as auth_router
from app.documents.router import router as documents_router
from app.rag.router import router as rag_router
from app.chat.router import router as chat_router
from app.folders.router import router as folders_router
from app.ipc.router import router as ipc_router
from app.ipc import bns_service
from app.database import async_session_maker


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    await init_db()
    # Seed BNS dataset on first boot (idempotent)
    try:
        async with async_session_maker() as db:
            await bns_service.load_bns_dataset(db)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("BNS dataset seeding skipped: %s", exc)
    yield
    # Shutdown
    await close_db()


# Configure app based on environment
app_config = {
    "title": "JurisQuery API",
    "description": "Intelligent Legal Document Analysis powered by RAG",
    "version": "0.1.0",
    "lifespan": lifespan,
}

# Hide docs in production
if settings.is_production:
    app_config["openapi_url"] = None

app = FastAPI(**app_config)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(documents_router, prefix="/api/documents", tags=["Documents"])
app.include_router(rag_router, prefix="/api/rag", tags=["RAG"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(ipc_router, prefix="/api/v1/ipc", tags=["IPC Sections"])
app.include_router(folders_router, prefix="/api/folders", tags=["Folders"])


@app.api_route("/", methods=["GET", "HEAD"], tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "JurisQuery API",
        "version": "0.1.0",
    }


@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
async def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "debug": settings.debug,
    }
