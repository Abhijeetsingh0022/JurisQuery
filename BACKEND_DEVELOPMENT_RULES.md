# JurisQuery Backend Development Rules

> **FastAPI Backend - Best Practices & Conventions**

---

## 📋 Overview

This document defines the backend development standards for JurisQuery.ai, based on industry best practices from CodeSignal's FastAPI architecture course and the widely-adopted `fastapi-best-practices` repository.

---

## 🏗️ Project Structure

Organize by **domain/feature**, not file type. This scales better for monoliths with multiple modules.

```
backend/
├── alembic/                         # Database migrations
├── src/
│   ├── auth/                        # Auth domain
│   │   ├── router.py                # Endpoints
│   │   ├── schemas.py               # Pydantic models
│   │   ├── models.py                # SQLAlchemy/DB models
│   │   ├── service.py               # Business logic
│   │   ├── dependencies.py          # Route dependencies
│   │   ├── config.py                # Module-specific config
│   │   ├── constants.py             # Error codes, enums
│   │   ├── exceptions.py            # Custom exceptions
│   │   └── utils.py                 # Helpers (non-business)
│   │
│   ├── documents/                   # Document processing domain
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── models.py
│   │   ├── service.py
│   │   └── ...
│   │
│   ├── chat/                        # RAG/Chat domain
│   │   └── ...
│   │
│   ├── config.py                    # Global configuration
│   ├── database.py                  # DB connection setup
│   ├── exceptions.py                # Global exceptions
│   ├── models.py                    # Shared models
│   └── main.py                      # FastAPI app entry point
│
├── tests/
│   ├── auth/
│   ├── documents/
│   └── chat/
│
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
│
├── .env
├── alembic.ini
└── logging.ini
```

### Module File Conventions

| File | Purpose |
|------|---------|
| `router.py` | All endpoints for the module |
| `schemas.py` | Pydantic request/response models |
| `models.py` | SQLAlchemy/database models |
| `service.py` | Core business logic |
| `dependencies.py` | Reusable route dependencies |
| `config.py` | Environment variables for the module |
| `constants.py` | Error codes, enums, magic values |
| `exceptions.py` | Module-specific exceptions (e.g., `DocumentNotFound`) |
| `utils.py` | Helper functions (non-business logic) |

---

## 🧱 Layered Architecture

Separate concerns into **three distinct layers**:

| Layer | Responsibility | Example |
|-------|----------------|---------|
| **Routing** | Map URLs to handler functions | `router.py` with `APIRouter` |
| **Controller/Handler** | Parse requests, call services, format responses | Route functions in `router.py` |
| **Service** | Business logic, computations, data processing | `service.py` functions |

### Key Principles

1. **Controllers don't contain business logic** — they delegate to services.
2. **Services are unaware of HTTP** — they work with data, not requests/responses.
3. **Cross-module imports use explicit names**:
   ```python
   from src.auth import constants as auth_constants
   from src.documents import service as document_service
   ```

---

## ⚡ Async Routes

FastAPI is **async-first**. Understand when to use `async def` vs `def`:

| Scenario | Use | Why |
|----------|-----|-----|
| **I/O operations (DB, HTTP, files)** | `async def` + `await` | Non-blocking, efficient |
| **Blocking sync library** | `def` (sync route) | Runs in threadpool, doesn't block event loop |
| **CPU-intensive tasks** | Offload to `multiprocessing` or Celery | GIL prevents thread parallelism |

### ⚠️ Critical Rule
```python
# ❌ BAD: Blocks the entire event loop
@router.get("/bad")
async def bad_route():
    time.sleep(10)  # BLOCKING in async context!
    return {"status": "done"}

# ✅ GOOD: Non-blocking async I/O
@router.get("/good")
async def good_route():
    await asyncio.sleep(10)
    return {"status": "done"}

# ✅ GOOD: Sync route runs in threadpool
@router.get("/also-good")
def sync_route():
    time.sleep(10)  # OK - runs in separate thread
    return {"status": "done"}
```

---

## 📐 Pydantic Best Practices

### Use Pydantic Extensively
Leverage built-in validators: `Field`, `EmailStr`, `AnyUrl`, regex patterns, enums.

```python
from pydantic import BaseModel, Field, EmailStr
from enum import StrEnum

class UserRole(StrEnum):
    ADMIN = "admin"
    USER = "user"

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern="^[a-zA-Z0-9_]+$")
    role: UserRole = UserRole.USER
```

### Custom Base Model
Create a shared base model for consistent serialization:

```python
from pydantic import BaseModel, ConfigDict

class CustomModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )
```

### Decouple Settings
Split `BaseSettings` across modules:

```python
# src/auth/config.py
class AuthConfig(BaseSettings):
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 30

auth_settings = AuthConfig()

# src/config.py (global)
class Config(BaseSettings):
    DATABASE_URL: PostgresDsn
    ENVIRONMENT: str = "development"

settings = Config()
```

---

## 🔗 Dependencies

### Beyond DI: Use for Validation
Dependencies validate data against DB/external services:

```python
# dependencies.py
async def valid_document_id(document_id: UUID4) -> dict:
    doc = await document_service.get_by_id(document_id)
    if not doc:
        raise DocumentNotFound()
    return doc

# router.py
@router.get("/documents/{document_id}")
async def get_document(doc: dict = Depends(valid_document_id)):
    return doc
```

### Chain Dependencies
Compose complex validations from simpler ones:

```python
async def valid_owned_document(
    doc: dict = Depends(valid_document_id),
    user: dict = Depends(get_current_user),
) -> dict:
    if doc["owner_id"] != user["id"]:
        raise PermissionDenied()
    return doc
```

### Prefer Async Dependencies
Sync dependencies run in threadpool (overhead). Use `async def` even if not awaiting:

```python
# ✅ Preferred
async def get_query_params(limit: int = 10) -> dict:
    return {"limit": limit}

# ❌ Avoid (unnecessary thread overhead)
def get_query_params(limit: int = 10) -> dict:
    return {"limit": limit}
```

---

## 🗄️ Database Conventions

### Naming Standards
| Rule | Example |
|------|---------|
| **Tables**: `lower_snake_case`, singular | `document`, `user_session` |
| **Foreign keys**: table_column pattern | `document_id`, `owner_id` |
| **Timestamps**: `_at` suffix | `created_at`, `updated_at` |
| **Dates**: `_date` suffix | `expiry_date` |
| **Group by module** | `payment_invoice`, `payment_transaction` |

### Index Naming Convention (PostgreSQL)
```python
from sqlalchemy import MetaData

POSTGRES_NAMING_CONVENTION = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}

metadata = MetaData(naming_convention=POSTGRES_NAMING_CONVENTION)
```

### SQL-First Approach
Prefer database-level processing over Python:
- Complex joins → SQL
- Aggregations → SQL
- JSON building for nested responses → `json_build_object()`

---

## 📝 Migrations (Alembic)

1. **Static and reversible** — don't depend on dynamic runtime data.
2. **Descriptive names** with date prefix:
   ```ini
   # alembic.ini
   file_template = %%(year)d-%%(month).2d-%%(day).2d_%%(slug)s
   ```
   Example: `2026-01-17_add_document_vectors.py`

---

## 📖 API Documentation

### Hide Docs in Production
```python
SHOW_DOCS_ENVS = ("development", "staging")

app_config = {"title": "JurisQuery API"}
if settings.ENVIRONMENT not in SHOW_DOCS_ENVS:
    app_config["openapi_url"] = None

app = FastAPI(**app_config)
```

### Document Routes Thoroughly
```python
@router.post(
    "/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new document",
    description="Upload and process a legal document for RAG analysis.",
    tags=["Documents"],
)
async def upload_document(...):
    pass
```

---

## 🧪 Testing

### Async Test Client from Day 1
```python
import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

@pytest.mark.asyncio
async def test_upload_document(client: AsyncClient):
    resp = await client.post("/api/documents", json={...})
    assert resp.status_code == 201
```

---

## 🔧 Developer Tools

### Use Ruff
Replace Black, isort, autoflake with Ruff:

```bash
#!/bin/sh
ruff check --fix src
ruff format src
```

### Pre-commit Hook (Optional)
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
```

---

## 🔒 Error Handling

### Custom Exceptions per Module
```python
# src/documents/exceptions.py
from fastapi import HTTPException, status

class DocumentNotFound(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

class DocumentProcessingFailed(HTTPException):
    def __init__(self, reason: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Processing failed: {reason}"
        )
```

---

## 📚 References

- [CodeSignal: Designing Maintainable Backend Architecture with FastAPI](https://codesignal.com/learn/courses/exposing-your-code-translator-with-fastapi/lessons/designing-a-maintainable-backend-architecture-with-fastapi)
- [fastapi-best-practices (GitHub)](https://github.com/zhanymkanov/fastapi-best-practices)
- [FastAPI Official Docs](https://fastapi.tiangolo.com/)
