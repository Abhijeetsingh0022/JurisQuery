# JurisQuery Frontend

> Next.js 16 Frontend for Legal Document Analysis with AI

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your Clerk keys

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📁 Project Structure

```
frontend/src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── dashboard/      # Main dashboard
│   │   ├── documents/      # Document management
│   │   ├── ipc-predictor/  # IPC Section Predictor
│   │   ├── history/        # Chat history
│   │   └── settings/       # User settings
│   ├── (public)/           # Landing pages
│   ├── sign-in/            # Clerk sign-in
│   └── sign-up/            # Clerk sign-up
├── components/
│   ├── layout/             # Sidebar, Header
│   ├── dashboard/          # Dashboard components
│   ├── home/               # Landing page sections
│   └── providers/          # React Query provider
├── features/
│   ├── documents/          # Document upload, cards
│   ├── chat/               # Chat interface
│   └── ipc/                # IPC predictor components
├── services/
│   ├── api/client.ts       # Centralized fetch wrapper
│   └── ragService.ts       # API methods for documents, chat, RAG
└── types/                  # TypeScript interfaces
```

## 🎨 Key Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Document list, stats, quick upload |
| **Document Viewer** | PDF/DOCX display with chat |
| **IPC Predictor** | Crime description → IPC sections |
| **Chat History** | All conversations with documents |
| **Clerk Auth** | Sign-in, sign-up, protected routes |

## 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | App Router, server components |
| **TypeScript 5** | Type safety |
| **TailwindCSS 4** | Styling |
| **Clerk** | Authentication |
| **Framer Motion** | Animations |
| **Lucide React** | Icons |
| **React Query** | Server state management |

## 📡 API Integration

All API calls go through `services/ragService.ts`:

```typescript
// Documents
uploadDocument(file, onProgress)
getDocuments(skip, limit)
deleteDocument(documentId)

// Chat
createChatSession(documentId)
sendMessage(sessionId, content)
getChatSessions()

// RAG
queryDocument(documentId, query, topK)
```

## 🎯 Design System

- **Color Palette**: Deep Navy (#2a3b4e), Soft Cream (#f7f3f1)
- **Typography**: Outfit (sans), Playfair Display (serif)
- **Animations**: Framer Motion micro-interactions
- **Components**: Cards, modals, sidebars

## 🔧 Development

```bash
# Development server
npm run dev

# Type checking
npm run lint

# Production build
npm run build
npm start
```

## 🔑 Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```
