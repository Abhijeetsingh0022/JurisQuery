# JurisQuery.ai Development Rules

> **Your Intelligent Legal Assistant. Powered by RAG.**

---

## 📋 Platform Overview

**JurisQuery** is a next-generation legal tech platform designed to simplify complex document analysis. By combining a sleek, user-friendly interface with powerful AI, we allow users to upload legal contracts, ask natural language questions, and receive instant, citation-backed answers. It transforms hours of manual reading into seconds of automated insight.

---

## 🎯 Key Frontend Features

### 1. Smart Dashboard (Command Center)
| Element | Description |
|---------|-------------|
| **Purpose** | Clean, minimalistic landing page showing user's recent activity |
| **Components** | "Recent Documents" cards, "Saved Queries" section, "Analysis History" timeline |
| **Layout** | Card-based grid with quick-action buttons |

### 2. Drag-and-Drop Document Upload
| Element | Description |
|---------|-------------|
| **Supported Formats** | PDF, DOCX, TXT |
| **Upload Zone** | Intuitive drag-and-drop area with visual feedback |
| **Progress States** | `Uploading → Cleaning → Vectorizing → Ready` |
| **Feedback** | Real-time progress bars for each processing stage |

### 3. Split-Screen "Chat with Doc" Interface
| Panel | Description |
|-------|-------------|
| **Left Panel (PDF Viewer)** | Displays original uploaded document with syntax highlighting |
| **Right Panel (AI Chatbot)** | ChatGPT-style chat for asking questions (e.g., "Does this contract include an indemnity clause?") |
| **Interaction** | AI answers highlight relevant sections in PDF Viewer for instant verification |

### 4. Citation Highlights
| Feature | Description |
|---------|-------------|
| **Citations** | AI responses include clickable links (e.g., `[Source: Page 3, Para 2]`) |
| **Auto-Scroll** | Clicking citation auto-scrolls document viewer to exact location |
| **Visual Highlight** | Source text highlighted in document for easy verification |

### 5. Export & Share
| Tool | Description |
|------|-------------|
| **PDF Export** | One-click export of AI analysis as formatted PDF report |
| **Email Share** | Share chat summary via email with recipients |
| **Copy to Clipboard** | Quick copy of answers with citations |

---

## 🛠️ Technology Stack

### Core Technologies
| Layer | Technology |
|-------|------------|
| **Frontend Framework** | React (latest) with TypeScript |
| **Styling** | TailwindCSS |
| **Build Tool** | Create React App (CRA) with TypeScript template |
| **API Communication** | REST with JSON, async/await patterns |

### State Management & Data Fetching
| Purpose | Technology |
|---------|------------|
| **Global State** | Zustand (lightweight) or Redux Toolkit |
| **Server State** | React Query (TanStack Query) |
| **Form State** | React Hook Form + Zod validation |

### UI Libraries & Components
| Purpose | Technology |
|---------|------------|
| **Component Library** | Headless UI / Radix UI (unstyled, accessible) |
| **Icons** | Lucide React or Heroicons |
| **PDF Viewer** | react-pdf or @react-pdf-viewer/core |
| **Animations** | Framer Motion |
| **Toast Notifications** | React Hot Toast or Sonner |

### Development Tools
| Purpose | Technology |
|---------|------------|
| **Linting** | ESLint with TypeScript rules |
| **Formatting** | Prettier |
| **Testing** | Jest + React Testing Library |
| **E2E Testing** | Playwright or Cypress |

---

## 🎨 Design Aesthetics

### Typography Guidelines

#### Primary Font Pairing (Recommended for JurisQuery)
| Role | Font | Style |
|------|------|-------|
| **Headings** | **Roslindale** | Bold serif – conveys authority and sophistication |
| **Body Text** | **Satoshi** | Clean sans-serif – ensures readability |

#### Alternative Font Pairings
| Option | Header Font | Body Font | Best For |
|--------|-------------|-----------|----------|
| **Modern Minimalist** | Ivy Presto Display | TT Hoves | Forward-thinking, established firms |
| **Premium Editorial** | PP Editorial Old | Axiforma | High-profile, premium brand image |
| **Understated Luxury** | Feature Display | Neue Haas Grotesk | Boutique, personalized service |

#### Font Size Guidelines
| Element | Size |
|---------|------|
| **Body Text** | 16–18px (14pt minimum for documents) |
| **Headings (H1)** | 32–48px |
| **Subheadings (H2)** | 24–32px |
| **Small Text / Captions** | 12–14px |

---

### Color Palette (Recommended for JurisQuery)

#### Primary Palette: Modern Professional
| Color | Hex Code | Usage |
|-------|----------|-------|
| **Deep Navy** | `#2a3b4e` | Primary background, headers |
| **Soft Cream** | `#f7f3f1` | Light background, cards |
| **Pure White** | `#ffffff` | Content areas |
| **Text Dark** | `#1a1a1a` | Body text |

#### Alternative Palettes

**Premium Gold & Green**
| Color | Hex Code | Usage |
|-------|----------|-------|
| Warm Cream | `#f3edda` | Background |
| Deep Forest Green | `#192616` | Primary accent, text |
| Gold | `#feae03` | Highlights, CTAs |

**Understated Luxury**
| Color | Hex Code | Usage |
|-------|----------|-------|
| Soft Beige | `#faf5ef` | Background |
| Deep Burgundy | `#502223` | Primary accent |
| Warm Taupe | `#c9b398` | Secondary accent |

**Neutral Professional**
| Color | Hex Code | Usage |
|-------|----------|-------|
| Off-White | `#fef9ef` | Background |
| Charcoal | `#5d5d5d` | Text, icons |
| Sage Green | `#94a39f` | Accents |
| Slate | `#6e797a` | Secondary elements |

---

### Visual Excellence Principles
- **Smooth gradients** – Add depth and visual interest
- **Micro-animations** – Enhance user engagement with subtle, responsive interactions
- **Consistent spacing** – Use an 8px grid system for harmony

### Dynamic Design Principles
- Implement hover effects and interactive elements
- Create interfaces that feel responsive and alive
- Use transitions and animations to improve user experience

### Premium Quality Standards
- Designs must feel state-of-the-art and premium
- Avoid simple minimum viable products
- **No placeholders** – Use real images or generate them as needed

---

## 🧠 Laws of UX

> Reference: [lawsofux.com](https://lawsofux.com/) – Best practices for building user interfaces.

### Core Principles

| Law | Description | Application |
|-----|-------------|-------------|
| **Aesthetic-Usability Effect** | Users perceive aesthetically pleasing designs as more usable | Invest in visual polish; beautiful design increases user tolerance for minor issues |
| **Jakob's Law** | Users prefer your site to work like other sites they know | Use familiar patterns (navigation, forms, buttons); don't reinvent conventions |
| **Hick's Law** | Decision time increases with number/complexity of choices | Minimize options; use progressive disclosure; highlight recommended actions |
| **Fitts's Law** | Time to reach a target depends on distance and size | Make buttons large and easily reachable; reduce distance to key actions |
| **Miller's Law** | Average person holds 7±2 items in working memory | Chunk content into groups of 5-9; don't overwhelm with information |

### Cognitive Psychology

| Law | Description | Application |
|-----|-------------|-------------|
| **Doherty Threshold** | Productivity soars when response time < 400ms | Optimize performance; use loading states; provide instant feedback |
| **Cognitive Load** | Mental resources needed to understand/interact | Simplify interfaces; remove unnecessary elements; use clear hierarchy |
| **Choice Overload** | Too many options cause overwhelm and paralysis | Limit choices; use smart defaults; provide clear recommendations |
| **Postel's Law** | Be liberal in what you accept, conservative in what you send | Accept varied user input; validate gracefully; output consistently |

### Gestalt Principles

| Principle | Description | Application |
|-----------|-------------|-------------|
| **Law of Proximity** | Nearby objects are grouped together | Group related elements; use whitespace to separate unrelated items |
| **Law of Similarity** | Similar elements are perceived as a group | Use consistent styling for related items (colors, shapes, sizes) |
| **Law of Common Region** | Elements in defined boundaries are grouped | Use cards, borders, backgrounds to group related content |
| **Law of Prägnanz** | Complex images are simplified to the simplest form | Design simple, clear layouts; avoid unnecessary complexity |
| **Law of Uniform Connectedness** | Connected elements are perceived as related | Use lines, arrows, visual connections to show relationships |

### Memory & Attention

| Law | Description | Application |
|-----|-------------|-------------|
| **Serial Position Effect** | First and last items are remembered best | Place important content at beginning and end of lists |
| **Von Restorff Effect** | Unique items stand out and are remembered | Make CTAs visually distinct; use contrast for key elements |
| **Zeigarnik Effect** | Incomplete tasks are remembered better | Use progress indicators; show completion status |
| **Peak-End Rule** | Experiences judged by peak moments and endings | Create positive peaks; ensure smooth, satisfying task completion |

### Behavioral Principles

| Law | Description | Application |
|-----|-------------|-------------|
| **Goal-Gradient Effect** | Motivation increases as goal approaches | Show progress; use progress bars; celebrate near-completion |
| **Paradox of Active User** | Users start immediately, don't read instructions | Design intuitive interfaces; use inline guidance; avoid manuals |
| **Tesler's Law** | Complexity cannot be eliminated, only transferred | Handle complexity in code, not user interface |
| **Pareto Principle** | 80% of effects from 20% of causes | Focus on the 20% of features users interact with most |

---

## 🎯 Figma's 7 UI Design Principles

> Reference: [Figma Resource Library](https://www.figma.com/resource-library/ui-design-principles/)

| # | Principle | Description | How to Apply |
|---|-----------|-------------|--------------|
| 1 | **Hierarchy** | Help users recognize key information at a glance | Use font size/weight, contrast, and spacing to guide attention; prioritize what users care about most |
| 2 | **Progressive Disclosure** | Reveal information and features gradually | Break complex tasks into smaller steps; show progress indicators; avoid overwhelming initial screens |
| 3 | **Consistency** | Create familiarity through consistent patterns | Keep buttons, colors, and interactions uniform; deviations add cognitive load and create confusion |
| 4 | **Contrast** | Draw attention to important content strategically | Use high contrast for critical actions (e.g., red for delete); lower contrast for secondary options |
| 5 | **Accessibility** | Design for users with all abilities | Follow WCAG guidelines; use sufficient color contrast; provide alt text; ensure keyboard navigation |
| 6 | **Proximity** | Group related elements together | Place related controls near each other; use whitespace to separate unrelated elements |
| 7 | **Alignment** | Use grid systems for order and balance | Consistent alignment improves readability and creates predictable, professional layouts |

### Pro Tips for Effective UI Design

| Tip | Description |
|-----|-------------|
| **Apply Perspective** | Position elements to guide users through a logical sequence toward their goals |
| **Make it Effortless** | Good interfaces feel invisible; keep navigation consistent; provide clear visual feedback |
| **Apply Shortcuts** | Speed up common tasks with keyboard shortcuts and quick-access tools |
| **Conduct Testing** | Watch how people use your interface; catch problems early through regular testing |

---

## 🏗️ Implementation Workflow

### 1. Plan and Understand
- Fully understand the requirements
- Draw inspiration from modern, beautiful web designs
- Outline features needed for the initial version

### 2. Build the Foundation
- Start by creating/modifying `index.css`
- Implement the core design system with all tokens and utilities

### 3. Create Components
- Build components using the design system
- Ensure all components use predefined styles, not ad-hoc utilities
- Keep components focused and reusable

### 4. Assemble Pages
- Incorporate design and components into the main application
- Ensure proper routing and navigation
- Implement responsive layouts

### 5. Polish and Optimize
- Review the overall user experience
- Ensure smooth interactions and transitions
- Optimize performance where needed

---

## 🔍 SEO Best Practices

| Element | Requirement |
|---------|-------------|
| **Title Tags** | Proper, descriptive titles for each page |
| **Meta Descriptions** | Compelling summaries of page content |
| **Heading Structure** | Single `<h1>` per page with proper hierarchy |
| **Semantic HTML** | Use appropriate HTML5 semantic elements |
| **Unique IDs** | All interactive elements must have unique, descriptive IDs |
| **Performance** | Ensure fast page load times |

---

## 📝 Clean Code Principles

> Reference: [freeCodeCamp - How to Write Clean Code](https://www.freecodecamp.org/news/how-to-write-clean-code/)

### Core Philosophy

| Principle | Priority | Description |
|-----------|----------|-------------|
| **Effectiveness** | 1st | Code must solve the problem it's supposed to solve |
| **Efficiency** | 2nd | Code should run with reasonable time/space complexity |
| **Simplicity** | 3rd | Code should be easy to read, understand, and maintain |

### Clean Code Guidelines

| Guideline | Description | How to Apply |
|-----------|-------------|--------------|
| **Consistent Format** | Use uniform indentation, spacing, and syntax | Use linters (ESLint) and formatters (Prettier) |
| **Clear Naming** | Variables/functions should describe their purpose | `calculateTotalWithTax()` not `ab()` |
| **Conciseness vs Clarity** | Balance brevity with readability | Prefer clarity when in doubt |
| **Reusability** | Write code that can be used in multiple places | Create utility functions and shared components |
| **Clear Flow** | Avoid spaghetti code; use logical structure | Separate concerns; use pure functions |
| **Single Responsibility** | Each function/class does one thing | Split large functions into smaller ones |
| **Single Source of Truth** | Store data/config in one place | Use centralized config; avoid duplication |
| **Modularization** | Break code into smaller, manageable modules | Organize by feature, not file type |

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Variables** | camelCase | `userName`, `totalPrice` |
| **Functions** | camelCase, verb prefix | `getUser()`, `calculateTotal()` |
| **Components** | PascalCase | `UserProfile`, `NavigationBar` |
| **Constants** | UPPER_SNAKE_CASE | `API_KEY`, `MAX_RETRIES` |
| **Types/Interfaces** | PascalCase | `UserData`, `ApiResponse` |
| **Files (Components)** | PascalCase | `UserProfile.tsx` |
| **Files (Utilities)** | camelCase | `apiHelpers.ts` |

---

## 🔷 TypeScript Best Practices

### Strict Mode Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Type Definitions

| Rule | Example |
|------|---------|
| **Use `interface` for objects** | `interface User { name: string; email: string; }` |
| **Use `type` for unions/intersections** | `type Status = 'loading' \| 'success' \| 'error'` |
| **Prefer `type` for function types** | `type Handler = (e: Event) => void` |
| **Always type component props** | `interface ButtonProps { label: string; onClick: () => void; }` |

### Do's and Don'ts

| ✅ Do | ❌ Don't |
|-------|----------|
| Use explicit return types for functions | Use `any` type |
| Define types in separate `types/` folder | Use type assertions (`as`) unnecessarily |
| Use `unknown` instead of `any` | Ignore TypeScript errors with `@ts-ignore` |
| Use `readonly` for immutable props | Mutate objects/arrays directly |
| Use discriminated unions | Use optional chaining without null checks |

### Generic Types
```typescript
// Good: Reusable generic component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

// Good: Typed API response
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}
```

### Null Handling

| Pattern | Usage |
|---------|-------|
| **Optional chaining** | `user?.profile?.name` |
| **Nullish coalescing** | `value ?? 'default'` |
| **Type guards** | `if (user !== null) { ... }` |
| **Non-null assertion** | Use sparingly: `user!.name` (only when certain) |

---

## ⚛️ React Component Patterns

### Component Types

| Type | Use Case | Example |
|------|----------|---------|
| **Functional** | All components | `const Button: React.FC<Props> = () => {}` |
| **Presentational** | UI only, no logic | `Card`, `Badge`, `Avatar` |
| **Container** | Data fetching, state | `DashboardContainer`, `ChatContainer` |
| **Layout** | Page structure | `MainLayout`, `SidebarLayout` |

### Component Structure
```typescript
// 1. Imports
import { useState, useEffect } from 'react';
import { Button } from '@/components/common';
import type { User } from '@/types';

// 2. Types/Interfaces
interface UserCardProps {
  user: User;
  onSelect: (id: string) => void;
}

// 3. Component
export const UserCard: React.FC<UserCardProps> = ({ user, onSelect }) => {
  // 4. Hooks (in order: state, refs, effects, custom)
  const [isHovered, setIsHovered] = useState(false);
  
  // 5. Handlers
  const handleClick = () => onSelect(user.id);
  
  // 6. Render
  return (
    <div onClick={handleClick}>
      {user.name}
    </div>
  );
};
```

### Hooks Rules

| Rule | Description |
|------|-------------|
| **Order** | useState → useRef → useEffect → custom hooks |
| **Naming** | Custom hooks start with `use`: `useDocument`, `useChat` |
| **Dependencies** | Always include all dependencies in useEffect |
| **Cleanup** | Return cleanup function from useEffect when needed |

### Props Patterns

| Pattern | When to Use |
|---------|-------------|
| **Spread props** | `{...props}` for wrapper components |
| **Render props** | When children need parent data |
| **Compound components** | Related components that share state (e.g., Tabs) |
| **Default props** | Set defaults in destructuring: `{ size = 'md' }` |

### State Management Rules

| Scope | Solution |
|-------|----------|
| **Component-local** | `useState` |
| **Shared (few components)** | Lift state up + props |
| **Feature-wide** | React Context |
| **App-wide** | Zustand store |
| **Server state** | React Query |

---

## 🌐 Website Structure Types

> Reference: [Figma - Website Structure](https://www.figma.com/resource-library/website-structure/)

| Type | Description | Best For |
|------|-------------|----------|
| **Hierarchical (Tree)** | Top-down from homepage → categories → subcategories | E-commerce, business sites, informational sites |
| **Linear (Sequential)** | Fixed order, step-by-step navigation | Tutorials, onboarding flows, multi-step forms |
| **Matrix (Web)** | Flexible connections, multiple entry/exit points | Portfolios, knowledge bases, encyclopedias |
| **Database (Dynamic)** | Pages generated from database queries | Large e-commerce, news sites, CMS platforms |
| **Hybrid** | Combines multiple models | Complex sites serving multiple purposes |

### Key Website Components

| Component | Purpose |
|-----------|---------|
| **Homepage** | Anchor for navigation; directs to important areas |
| **Menu Navigation** | Clear, consistent paths across devices |
| **Categories** | Logical hierarchy for content organization |
| **Internal Links** | Connect related content; improve SEO |
| **Breadcrumbs** | Show user's location; enable easy backtracking |
| **Footer** | Secondary navigation, contact, legal links |

---

## 📁 Recommended Project Structure

> JurisQuery.ai - React + TypeScript + TailwindCSS

### Root Directory
```
jurisquery/
├── .github/                         # GitHub configuration
│   ├── workflows/                   # CI/CD workflows
│   │   └── ci.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── .husky/                          # Git hooks
│   ├── pre-commit
│   └── commit-msg
├── public/                          # Static assets (copied as-is)
│   ├── favicon.ico
│   ├── logo.svg
│   ├── robots.txt
│   ├── manifest.json
│   └── assets/
│       ├── images/
│       └── fonts/
├── src/                             # Source code
│   └── [see detailed breakdown below]
├── .env.example                     # Environment template
├── .eslintrc.js                     # ESLint config
├── .prettierrc                      # Prettier config
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

### Source Directory (`src/`)
```
src/
├── app/                             # App entry & routing
│   ├── App.tsx                      # Root component
│   ├── Router.tsx                   # Route definitions
│   └── Providers.tsx                # Context providers wrapper
│
├── components/                      # Reusable UI components
│   ├── common/                      # Shared primitives
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.styles.ts     # (if needed)
│   │   │   └── index.ts             # Re-export
│   │   ├── Card/
│   │   ├── Modal/
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Tooltip/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── ProgressBar/
│   │   ├── Skeleton/
│   │   ├── Toast/
│   │   └── index.ts                 # Barrel export
│   │
│   ├── layout/                      # Page structure
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   ├── Footer/
│   │   ├── MainLayout/
│   │   └── AuthLayout/
│   │
│   ├── forms/                       # Form components
│   │   ├── FormField/
│   │   ├── FormError/
│   │   └── FileInput/
│   │
│   └── feedback/                    # User feedback
│       ├── LoadingSpinner/
│       ├── ErrorMessage/
│       ├── EmptyState/
│       └── ConfirmDialog/
│
├── features/                        # Feature modules (domain-driven)
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm/
│   │   │   ├── SignupForm/
│   │   │   └── ProtectedRoute/
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── services/
│   │   │   └── authService.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── RecentDocuments/
│   │   │   ├── SavedQueries/
│   │   │   ├── AnalysisHistory/
│   │   │   ├── QuickActions/
│   │   │   └── StatsCard/
│   │   ├── hooks/
│   │   │   └── useDashboard.ts
│   │   └── index.ts
│   │
│   ├── upload/
│   │   ├── components/
│   │   │   ├── DropZone/
│   │   │   ├── FileList/
│   │   │   ├── ProcessingStatus/
│   │   │   └── UploadProgress/
│   │   ├── hooks/
│   │   │   └── useUpload.ts
│   │   ├── utils/
│   │   │   └── fileValidation.ts
│   │   └── index.ts
│   │
│   ├── viewer/
│   │   ├── components/
│   │   │   ├── PDFViewer/
│   │   │   ├── PageNavigation/
│   │   │   ├── HighlightOverlay/
│   │   │   ├── ZoomControls/
│   │   │   └── SearchInDoc/
│   │   ├── hooks/
│   │   │   ├── usePDFViewer.ts
│   │   │   └── useHighlight.ts
│   │   └── index.ts
│   │
│   ├── chat/
│   │   ├── components/
│   │   │   ├── ChatWindow/
│   │   │   ├── MessageList/
│   │   │   ├── MessageBubble/
│   │   │   ├── CitationLink/
│   │   │   ├── InputBar/
│   │   │   ├── SuggestedQuestions/
│   │   │   └── TypingIndicator/
│   │   ├── hooks/
│   │   │   ├── useChat.ts
│   │   │   └── useCitation.ts
│   │   └── index.ts
│   │
│   └── export/
│       ├── components/
│       │   ├── ExportModal/
│       │   ├── ShareDialog/
│       │   └── ReportPreview/
│       ├── hooks/
│       │   └── useExport.ts
│       └── index.ts
│
├── pages/                           # Route pages
│   ├── DashboardPage/
│   │   ├── DashboardPage.tsx
│   │   └── index.ts
│   ├── UploadPage/
│   ├── AnalysisPage/                # Split-screen (PDF + Chat)
│   ├── HistoryPage/
│   ├── SettingsPage/
│   ├── LoginPage/
│   ├── SignupPage/
│   └── NotFoundPage/
│
├── hooks/                           # Global custom hooks
│   ├── useLocalStorage.ts
│   ├── useDebounce.ts
│   ├── useMediaQuery.ts
│   ├── useOnClickOutside.ts
│   └── useKeyboardShortcut.ts
│
├── services/                        # API layer
│   ├── api/
│   │   ├── client.ts                # Axios/fetch instance
│   │   ├── endpoints.ts             # API endpoint constants
│   │   └── interceptors.ts          # Request/response handling
│   ├── documentService.ts
│   ├── chatService.ts
│   ├── authService.ts
│   └── exportService.ts
│
├── store/                           # State management (Zustand)
│   ├── useAuthStore.ts
│   ├── useDocumentStore.ts
│   ├── useChatStore.ts
│   ├── useUIStore.ts                # Theme, sidebar state, etc.
│   └── index.ts
│
├── lib/                             # External library wrappers
│   ├── reactQuery.ts                # React Query config
│   ├── pdfjs.ts                     # PDF.js setup
│   └── analytics.ts                 # Analytics setup
│
├── contexts/                        # React contexts
│   ├── ThemeContext.tsx
│   └── ToastContext.tsx
│
├── types/                           # Global TypeScript types
│   ├── api.types.ts                 # API response types
│   ├── document.types.ts
│   ├── chat.types.ts
│   ├── user.types.ts
│   └── index.ts
│
├── utils/                           # Utility functions
│   ├── format.ts                    # Date, number formatting
│   ├── validation.ts                # Zod schemas
│   ├── storage.ts                   # LocalStorage helpers
│   ├── cn.ts                        # Tailwind class merger
│   └── constants.ts                 # App-wide constants
│
├── constants/                       # Application constants
│   ├── routes.ts                    # Route paths
│   ├── queryKeys.ts                 # React Query keys
│   ├── fileTypes.ts                 # Supported file types
│   └── messages.ts                  # UI text/labels
│
├── styles/                          # Global styles
│   ├── globals.css                  # Base + Tailwind imports
│   ├── fonts.css                    # Font face definitions
│   └── animations.css               # Custom animations
│
├── config/                          # Configuration
│   ├── env.ts                       # Environment variables
│   └── settings.ts                  # App settings
│
├── __tests__/                       # Global tests
│   ├── setup.ts                     # Test setup
│   └── mocks/
│       ├── handlers.ts              # MSW handlers
│       └── server.ts
│
└── index.tsx                        # Entry point
```

### Component File Structure
```
ComponentName/
├── ComponentName.tsx                # Main component
├── ComponentName.test.tsx           # Unit tests
├── ComponentName.stories.tsx        # Storybook (optional)
├── useComponentName.ts              # Component-specific hook (if needed)
├── ComponentName.types.ts           # Types (if complex)
└── index.ts                         # Re-export
```

### Key File Contents

| File | Purpose |
|------|---------|
| `src/app/Providers.tsx` | Wraps app with QueryClientProvider, ThemeProvider, ToastProvider |
| `src/services/api/client.ts` | Configured Axios instance with base URL, interceptors |
| `src/store/useAuthStore.ts` | Zustand store for auth state (user, token, isAuthenticated) |
| `src/lib/reactQuery.ts` | QueryClient with default options (staleTime, retry) |
| `src/utils/cn.ts` | `clsx` + `tailwind-merge` for conditional classes |
| `src/constants/routes.ts` | Centralized route paths: `ROUTES.DASHBOARD`, `ROUTES.UPLOAD` |

### Folder Organization Principles

| Principle | Application |
|-----------|-------------|
| **Feature-first** | Each feature (upload, chat, viewer) is self-contained with its own components, hooks, and types |
| **Co-location** | Keep component + tests + types together in the same folder |
| **Barrel exports** | Use `index.ts` files for clean imports: `import { Button } from '@/components/common'` |
| **Absolute imports** | Configure `@/` alias for `src/` in tsconfig |
| **Separation of concerns** | Pages only compose features; features handle logic |
| **Single responsibility** | Each file has one purpose |

### Import Path Aliases (tsconfig.json)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/features/*": ["src/features/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/services/*": ["src/services/*"],
      "@/store/*": ["src/store/*"],
      "@/types/*": ["src/types/*"],
      "@/utils/*": ["src/utils/*"]
    }
  }
}
```

---

## ⚡ Performance Guidelines

### Core Performance Rules
| Rule | Implementation |
|------|----------------|
| **Bundle Size** | Keep under 200KB initial JS; code-split routes |
| **Images** | Use WebP format; compress; lazy load below fold |
| **Fonts** | Use `font-display: swap`; subset fonts; preload critical |
| **CSS** | Purge unused TailwindCSS; avoid render-blocking CSS |
| **Caching** | Leverage browser caching; use immutable assets |

### React-Specific Performance
| Technique | When to Use |
|-----------|-------------|
| `React.memo()` | Prevent unnecessary re-renders for expensive components |
| `useMemo()` | Expensive calculations that shouldn't run every render |
| `useCallback()` | Callbacks passed to child components as props |
| `React.lazy()` | Code-split routes and heavy components |
| `Suspense` | Show fallback while lazy components load |

### Loading States
| State | UI Pattern |
|-------|------------|
| **Initial Load** | Skeleton screens (not spinners) |
| **Data Fetching** | Inline loading indicators |
| **Button Actions** | Disable + spinner inside button |
| **Long Operations** | Progress bar with percentage |

---

## 🧪 Testing Guidelines

### Testing Pyramid
| Level | Coverage | Tools |
|-------|----------|-------|
| **Unit Tests** | 70% | Jest |
| **Integration Tests** | 20% | React Testing Library |
| **E2E Tests** | 10% | Playwright / Cypress |

### What to Test
| Component Type | Test Focus |
|----------------|------------|
| **UI Components** | Renders correctly; handles props; visual states |
| **Forms** | Validation; submission; error states |
| **Hooks** | Return values; side effects; edge cases |
| **Utils** | Input/output; edge cases; error handling |

### Testing Patterns
```typescript
// Component test example
describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button label="Click" onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Rules
- Test behavior, not implementation
- Use `data-testid` for test selectors (not CSS classes)
- Mock API calls; never hit real endpoints
- Test error states and loading states

---

## 🔒 Frontend Security Rules

### Data Handling
| Rule | Implementation |
|------|----------------|
| **No secrets in frontend** | Use environment variables; never commit API keys |
| **Sanitize user input** | Validate with Zod; escape HTML |
| **XSS Prevention** | React auto-escapes; avoid `dangerouslySetInnerHTML` |
| **HTTPS only** | All API calls over HTTPS |

### File Upload Security (JurisQuery)
| Rule | Implementation |
|------|----------------|
| **File type validation** | Check MIME type client-side AND server-side |
| **File size limits** | Max 10MB per file; show errors gracefully |
| **Filename sanitization** | Strip special characters; use UUIDs |

### Authentication
| Rule | Implementation |
|------|----------------|
| **Token storage** | httpOnly cookies preferred; avoid localStorage for tokens |
| **Token refresh** | Implement silent refresh before expiry |
| **Logout** | Clear all stored data; invalidate tokens |

---

## ♿ Accessibility (WCAG 2.1 AA)

### Core Requirements
| Requirement | Implementation |
|-------------|----------------|
| **Keyboard Navigation** | All interactive elements focusable; logical tab order |
| **Screen Readers** | Semantic HTML; ARIA labels; alt text |
| **Color Contrast** | 4.5:1 for normal text; 3:1 for large text |
| **Focus Indicators** | Visible focus rings; never `outline: none` |

### ARIA Patterns
| Component | ARIA Requirement |
|-----------|-----------------|
| **Modal** | `role="dialog"`, `aria-modal="true"`, focus trap |
| **Tabs** | `role="tablist"`, `role="tab"`, `aria-selected` |
| **Buttons** | `aria-label` if icon-only; `aria-pressed` for toggles |
| **Loading** | `aria-busy="true"`, `aria-live="polite"` |

### JurisQuery-Specific Accessibility
| Feature | Requirement |
|---------|-------------|
| **PDF Viewer** | Keyboard navigation; zoom controls; screen reader text |
| **Chat Interface** | `aria-live` for new messages; keyboard submit |
| **Citations** | Focusable links; clear link text |

---

## 🌿 Git Workflow & Conventions

### Branch Naming
| Type | Pattern | Example |
|------|---------|---------|
| **Feature** | `feature/short-description` | `feature/pdf-viewer` |
| **Bug Fix** | `fix/issue-description` | `fix/upload-progress` |
| **Hotfix** | `hotfix/critical-issue` | `hotfix/auth-token` |
| **Refactor** | `refactor/area` | `refactor/chat-components` |

### Commit Messages (Conventional Commits)
```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting (no code change) |
| `refactor` | Code restructuring |
| `test` | Adding tests |
| `chore` | Build/tooling |

### Examples
```
feat(chat): add citation highlighting
fix(upload): handle large PDF files
refactor(components): extract shared Button styles
```

### PR Guidelines
- Keep PRs small (< 400 lines when possible)
- Include screenshots for UI changes
- Write clear description of changes
- Link related issues

---

## ⚠️ Error Handling

### Error Boundaries
```typescript
// Wrap feature sections in error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <ChatInterface />
</ErrorBoundary>
```

### Error Types
| Type | Handling |
|------|----------|
| **API Errors** | Show user-friendly message; log details; offer retry |
| **Validation Errors** | Inline field errors; focus first error |
| **Network Errors** | Offline indicator; queue actions; auto-retry |
| **Unexpected Errors** | Error boundary; log to service; show fallback UI |

### User-Facing Error Messages
| ❌ Bad | ✅ Good |
|--------|---------|
| "Error 500" | "Something went wrong. Please try again." |
| "null is not an object" | "Unable to load document. Please refresh." |
| "Network Error" | "You appear to be offline. Check your connection." |

### Toast Notifications
| Type | Duration | Dismissable |
|------|----------|-------------|
| **Success** | 3 seconds | Yes |
| **Warning** | 5 seconds | Yes |
| **Error** | Persistent | Yes (manual) |
| **Info** | 4 seconds | Yes |

---

## 📱 Responsive Design

### Breakpoints (TailwindCSS)
| Name | Size | Usage |
|------|------|-------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Mobile-First Approach
```css
/* Base styles for mobile */
.container { padding: 1rem; }

/* Tablet and up */
@media (min-width: 768px) {
  .container { padding: 2rem; }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container { padding: 3rem; }
}
```

### Touch Targets
| Element | Minimum Size |
|---------|-------------|
| **Buttons** | 44x44px |
| **Links** | 44px height |
| **Form inputs** | 48px height |
| **Icon buttons** | 48x48px |

### JurisQuery Responsive Layout
| Screen | Layout |
|--------|--------|
| **Mobile** | Single column; stacked panels; collapsible sidebar |
| **Tablet** | Two panels (PDF or Chat visible, not both) |
| **Desktop** | Split-screen (PDF left, Chat right) |

---

## ✅ Pre-Development Checklist

### Planning
- [ ] Requirements fully understood
- [ ] User stories defined
- [ ] Design mockups reviewed

### Design System
- [ ] Color palette defined
- [ ] Typography selected
- [ ] Component list outlined
- [ ] Spacing/grid system decided

### Technical Setup
- [ ] Folder structure established
- [ ] Coding conventions agreed upon
- [ ] Linting/formatting configured (ESLint + Prettier)
- [ ] Git workflow defined
- [ ] CI/CD pipeline planned

### Accessibility & Performance
- [ ] WCAG requirements noted
- [ ] Performance budgets set
- [ ] Testing strategy defined

---

## 🚫 Practices to Eliminate

### Code Anti-Patterns to Avoid

| ❌ Don't Do This | ✅ Do This Instead |
|------------------|-------------------|
| Use `any` type in TypeScript | Use proper types or `unknown` |
| Ignore TypeScript errors with `@ts-ignore` | Fix the underlying type issue |
| Use `var` for variable declarations | Use `const` (preferred) or `let` |
| Mutate state directly | Use immutable updates |
| Copy-paste code | Create reusable functions/components |
| Leave `console.log` in production | Remove or use proper logging |
| Commit commented-out code | Delete unused code (Git has history) |
| Use magic numbers/strings | Define named constants |
| Create god components (500+ lines) | Split into smaller, focused components |
| Mix concerns in one file | Separate data, logic, and presentation |

### Design Anti-Patterns to Avoid

| ❌ Don't Do This | ✅ Do This Instead |
|------------------|-------------------|
| Use placeholder images | Use real or generated images |
| Use default browser fonts | Apply custom typography |
| Use generic colors (plain red/blue) | Use curated color palettes |
| Create inconsistent spacing | Follow 8px grid system |
| Design desktop-first | Design mobile-first |
| Ignore dark mode | Support both light and dark themes |
| Use low contrast text | Ensure WCAG AA contrast (4.5:1) |
| Add unnecessary animations | Use subtle, purposeful micro-interactions |
| Create cluttered interfaces | Embrace whitespace and hierarchy |

### React Anti-Patterns to Avoid

| ❌ Don't Do This | ✅ Do This Instead |
|------------------|-------------------|
| Use `useEffect` for everything | Use event handlers or derived state |
| Omit dependency array in hooks | Include ALL dependencies |
| Prop drilling through many levels | Use Context or state management |
| Create components in render | Define components outside |
| Use index as key for dynamic lists | Use unique, stable identifiers |
| Fetch data in components directly | Use React Query or a service layer |
| Store derived state | Compute on render or use `useMemo` |
| Use `forceUpdate()` | Fix the state management |
| Ignore React warnings | Address all warnings in console |

### TypeScript Anti-Patterns to Avoid

| ❌ Don't Do This | ✅ Do This Instead |
|------------------|-------------------|
| `as` type assertions everywhere | Use type guards and proper inference |
| Non-null assertions (`!`) liberally | Handle null cases explicitly |
| Optional parameters for required data | Use discriminated unions |
| Loose function types | Define precise parameter and return types |
| Export everything | Export only public API |
| Import with `import *` | Use named imports |

### Performance Anti-Patterns to Avoid

| ❌ Don't Do This | ✅ Do This Instead |
|------------------|-------------------|
| Load everything on initial page | Code-split routes and lazy load |
| Use uncompressed images | Compress and use WebP format |
| Fetch on every keystroke | Debounce search inputs |
| Re-render entire app on state change | Use proper component boundaries |
| Bundle enormous dependencies | Find lighter alternatives |
| Block rendering with sync operations | Use async/await and loading states |
| Ignore bundle size | Set performance budgets; analyze with tools |

### Team/Workflow Anti-Patterns to Avoid

| ❌ Don't Do This | ✅ Do This Instead |
|------------------|-------------------|
| Commit directly to main | Use feature branches and PRs |
| Write vague commit messages | Follow Conventional Commits |
| Create massive PRs (1000+ lines) | Keep PRs small and focused |
| Skip code reviews | Review all code before merging |
| Merge without tests | Ensure tests pass before merge |
| Hard-code environment values | Use environment variables |
| Store secrets in code | Use secret management (`.env.local`) |
| Ignore linting errors | Fix or configure exceptions explicitly |

### Accessibility Anti-Patterns to Avoid

| ❌ Don't Do This | ✅ Do This Instead |
|------------------|-------------------|
| Use `div` for everything | Use semantic HTML (`button`, `nav`, etc.) |
| `outline: none` on focus | Style focus states visibly |
| Color-only indicators | Use icons, text, or patterns too |
| Missing alt text on images | Describe the image content |
| Auto-playing media | Require user interaction |
| Mouse-only interactions | Support keyboard navigation |
| Tiny click targets | Minimum 44x44px touch targets |

### Error Handling Anti-Patterns to Avoid

| ❌ Don't Do This | ✅ Do This Instead |
|------------------|-------------------|
| Silent error swallowing | Log errors; notify monitoring |
| Showing raw error messages | Display user-friendly messages |
| Empty catch blocks | Handle or rethrow appropriately |
| No error boundaries | Wrap features in error boundaries |
| Crashes on network failures | Show offline state; offer retry |

---

> **Remember:** The user should be impressed at first glance. Aesthetics are critical – a basic or simple-looking website is unacceptable!
