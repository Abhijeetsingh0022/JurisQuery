"""
JurisQuery Backend API - Main Application Entry Point.
FastAPI application with RAG capabilities for legal document analysis.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.database import close_db, init_db

# Import routers
from src.auth.router import router as auth_router
from src.documents.router import router as documents_router
from src.rag.router import router as rag_router
from src.chat.router import router as chat_router
from src.ipc.router import router as ipc_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    await init_db()
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


@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "JurisQuery API",
        "version": "0.1.0",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "debug": settings.debug,
    }
