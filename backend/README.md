# JurisQuery Backend

> FastAPI Backend for Legal Document RAG Analysis with AI-Powered IPC Prediction

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) package manager

### Setup

1. **Clone and navigate to backend**
   ```bash
   cd backend
   ```

2. **Install dependencies with uv**
   ```bash
   uv sync
   ```

3. **Copy environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Run database migrations**
   ```bash
   uv run alembic upgrade head
   ```

5. **Start the development server**
   ```bash
   uv run uvicorn app.main:app --reload
   ```

6. **Access the API**
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## 📁 Project Structure

```
backend/
├── app/
│   ├── auth/           # JWT validation, Clerk integration
│   ├── documents/      # Upload, CRUD, status tracking
│   ├── rag/            # RAG pipeline (hybrid search, embeddings)
│   ├── chat/           # Chat sessions & message history
│   ├── ipc/            # IPC Section Prediction feature
│   ├── llm/            # LLM integrations
│   │   ├── gemini.py   # Gemini 2.0 Flash (API key rotation)
│   │   ├── groq_llm.py # Groq LLaMA 3.3 (fallback)
│   │   └── brain.py    # Meta-reasoning (query analysis, verification)
│   ├── storage/        # Cloudinary file storage
│   ├── config.py       # Pydantic settings
│   ├── database.py     # Async SQLAlchemy
│   ├── exceptions.py   # Custom error hierarchy
│   └── main.py         # FastAPI application
├── alembic/            # Database migrations
├── dataset/            # IPC dataset (FIR_DATASET.csv)
├── tests/              # Test suite
├── pyproject.toml      # uv config & dependencies
└── .env.example        # Environment template
```

## 🧠 Core Modules

### RAG Pipeline (`rag/`)

- **Hybrid Search**: Combines Qdrant vector search + PostgreSQL keyword search
- **RRF Fusion**: Reciprocal Rank Fusion merges and re-ranks results
- **Parent-Child Chunking**: Search on small chunks, return parent context
- **BrainLLM Integration**: Query optimization and response verification

### IPC Predictor (`ipc/`)

- **Dataset Loading**: Ingests IPC sections from CSV
- **LLM Prediction**: Uses Gemini to predict applicable sections
- **Confidence Scoring**: 0-1 confidence with reasoning

### LLM Module (`llm/`)

| Component | Description |
|-----------|-------------|
| **GeminiLLM** | Gemini 2.0 Flash with API key rotation for rate limits |
| **GroqLLM** | LLaMA 3.3 70B fallback |
| **BrainLLM** | Query analysis, response verification, refinement |

## 🔧 Development

### Running Tests
```bash
uv run pytest
```

### Linting & Formatting
```bash
uv run ruff check --fix app
uv run ruff format app
```

### Creating Migrations
```bash
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
```

## 📡 API Endpoints

### Documents API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload` | Upload document |
| GET | `/api/documents` | List documents |
| GET | `/api/documents/{id}` | Get document details |
| GET | `/api/documents/{id}/status` | Polling status |
| DELETE | `/api/documents/{id}` | Delete document |

### RAG API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rag/query` | Query with RAG (hybrid search) |

### Chat API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/sessions` | Create chat session |
| GET | `/api/chat/sessions` | List sessions |
| POST | `/api/chat/sessions/{id}/messages` | Send message |
| DELETE | `/api/chat/sessions/{id}` | Delete session |

### IPC API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ipc/predict` | Predict IPC sections |
| GET | `/api/v1/ipc/sections` | List IPC sections |
| GET | `/api/v1/ipc/sections/{num}` | Get section details |
| POST | `/api/v1/ipc/load-dataset` | Load IPC dataset (admin) |

## 🔑 Environment Variables

See `.env.example` for all required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `GEMINI_API_KEYS` | Comma-separated Gemini keys (rotation) |
| `QDRANT_URL` | Qdrant Cloud URL |
| `QDRANT_API_KEY` | Qdrant Cloud API key |
| `CLOUDINARY_*` | Cloudinary credentials |
| `GROQ_API_KEY` | Optional Groq key for fallback |
| `CLERK_*` | Clerk authentication keys |

## 📊 Architecture Patterns

- **Router → Service → Model** pattern across all modules
- **Async-first** with SQLAlchemy async sessions
- **Background tasks** for document processing
- **Retry with tenacity** for LLM calls
- **API key rotation** for rate limit resilience
