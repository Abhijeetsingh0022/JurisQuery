# JurisQuery Backend

> FastAPI Backend for Legal Document RAG Analysis

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
   uv run uvicorn src.main:app --reload
   ```

6. **Access the API**
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## 📁 Project Structure

```
backend/
├── src/
│   ├── auth/           # Authentication
│   ├── documents/      # Document upload & processing
│   ├── rag/            # RAG pipeline (embeddings, retrieval)
│   ├── chat/           # Chat sessions & history
│   ├── llm/            # LLM integrations (Gemini)
│   ├── storage/        # File storage (Cloudinary)
│   ├── config.py       # Settings
│   ├── database.py     # Database setup
│   └── main.py         # FastAPI app
├── alembic/            # Database migrations
├── tests/              # Test suite
├── pyproject.toml      # uv config & dependencies
└── .env.example        # Environment template
```

## 🔧 Development

### Running Tests
```bash
uv run pytest
```

### Linting & Formatting
```bash
uv run ruff check --fix src
uv run ruff format src
```

### Creating Migrations
```bash
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/documents/upload | Upload document |
| GET | /api/documents | List documents |
| POST | /api/rag/query | Query with RAG |
| POST | /api/chat/sessions | Create chat session |
| POST | /api/chat/sessions/{id}/messages | Send message |

## 🔑 Environment Variables

See `.env.example` for all required variables:
- `DATABASE_URL` - Neon PostgreSQL connection
- `GEMINI_API_KEY` - Google AI API key
- `QDRANT_URL` / `QDRANT_API_KEY` - Vector database
- `CLOUDINARY_*` - File storage credentials
