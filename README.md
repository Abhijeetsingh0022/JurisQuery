<div align="center">
  <img src="https://media.licdn.com/dms/image/v2/D5612AQH80g6i2Z3oBQ/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1715065416298?e=2147483647&v=beta&t=4U4Z-WXXBfCq6nUq1Q4Z_6A0e3WfO9nO8gC9q7A4J3s" alt="JurisQuery Header" width="100%" />

  <h1>⚖️ JurisQuery.ai</h1>
  <p><strong>Enterprise Legal Intelligence Framework & Agentic RAG Platform</strong></p>

  [![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://python.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://postgresql.org)
  [![Qdrant](https://img.shields.io/badge/Qdrant-Vector_Search-red?logo=qdrant)](https://qdrant.tech)
</div>

---

## 🏛️ Executive Summary

**JurisQuery** is an institutional-grade legal technology platform engineered to bridge the gap between static legal archives and generative intelligence. It implements a sophisticated **Agentic RAG (Retrieval-Augmented Generation)** architecture that allows legal professionals to interact with thousands of documents simultaneously, conduct autonomous web-based discovery, and navigate complex legislative transitions (like IPC to BNS) with absolute mathematical precision.

🔗 **Repository:** [https://github.com/Abhijeetsingh0022/JurisQuery.git](https://github.com/Abhijeetsingh0022/JurisQuery.git)

---

## 📋 Comprehensive Technical Index

1. [System Capabilities](#-system-capabilities)
2. [Advanced RAG Architecture](#-advanced-rag-architecture)
3. [Agentic Intelligence & Web Discovery](#-agentic-intelligence--web-discovery)
4. [Backend Infrastructure & Security](#-backend-infrastructure--security)
5. [Frontend Architecture & UI Design](#-frontend-architecture--ui-design)
6. [Database Topology](#-database-topology)
7. [Environment Configuration Reference](#-environment-configuration-reference)
8. [Local Development & Deployment](#-local-development--deployment)

---

## 🌟 System Capabilities

### 1. Collaborative Case Folders
Unlike standard single-doc RAG, JurisQuery supports **Case Folders**—logical groupings of multiple documents (PDF, DOCX, TXT). Users can query the entire folder, and the system synthesizes context from disparate files using a **Map-Reduce Parallel Retrieval** pattern.

### 2. Autonomous Legal Agents
If local documentation is insufficient, the **Agentic Research Pipeline** (`app/research/agent.py`) activates. It uses a self-correcting loop to:
*   Decompose the question into discrete internet search queries.
*   Acquire live data via the **Tavily Search API**.
*   Synthesize a grounded answer with interactive web citations.

### 3. IPC-BNS Interoperability
A custom-built mapping layer (`app/ipc/bns_service.py`) ensures that all legal references are modernized. The agent automatically appends transitional metadata to citations, mapping legacy **Indian Penal Code (IPC)** chapters to the **Bharatiya Nyaya Sanhita (BNS) 2023** counterparts.

---

## 🧠 Advanced RAG Architecture

JurisQuery implements a **Hybrid, Hierarchical Retrieval** strategy to eliminate common LLM pitfalls:

### ⚡ Hierarchical Parent-Child Chunking
To prevent "Context fragmentation," we store text in two layers:
- **Child Chunks (~500 chars):** Small, dense vectors stored in **Qdrant** for high-precision semantic matching.
- **Parent Chunks (~2000 chars):** Richer context blocks stored in **PostgreSQL**.
When a child is "hit" during search, the system retrieves the surrounding **Parent** to pass to the LLM, ensuring the model never sees "cut off" sentences.

### 🧬 Reciprocal Rank Fusion (RRF)
We solve the "Semantic vs. Keyword" gap by running two searches in parallel:
1.  **Semantic Search (Dense):** Captures intent via `text-embedding-004`.
2.  **Keyword Search (Sparse):** Captures exact legal jargon via PostgreSQL ILIKE.
The results are fused using the **RRF algorithm**, re-ranking documents based on their performance across both search types to deliver the mathematically optimal context window.

---

## 📡 Agentic Intelligence & Web Discovery

The **Brain Orchestrator** acts as the system's "Pre-Frontal Cortex," managing the following lifecycle:

1.  **Intent Classification:** Detects if the user needs document retrieval, world knowledge, or a web search.
2.  **SSE Streaming Status:** Instead of a generic loading spinner, the agent streams its internal state via Server-Sent Events (SSE):
    - `[STATUS] Searching web for Article 21 precedence...`
    - `[STATUS] Reading Tavily search results...`
    - `[STATUS] Synthesizing final answer...`
3.  **Reflection Pass:** Post-generation, a secondary LLM check verifies that every claim is explicitly supported by the retrieved citations.

---

## 🏗️ Backend Infrastructure & Security

### 🔐 Multi-Layer Security
- **Asymmetric JWKS Validation:** JurisQuery uses **Clerk** for identity. The backend fetches the public JSON Web Key Set (JWKS) from Clerk's edge, validating JWTs using RS256 asymmetric cryptography. No secrets are shared between frontend and backend.
- **Stateless Authorization:** Every protected route verifies the signature, issuer, and expiration, ensuring zero-session vulnerabilities.

### 🔀 Distributed LLM Reliability
To prevent downtime from API rate limits, the system implements **Provider Rotation**:
- **Primary:** Google Gemini 2.5 Flash (Latency-optimized).
- **Secondary:** Groq Lllama-3.3 70B (Throughput-optimized).
Failure to reach the primary provider triggers an automatic, transparent fallback to the redundant cluster.

---

## 🖥️ Frontend Architecture & UI Design

### 💠 Performance-First Next.js 15+
- **Server-Sent Events (SSE) Bridge:** A customized SSE parser in `services/ragService.ts` handles the complex status+token multi-line stream from the backend.
- **State Hydration:** Leverages **TanStack Query (v5)** for resilient cache management and background refetching of document statuses.

### 🎨 Legal Design System (Tailwind 4)
- **Authority Serif Typography:** Headers use `Playfair Display` to evoke the gravitas of legal documentation.
- **Geometric San-Serif:** Interfaces use `Outfit` for maximum legibility in high-density data views.
- **Micro-Animations:** Driven by `Framer Motion`, including fluid sidebar transitions and the "Agent Thinking" waveform.

---

## 📂 Project Topology

```bash
jurisquery/
├── backend/                   # FastAPI Infrastructure
│   ├── app/
│   │   ├── auth/              # RS256 JWKS Security Layer
│   │   ├── chat/              # SSE Streaming & Message Persistence
│   │   ├── documents/         # Multimodal (PDF/Docx) Processing
│   │   ├── folders/           # Multi-document many-to-many orchestration
│   │   ├── rag/               # RRF Fusion & Hierarchical Vector logic
│   │   ├── research/          # Autonomous Agentic Agent (Tavily)
│   │   └── llm/               # Polymorphic LLM Drivers (Gemini/Groq)
│   └── alembic/               # Automated SQL Migrations
└── frontend/                  # Next.js 15+ System
    ├── src/
    │   ├── features/          # Domain Logic (ChatWindow, DocViewer)
    │   ├── services/          # Real-time SSE fetch implementations
    │   └── components/        # Framer Motion enabled UI blocks
```

---

## ⚙️ Environment Configuration Reference

### Backend `.env`
| Variable | Purpose |
| :--- | :--- |
| `DATABASE_URL` | Neon/Postgres pool connection. |
| `QDRANT_URL` | Vector Cloud URL. |
| `GEMINI_API_KEY` | Google AI Studio token. |
| `TAVILY_API_KEY` | Needed for the **Agentic Web** feature. |
| `CLERK_FRONTEND_API` | Used to verify asymmetric JWTs. |

### Frontend `.env.local`
| Variable | Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk UI keys. |
| `NEXT_PUBLIC_BASE_URL` | Backend URL (e.g. `http://localhost:8000`). |

---

## 🚀 Local Development & Deployment

### 1. The `uv` Workflow (Backend)
```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

### 2. The `next` Workflow (Frontend)
```bash
cd frontend
npm install
npm run dev
```

### 3. Production Deployment
JurisQuery is optimized for **Render** (Backend) and **Vercel** (Frontend).
*   **Database:** Use **Neon.tech** for serverless PostgreSQL scaling.
*   **Vector:** Use **Qdrant Cloud** ($25 Starter for dedicated hosting).
*   **Storage:** Deploy **Cloudinary** for persistent legal asset hosting.

---

**JurisQuery Team** - [@Abhijeetsingh0022](https://github.com/Abhijeetsingh0022) | Built for the future of Law. ⚖️ 🚀 
