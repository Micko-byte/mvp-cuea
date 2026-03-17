# CUEA AI — System Documentation

> **"The AI built for your academic journey."**
> A full-stack academic AI assistant for the Catholic University of Eastern Africa (CUEA), built as part of the national **Soma na Sekani** program.

**Live URL**: [https://mvp-cuea.lovable.app](https://mvp-cuea.lovable.app)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [Frontend Pages & Routes](#frontend-pages--routes)
7. [AI Chat System](#ai-chat-system)
8. [RAG (Retrieval-Augmented Generation)](#rag-retrieval-augmented-generation)
9. [Document Generation](#document-generation)
10. [File Attachments & Embedding](#file-attachments--embedding)
11. [Payment System (Paystack)](#payment-system-paystack)
12. [Personalization Engine](#personalization-engine)
13. [Artifact Viewer](#artifact-viewer)
14. [Admin Dashboard](#admin-dashboard)
15. [Edge Functions](#edge-functions)
16. [Security & RLS Policies](#security--rls-policies)
17. [PWA Support](#pwa-support)
18. [Environment Variables & Secrets](#environment-variables--secrets)
19. [Deployment](#deployment)

---

## System Overview

CUEA AI is a purpose-built academic assistant serving students and staff of CUEA. It provides:

- **AI-powered chat** with curriculum-aware responses (OpenAI GPT-4o-mini / GPT-4o for vision)
- **RAG knowledge base** using pgvector embeddings from uploaded course materials
- **Document generation** (PDF, DOCX, PPTX, XLSX) directly in chat
- **Multi-file attachments** with automatic knowledge base embedding
- **Unit-specific chat isolation** — separate conversations per enrolled course unit
- **Freemium monetization** via Paystack (M-Pesa + Card) — KES 200/month
- **Admin dashboard** for user management, course/unit configuration, document uploads, and analytics
- **Personalization** — themes, fonts, chat backgrounds, AI nicknames
- **Code artifact viewer** with live HTML/JS preview
- **PWA** installable on mobile devices
- **Voice input** via Web Speech API

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│                                                          │
│  Index (Landing) → LoginPage → ChatPage → AdminPage      │
│  PersonalizationPage │ ArtifactsPage │ ResetPasswordPage  │
│                                                          │
│  Contexts: AuthContext, ChatContext, ArtifactContext,      │
│            PersonalizationContext                          │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / Supabase SDK
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  SUPABASE (Lovable Cloud)                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  PostgreSQL   │  │  Auth (JWT)  │  │   Storage     │  │
│  │  + pgvector   │  │  + OTP       │  │  (materials)  │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                          │
│  Edge Functions:                                         │
│  • chat            — AI chat with streaming + RAG        │
│  • embed-document  — Chat attachment embedding           │
│  • process-document — Admin document extraction + embed  │
│  • paystack-initialize — Payment initialization          │
│  • paystack-webhook    — Payment confirmation            │
│  • paystack-callback   — Card payment redirect           │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                           │
│  • OpenAI API (GPT-4o-mini, GPT-4o, text-embedding)     │
│  • Paystack API (M-Pesa + Card payments)                 │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite 5 |
| **Styling** | Tailwind CSS 3, shadcn/ui, Framer Motion |
| **State** | React Context (Auth, Chat, Artifact, Personalization), TanStack React Query |
| **Routing** | React Router v6 |
| **Backend** | Supabase (Lovable Cloud) — PostgreSQL, Auth, Storage, Edge Functions (Deno) |
| **AI** | OpenAI GPT-4o-mini (text), GPT-4o (vision), text-embedding-3-large (768d) |
| **Payments** | Paystack (M-Pesa mobile money + Card) |
| **Document Gen** | jsPDF, docx, pptxgenjs, xlsx, file-saver |
| **Markdown** | react-markdown |
| **PWA** | vite-plugin-pwa |

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data (name, email, admission number, program, course, year, semester, avatar) |
| `user_roles` | Role assignments using `app_role` enum: `admin`, `student`, `lecturer` |
| `courses` | Academic courses (code, name, faculty) |
| `units` | Course units (code, name, course_id, semester, year, lecturer) |
| `student_units` | Many-to-many enrollment: which students are in which units |
| `chats` | Chat sessions with `chat_type` (`general` / `unit`) and optional `unit_id` |
| `chat_messages` | Individual messages (role: `user` / `assistant`, content, timestamps) |
| `materials` | Uploaded documents metadata (title, file_name, file_type, storage_path, unit_id) |
| `document_embeddings` | Vector embeddings for RAG (content, embedding as `vector(768)`, metadata JSONB) |
| `token_usage` | Daily token consumption tracking per user |
| `payments` | Payment records (amount, status, paystack_reference, currency: KES) |
| `academic_calendar` | University events (event_name, start_date, end_date, category, trimester) |

### Key Database Functions

| Function | Purpose |
|----------|---------|
| `has_role(_user_id, _role)` | Security definer function to check user roles without RLS recursion |
| `get_daily_token_usage(_user_id)` | Returns total tokens used today by a user |
| `match_documents(query_embedding, threshold, count)` | pgvector cosine similarity search for RAG |
| `handle_new_user()` | Trigger on `auth.users` — creates profile + assigns `student` role |
| `update_updated_at_column()` | Generic timestamp update trigger |

---

## Authentication & Authorization

### Flow

1. **Signup** (3-step form):
   - Step 1: Name, admission number, email (`@cuea.edu` domain enforced), password
   - Step 2: Select course, year, semester from database
   - Step 3: Select units for enrollment → **Email OTP verification** (6-digit code)

2. **Login**: Email + password → JWT token → auto-redirect (admin → `/admin`, student → `/chat`)

3. **Password Reset**: Email link → `/reset-password` page

### Roles

| Role | Access |
|------|--------|
| `student` | Chat, personalization, artifacts, own profile |
| `admin` | Full admin dashboard, all student data, document uploads, role management |
| `lecturer` | Same as student (expandable) |

### Security

- RLS policies on all tables enforce `auth.uid() = user_id`
- `has_role()` SECURITY DEFINER function prevents RLS recursion
- Admin checks use `has_role(_user_id, 'admin')` in edge functions
- JWT tokens passed via `Authorization: Bearer <token>` header

---

## Frontend Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Index` | Marketing landing page (features, testimonials, stats, university section) |
| `/login` | `LoginPage` | Login / 3-step signup / OTP verification |
| `/chat` | `ChatPage` | Main AI chat interface (1,599 lines — primary page) |
| `/admin` | `AdminPage` | Admin dashboard (850 lines) |
| `/artifacts` | `ArtifactsPage` | Code artifact gallery |
| `/personalization` | `PersonalizationPage` | Theme, font, chat background, nickname settings |
| `/reset-password` | `ResetPasswordPage` | Password reset form |
| `*` | `NotFound` | 404 page |

### Context Providers (wrapped in `App.tsx`)

```
QueryClientProvider → AuthProvider → PersonalizationProvider → ChatProvider → ArtifactProvider
```

---

## AI Chat System

### Architecture

**Frontend** (`ChatContext.tsx` + `ChatPage.tsx`):
1. User sends message → persisted to `chat_messages` table
2. Constructs message history with multimodal support (images as base64 `image_url`)
3. Calls `chat` edge function via streaming `fetch`
4. Parses SSE stream → updates UI in real-time
5. Persists assistant response to `chat_messages`

**Backend** (`supabase/functions/chat/index.ts`, 448 lines):
1. Authenticates user via JWT
2. Checks token limits:
   - Free: **50,000 tokens/day**
   - Paid: **200,000 tokens/day**
   - Global: **500,000 tokens/day**
3. Fetches user profile, enrolled units, academic calendar
4. Runs **RAG pipeline** (see next section)
5. Constructs system prompt with:
   - CUEA AI persona (11 core capabilities)
   - Institutional knowledge (ODeL portal, programs, contacts)
   - Student context (name, program, course, year)
   - Enrolled units list
   - Unit-specific context (if unit chat)
   - Academic calendar events (upcoming 15)
   - RAG results from course materials
6. Calls OpenAI API with streaming (`gpt-4o-mini` for text, `gpt-4o` for images)
7. Tracks estimated token usage in `token_usage` table

### Chat Modes

| Mode | Description |
|------|-------------|
| **General** | Open-ended — answers any topic, uses RAG when relevant |
| **Unit-specific** | Isolated to a course unit — RAG filtered by `unit_code`, focused system prompt |

### Features

- **Streaming responses** with typing indicator
- **Voice input** (Web Speech API)
- **Message editing** and **retry**
- **Copy to clipboard**, **thumbs up/down** feedback
- **Chat renaming** and **deletion**
- **Date-grouped chat history** (Today, Yesterday, Previous 7/30 Days, Older)
- **Swipe gestures** for mobile sidebar

---

## RAG (Retrieval-Augmented Generation)

### Pipeline

1. **Embedding**: Documents chunked (1000 chars, 200 overlap) → embedded via `text-embedding-3-large` (768 dimensions)
2. **Storage**: Vectors stored in `document_embeddings` table with pgvector
3. **Query**: User message → embedded → `match_documents()` RPC (cosine similarity, threshold 0.5)
4. **Filtering**:
   - Unit chat: Only documents matching `unit_code`
   - General chat (student): Only documents matching enrolled unit codes
   - Admin: No filtering (access all)
5. **Context injection**: Top 8 (student) or 10 (admin) chunks injected into system prompt

### Embedding Sources

| Source | Trigger | Edge Function |
|--------|---------|---------------|
| Admin document upload | Admin uploads file in dashboard | `process-document` |
| Chat file attachment | Student attaches file in chat | `embed-document` |

---

## Document Generation

**File**: `src/utils/documentGenerator.ts`

Generates documents from AI-created markdown content directly in the browser:

| Format | Library | Function |
|--------|---------|----------|
| PDF | `jsPDF` | `generatePDF(content, title)` |
| DOCX | `docx` + `file-saver` | `generateDOCX(content, title)` |
| PPTX | `pptxgenjs` | `generatePPTX(content, title)` |
| XLSX | `xlsx` + `file-saver` | `generateXLSX(content, title)` |

### How It Works

1. AI generates markdown content with download links: `[📥 Download PDF](download:pdf)`
2. `ChatPage.tsx` intercepts these links in the markdown renderer
3. Extracts the full message content (minus the download links)
4. Passes content to the appropriate generator function
5. Browser downloads the file

### Markdown Parser

The `parseMarkdown()` function converts markdown into structured blocks (h1-h3, paragraph, bullet, code, table) that each generator renders in its native format.

---

## File Attachments & Embedding

### Attachment Flow (`ChatContext.tsx`)

1. User attaches files via camera, photo library, or file picker
2. **Images**: Converted to base64 → sent as `image_url` parts to GPT-4o for vision analysis
3. **Documents** (PDF, DOCX, TXT, CSV, etc.):
   - Text extracted client-side via `file.text()`
   - Embedded into message as `[Attached file: name]\n{content}`
   - **Background embedding**: If text ≥ 20 chars, calls `embed-document` edge function
   - Tagged with `unit_id` for context-aware RAG retrieval
   - Toast notification: `📚 "{filename}" added to knowledge base`

### Admin Document Processing (`process-document`)

More robust server-side extraction supporting:
- **PDF**: Binary text stream extraction (BT/ET markers, Tj/TJ operators)
- **DOCX**: `mammoth` library for Word documents
- **PPTX**: `JSZip` for PowerPoint XML extraction
- **DOC**: Raw binary printable ASCII extraction
- **TXT/CSV/MD**: Direct text decode

---

## Payment System (Paystack)

### Pricing

| Plan | Price | Token Limit |
|------|-------|-------------|
| **Free** | KES 0 | 50,000 tokens/day |
| **Pro** | KES 200/month | 200,000 tokens/day |

### Payment Methods

| Method | Flow |
|--------|------|
| **M-Pesa** | Phone number → Paystack charge → STK push → poll `payments` table for status |
| **Card** | Redirect to Paystack checkout → callback verifies → redirect back to app |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `paystack-initialize` | Creates payment (M-Pesa charge or card redirect URL) |
| `paystack-webhook` | Receives Paystack `charge.success` webhook → updates payment status |
| `paystack-callback` | Handles card payment redirect → verifies with Paystack API → redirects to app |

### Payment Flow

```
User → paystack-initialize → Paystack API
                                │
         ┌──────────────────────┼──────────────────┐
         │ M-Pesa               │ Card              │
         │ STK Push to phone    │ Redirect to       │
         │ Poll payments table  │ Paystack checkout  │
         │                      │                    │
         │ paystack-webhook ◄───┘                    │
         │ updates status       paystack-callback ◄──┘
         │                      verifies + redirects
         └──────────────────────────────────────────┘
```

---

## Personalization Engine

**File**: `src/contexts/PersonalizationContext.tsx`

Stored in `localStorage` under key `cuea-personalization`.

| Feature | Options |
|---------|---------|
| **Font** | System UI, DM Sans, Inter, Poppins, Roboto, Lora, JetBrains Mono |
| **Theme** | Light, Dark, Maroon, Ocean, Forest, Lavender, Amber |
| **Chat Background** | None, Purple Wave, Sunset, Teal, Night Sky, Rose, Geometric |
| **AI Nickname** | Free text — AI greets user by this name |

### Theme Implementation

Custom themes inject CSS custom properties (HSL values) onto `:root` at runtime, overriding the default design system tokens (`--background`, `--foreground`, `--primary`, etc.).

Chat backgrounds include adaptive bubble colors (`userBubble`, `botBubble`, `userText`, `botText`) that change per background for readability.

---

## Artifact Viewer

**File**: `src/contexts/ArtifactContext.tsx`

When the AI generates code blocks, users can open them as "artifacts":

| Type | Behavior |
|------|----------|
| `html` | Live preview in sandboxed iframe |
| `code` | Syntax-highlighted code view |
| `svg` | SVG rendering |
| `markdown` | Rendered markdown |
| `table` | CSV/table display |

Artifacts are stored in-memory (not persisted) with preview/code toggle.

---

## Admin Dashboard

**File**: `src/pages/AdminPage.tsx` (850 lines)

### Sections

| Section | Features |
|---------|----------|
| **Overview** | Stats cards (Total Users, Paid Users, Revenue KES, Tokens Today), Quick Stats, Recent Users |
| **Users** | Searchable user table, role management (change student/admin/lecturer) |
| **Courses & Units** | CRUD for courses and units (code, name, faculty, semester, year, lecturer) |
| **Documents** | File upload to Storage → automatic text extraction + embedding, delete documents |
| **Analytics** | Token usage, chat counts, payment analytics (paid vs free users, total revenue) |
| **Settings** | System configuration (expandable) |

### Document Upload Flow

1. Admin selects unit → uploads file(s)
2. File stored in `materials` Storage bucket under `{unit_id}/{timestamp}_{filename}`
3. Metadata saved to `materials` table
4. `process-document` edge function called:
   - Downloads from Storage
   - Extracts text (PDF, DOCX, PPTX, DOC, TXT)
   - Chunks text (1000 chars, 200 overlap)
   - Generates embeddings via OpenAI
   - Inserts into `document_embeddings` with `material_id` and `unit_code` metadata
5. Toast shows chunk count and text length

---

## Edge Functions

All deployed as Supabase Edge Functions (Deno runtime). Located in `supabase/functions/`.

| Function | Auth | Purpose |
|----------|------|---------|
| `chat` | JWT (via header) | AI chat with streaming, RAG, token limits |
| `embed-document` | JWT | Embed chat attachments into knowledge base |
| `process-document` | JWT + admin check | Extract text from uploaded files + embed |
| `paystack-initialize` | JWT | Initialize M-Pesa or card payment |
| `paystack-webhook` | Paystack signature | Handle payment success webhooks |
| `paystack-callback` | None (redirect) | Verify card payment + redirect to app |

**Note**: All functions have `verify_jwt = false` in `supabase/config.toml` — JWT verification is handled manually in the function code.

---

## Security & RLS Policies

### Row Level Security

All tables have RLS enabled with policies enforcing:
- Users can only read/write their own data (`auth.uid() = user_id`)
- Admin access via `has_role(auth.uid(), 'admin')` security definer function
- Public read access on `courses`, `units`, `academic_calendar` for unauthenticated browsing

### Edge Function Security

- JWT tokens validated via `supabase.auth.getUser()`
- Admin-only functions (e.g., `process-document`) check role via `has_role` RPC
- Paystack webhook validates HMAC-SHA512 signature
- Service role key used only server-side for admin operations

---

## PWA Support

- **File**: `vite.config.ts` with `vite-plugin-pwa`
- **Icons**: `public/pwa-192x192.png`, `public/pwa-512x512.png`
- **Install Banner**: `src/components/PWAInstallBanner.tsx` + `src/hooks/usePWAInstall.ts`
- Enables "Add to Home Screen" on mobile devices

---

## Environment Variables & Secrets

### Frontend (`.env` — auto-managed)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier |

### Backend Secrets (Edge Functions)

| Secret | Purpose |
|--------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin-level database access |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public key for user-scoped access |
| `OPENAI_API_KEY` | OpenAI API for chat + embeddings |
| `Live_Secret_Key` | Paystack secret key for payments |
| `Live_Public_Key` | Paystack public key |
| `LOVABLE_API_KEY` | Lovable AI Gateway access |
| `GEMINI_API_KEY` | Google Gemini (reserved) |

---

## Deployment

- **Frontend**: Deployed via Lovable Cloud at [https://mvp-cuea.lovable.app](https://mvp-cuea.lovable.app)
- **Backend**: Edge functions auto-deploy on code changes
- **Database**: Managed PostgreSQL via Lovable Cloud (Supabase)
- **Storage**: Supabase Storage bucket `materials` (private)

### To publish updates:

1. Make changes in Lovable editor
2. Click **Publish** → **Update** to deploy frontend
3. Backend changes (edge functions, migrations) deploy automatically

---

## File Structure Summary

```
src/
├── App.tsx                          # Root component, routes, providers
├── contexts/
│   ├── AuthContext.tsx               # Authentication + role management
│   ├── ChatContext.tsx               # Chat state + AI messaging
│   ├── ArtifactContext.tsx           # Code artifact viewer state
│   └── PersonalizationContext.tsx    # Theme, font, background preferences
├── pages/
│   ├── Index.tsx                     # Landing page (1,384 lines)
│   ├── LoginPage.tsx                 # Auth flow (498 lines)
│   ├── ChatPage.tsx                  # Main chat UI (1,599 lines)
│   ├── AdminPage.tsx                 # Admin dashboard (850 lines)
│   ├── PersonalizationPage.tsx       # Settings page
│   ├── ArtifactsPage.tsx             # Artifact gallery
│   └── ResetPasswordPage.tsx         # Password reset
├── utils/
│   ├── documentGenerator.ts          # PDF/DOCX/PPTX/XLSX generation
│   └── greetings.ts                  # Time-based greetings
├── components/
│   ├── AcademicCalendar.tsx          # Calendar widget
│   ├── ArtifactViewer.tsx            # Code preview component
│   ├── ConfirmDialog.tsx             # Reusable confirmation dialog
│   ├── PWAInstallBanner.tsx          # PWA install prompt
│   └── ui/                           # shadcn/ui components
└── integrations/supabase/
    ├── client.ts                     # Supabase client (auto-generated)
    └── types.ts                      # Database types (auto-generated)

supabase/
├── config.toml                       # Edge function configuration
└── functions/
    ├── chat/index.ts                 # AI chat edge function (448 lines)
    ├── embed-document/index.ts       # Chat attachment embedding
    ├── process-document/index.ts     # Admin document processing
    ├── paystack-initialize/index.ts  # Payment initialization
    ├── paystack-webhook/index.ts     # Payment webhook handler
    └── paystack-callback/index.ts    # Card payment callback
```

---

*Built by the CUEA Space team as part of the Soma na Sekani program — building smart academic AI companions for students across Kenya.* 🎓
