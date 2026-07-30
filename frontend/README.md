<div align="center">
  <h1>⚖️ JurisQuery Frontend</h1>
  <p><strong>Next-Generation Legal Intelligence Interface</strong></p>

  [![Next.js](https://img.shields.io/badge/Next.js-15.0+-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
  [![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
</div>

---

## 🏛️ Project Vision

The **JurisQuery Frontend** is a premium, high-performance web application designed for legal professionals. It translates complex backend RAG (Retrieval-Augmented Generation) and Agentic Research into a seamless, intuitive, and interactive user experience. Built with **Next.js 15+** and **Tailwind CSS 4**, it prioritizes speed, clarity, and "Living Documentation."

---

## 🔥 Key Features

### 1. Agentic Chat Interface
*   **Dual-Mode Toggle:** Seamlessly switch between **Document RAG** (local knowledge) and **Web Research** (live legal discovery) mode via a unified interface.
*   **High-Fidelity SSE Streaming:** Implements a custom Server-Sent Events (SSE) bridge to provide token-by-token text generation and real-time agent status updates (e.g., *"Searching web..."*, *"Analyzing precedence..."*).
*   **Interactive Citations:** Rich, hoverable citation markers that link directly to multi-page PDF sources or external web URLs.

### 2. Intelligent Document Hub
*   **Advanced File Processing:** Supports drag-and-drop uploads for PDF, DOCX, and TXT with real-time vectorization status tracking.
*   **Folder-Based Synthesis:** Organizes documents into "Case Folders," enabling cross-document synthesis through a "Map-Reduce" retrieval strategy.

### 3. Legal Tools Suite
*   **IPC-BNS Predictor:** Specialized interface for navigating the Indian legal transition, providing smart mappings between legacy IPC sections and the modern BNS 2023 statutes.
*   **Integrated PDF Viewer:** High-performance, in-browser PDF exploration with highlighted text segments corresponding to RAG citations.

---

## 🛠 Tech Stack

### Core Frameworks
- **Next.js 15+ (App Router):** Leveraging Server Components for performance and Client Components for interactivity.
- **TypeScript:** Ensuring strict type safety across all API responses and component props.
- **Clerk:** Enterprise-grade authentication and user session management.

### UI & UX
- **Tailwind CSS 4:** Utilizing the latest JIT engine and fluid design utilities.
- **Framer Motion:** Powering micro-animations, layout transitions, and the "Agent Thinking" visualizations.
- **Lucide React:** A comprehensive set of professional vector icons for legal actions.
- **Sonner:** Elegant, non-intrusive toast notifications for background processing.

### Data & State
- **TanStack Query (v5):** Robust server-state management, caching, and optimistic UI updates for document processing.
- **Native AbortController:** Integrated into `ragService` to allow users to cancel long-running LLM streams instantly.

---

## 📂 Project Architecture

```bash
jurisquery-frontend/
├── src/
│   ├── app/            # App Router (Parallel & Intercepting routes)
│   │   ├── (auth)      # Authentication flows (Sign-in/up)
│   │   ├── (dashboard) # Core application (Chat, Documents, Folders)
│   │   └── (public)    # Marketing and landing pages
│   ├── features/       # Domain-specific logic (Chat, Documents, IPC)
│   │   └── chat/       # SSE Streaming and Message Bubbles
│   ├── components/     # Reusable UI components
│   │   ├── common/     # Buttons, Modals, Loaders
│   │   └── layout/     # Sidebar, Header, Navigation
│   ├── services/       # API abstraction layer (ragService.ts)
│   ├── hooks/          # Custom shared React hooks
│   ├── lib/            # Utility functions (cn, formatters)
│   └── types/          # Global TypeScript interfaces
├── public/             # Static assets (Logos, Icons)
└── next.config.ts      # Application build & proxy configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js 20+**
- **npm** or **pnpm** (preferred)

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_key
NEXT_PUBLIC_BASE_URL=http://localhost:8000
```

### 3. Installation
```bash
npm install
```

### 4. Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## ⚖️ Design Philosophy
JurisQuery follows a **"Legal Tech Professional"** aesthetic:
- **Typography:** Uses `Outfit` for geometric clarity in interfaces and `Playfair Display` for a sophisticated, authoritative serif look in headers.
- **Palette:** A monochromatic foundation with deep indigos and refined ambers for primary actions and legal highlights.
- **Interactivity:** Every long-running process (like RAG indexing or Agentic Web Search) is visually communicated to the user to maintain trust and transparency.
