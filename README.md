# Sekani — Soma na Sekani

> **"Your AI study partner, powered by your notes."**
> A full-stack AI study assistant built by the **Soma na Sekani** team — building smart academic AI companions for Kenyan university students.

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
9. [Teach Me Mode](#teach-me-mode)
10. [Voice Input (Transcription)](#voice-input-transcription)
11. [Document Generation](#document-generation)
12. [File Attachments & Embedding](#file-attachments--embedding)
13. [Student-Led Knowledge Base Training](#student-led-knowledge-base-training)
14. [Payment System (Paystack)](#payment-system-paystack)
15. [Personalization Engine](#personalization-engine)
16. [Artifact Viewer](#artifact-viewer)
17. [Admin Dashboard](#admin-dashboard)
18. [Edge Functions](#edge-functions)
19. [Email System](#email-system)
20. [Caching (Redis)](#caching-redis)
21. [Security & RLS Policies](#security--rls-policies)
22. [PWA Support](#pwa-support)
23. [Environment Variables & Secrets](#environment-variables--secrets)
24. [Deployment](#deployment)
25. [File Structure](#file-structure)

---

## System Overview

Sekani is a purpose-built AI study assistant serving Kenyan university students. It is **not** officially affiliated with any university — instead, students contribute their own notes and the AI learns from them. Key capabilities:

- **AI-powered chat** with curriculum-aware responses (configurable models via admin dashboard)
- **RAG knowledge base** using pgvector embeddings from student-uploaded course materials
- **Teach Me Mode** — structured topic-by-topic learning with progress tracking, checkpoints, and focus mode
- **Voice input** via OpenAI `gpt-4o-mini-transcribe` — tap mic, speak, stop, review transcript, then send
- **Document generation** (PDF, DOCX, PPTX, XLSX) directly in chat
- **Multi-file attachments** with automatic knowledge base embedding (images via vision, documents via text extraction)
- **Unit-specific chat isolation** — separate conversations per enrolled course unit
- **Student-led training** — students upload notes to train the AI for their units, earning bonus tokens
- **Freemium monetization** via Paystack (M-Pesa + Card):
  - Individual plan: **KES 129/month** (unlimited tokens)
  - Group plan (5 users): **KES 499/month** (unlimited tokens)
  - Free tier: **50,000 tokens/day**
- **Admin dashboard** for user management, course/unit configuration, document uploads, AI model configuration, global credit adjustment, broadcast messaging, and analytics
- **Personalization** — themes, fonts, chat backgrounds, AI nicknames
- **Code artifact viewer** with live HTML/JS preview
- **PWA** installable on mobile devices
- **Academic calendar** for tracking university events
- **Exam prep & past paper analysis** — AI scans past papers to identify most-tested topics
- **Student memory** — persistent memory of topics the student has studied

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│                                                          │
│  Index (Landing) → LoginPage → ChatPage → AdminPage      │
│  PersonalizationPage │ ArtifactsPage │ ResetPasswordPage  │
│  TermsPage                                                │
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
│  │  + pgvector   │  │  + Email     │  │  (materials)  │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                          │
│  Edge Functions:                                         │
│  • chat                — AI chat with streaming + RAG    │
│  • transcribe          — Voice → text (gpt-4o-mini)      │
│  • embed-document      — Chat attachment embedding       │
│  • process-document    — Document extraction + embedding  │
│  • paystack-initialize — Payment initialization          │
│  • paystack-webhook    — Payment confirmation            │
│  • paystack-callback   — Card payment redirect           │
│  • send-broadcast      — Email broadcast to all users    │
│  • process-email-queue — Email queue processor           │
│  • auth-email-hook     — Custom auth email templates     │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                           │
│  • OpenAI API (Chat, Embeddings, Transcription)          │
│  • Paystack API (M-Pesa + Card payments)                 │
│  • Upstash Redis (Settings cache, rate limiting)         │
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
| **AI** | OpenAI (configurable models via admin), text-embedding-3-large (768d) |
| **Transcription** | OpenAI gpt-4o-mini-transcribe |
| **Payments** | Paystack (M-Pesa mobile money + Card) |
| **Caching** | Upstash Redis (settings cache, rate limiting) |
| **Document Gen** | jsPDF, docx, pptxgenjs, xlsx, file-saver |
| **Markdown** | react-markdown, remark-math, rehype-katex (LaTeX) |
| **PWA** | vite-plugin-pwa |

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data (name, email, admission number, program, course, course_name, year, semester, avatar_url) |
| `user_roles` | Role assignments using `app_role` enum: `admin`, `student`, `lecturer` |
| `courses` | Academic courses (code, name, faculty, description, is_active) |
| `units` | Course units (code, name, course_id, semester, year, lecturer, openai_vector_store_id, is_active) |
| `student_units` | Many-to-many enrollment: which students are in which units |
| `chats` | Chat sessions with `chat_type` (`general` / `unit`) and optional `unit_id` |
| `chat_messages` | Individual messages (role: `user` / `assistant`, content, timestamps) |
| `materials` | Uploaded documents metadata (title, file_name, file_type, file_size, storage_path, unit_id, uploaded_by, embedding_status, chunk_count) |
| `document_embeddings` | Vector embeddings for RAG (content, embedding as `vector(768)`, metadata JSONB, material_id) |
| `document_hashes` | Content hashes for deduplication of uploaded documents |
| `token_usage` | Token consumption tracking per user (tokens_used, model, created_at) |
| `payments` | Payment records (amount, status, plan_type, email, group_emails, paystack_reference, currency: KES) |
| `academic_calendar` | Events (event_name, start_date, end_date, category, trimester, is_student_created, created_by) |
| `system_settings` | Key-value configuration store (token limits, model names, feature toggles) |
| `teach_me_sessions` | Teach Me Mode progress (topic_outline, current_topic_index, completed_topics, checkpoint_scores, eli5_triggers, focus_mode, status) |
| `student_memory` | Persistent memory of topics studied (memory_type, subject, content, strength_level, last_seen_at) |
| `email_send_log` | Email delivery tracking |
| `email_send_state` | Email queue processing state |
| `email_unsubscribe_tokens` | Unsubscribe token management |
| `suppressed_emails` | Suppressed email addresses |

### Key Database Functions

| Function | Purpose |
|----------|---------|
| `has_role(_user_id, _role)` | Security definer function to check user roles without RLS recursion |
| `get_daily_token_usage(_user_id)` | Returns total tokens used today by a user |
| `match_documents(query_embedding, threshold, count)` | pgvector cosine similarity search for RAG |
| `match_documents_for_units(query_embedding, allowed_unit_ids, threshold, count)` | Unit-scoped pgvector search |
| `handle_new_user()` | Trigger on `auth.users` — creates profile + assigns `student` role |
| `handle_first_admin()` | Trigger — first user auto-provisioned as admin if none exists |
| `update_updated_at_column()` | Generic timestamp update trigger |
| `enqueue_email(queue_name, payload)` | PGMQ email queue helper |
| `read_email_batch(queue_name, batch_size, vt)` | PGMQ batch reader |
| `delete_email(queue_name, message_id)` | PGMQ message deletion |
| `move_to_dlq(source_queue, dlq_name, message_id, payload)` | Move failed emails to dead letter queue |

---

## Authentication & Authorization

### Flow

1. **Signup** (3-step form):
   - Step 1: Name, admission number, email, password
   - Step 2: Select course, year, semester from database
   - Step 3: Select units for enrollment → **Email verification** sent

2. **Login**: Email + password → JWT token → auto-redirect (admin → `/admin`, student → `/chat`)

3. **Password Reset**: Email link → `/reset-password` page

4. **Pending Unit Enrollment**: Units selected during signup are stored in `localStorage` as `pendingUnitEnrollments` and enrolled on first login via `enrollPendingUnits()`

### Roles

| Role | Access |
|------|--------|
| `student` | Chat, personalization, artifacts, own profile, unit training uploads |
| `admin` | Full admin dashboard, all student data, document uploads, role management, global credit adjustment, broadcast, AI configuration |
| `lecturer` | Same as student (expandable) |

### Auto-provisioning

- First user to sign up gets `admin` role automatically (via `handle_first_admin()` trigger)
- Subsequent users get `student` role by default (via `handle_new_user()` trigger)

### Security

- RLS policies on all tables enforce `auth.uid() = user_id`
- `has_role()` SECURITY DEFINER function prevents RLS recursion
- Admin checks use `has_role(_user_id, 'admin')` in edge functions
- JWT tokens passed via `Authorization: Bearer <token>` header

---

## Frontend Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Index` | Marketing landing page (features, pricing, testimonials, university section) |
| `/login` | `LoginPage` | Login / 3-step signup |
| `/chat` | `ChatPage` | Main AI chat interface (primary page) |
| `/admin` | `AdminPage` | Admin dashboard |
| `/artifacts` | `ArtifactsPage` | Code artifact gallery |
| `/personalization` | `PersonalizationPage` | Theme, font, chat background, nickname settings |
| `/reset-password` | `ResetPasswordPage` | Password reset form |
| `/terms` | `TermsPage` | Terms of service |
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

**Backend** (`supabase/functions/chat/index.ts`):
1. Authenticates user via JWT
2. Loads system settings from Redis cache (5 min TTL) or database
3. Checks token limits:
   - Free: **50,000 tokens/day** (configurable via `system_settings`)
   - Paid: **Unlimited** (Individual or Group plan)
   - Global: **5,000,000 tokens/day** (configurable)
   - Admins bypass all limits
4. Rate limiting via Redis (configurable requests/minute)
5. Fetches user profile, enrolled units, academic calendar
6. Runs **RAG pipeline** (see next section)
7. Constructs system prompt with:
   - Sekani persona (identity, personality, modes of operation)
   - Institutional knowledge (platform info)
   - Student context (name, program, course, year)
   - Enrolled units list
   - Unit-specific context (if unit chat)
   - Academic calendar events (upcoming 15)
   - RAG results from course materials
8. Calls OpenAI API with streaming (model configurable per chat type: general, unit, vision)
9. Tracks estimated token usage in `token_usage` table

### Chat Modes

| Mode | Description |
|------|-------------|
| **General** | Open-ended — answers any topic (general knowledge + RAG when relevant) |
| **Unit-specific** | Isolated to a course unit — RAG filtered by unit, focused system prompt |

### Sekani's Modes of Operation (Auto-detected)

| Mode | Trigger | Behavior |
|------|---------|----------|
| 📚 Study Mode | "Teach me this unit", "Start from beginning" | Build topic roadmap from notes, teach one topic at a time |
| 📝 Exam Prep | "Help me revise", "Test me", "Most tested topics" | Exam questions, past paper analysis, cheat sheets |
| ❓ Q&A Mode | Direct questions | Answer from notes (unit) or general knowledge |
| 🧠 Quiz Mode | "Quiz me" | One question at a time, evaluate answers |
| 🌐 General Knowledge | Non-academic questions | Answer like a smart search engine |

### Features

- **Streaming responses** with typing indicator
- **Voice input** via OpenAI transcription (see Voice Input section)
- **Message editing** and **retry** (regenerate)
- **Copy to clipboard**, **thumbs up/down** feedback
- **Chat renaming** and **deletion** (individual + delete all)
- **Date-grouped chat history** (Today, Yesterday, Previous 7/30 Days, Older)
- **Swipe gestures** for mobile sidebar
- **LaTeX math rendering** via KaTeX
- **Code highlighting** with "Open as Artifact" action
- **Document download links** within responses
- **Active broadcast banner** from admin

---

## RAG (Retrieval-Augmented Generation)

### Pipeline

1. **Embedding**: Documents chunked (1000 chars, 200 overlap) → embedded via `text-embedding-3-large` (768 dimensions)
2. **Storage**: Vectors stored in `document_embeddings` table with pgvector
3. **Query**: User message → embedded → `match_documents_for_units()` RPC (cosine similarity, threshold 0.5)
4. **Keyword re-ranking**: Results are re-ranked by keyword overlap with the user's query (keywords extracted, stop words removed)
5. **Deduplication**: Duplicate chunks (same title + content prefix) are filtered out
6. **Filtering**:
   - Unit chat: Only documents matching `unit_id`
   - General chat (student): Only documents matching enrolled unit IDs
   - Admin: No filtering (access all)
7. **Context injection**: Top N chunks injected into system prompt (configurable via `max_rag_chunks` setting, default 8)

### Embedding Sources

| Source | Trigger | Edge Function |
|--------|---------|---------------|
| Admin document upload | Admin uploads in dashboard | `process-document` |
| Student unit training | Student uploads notes for their unit | `process-document` |
| Chat file attachment | Student attaches file in chat | `embed-document` |

---

## Teach Me Mode

**Files**: `src/hooks/useTeachMeSession.ts`, `src/components/TeachMePanel.tsx`, `src/lib/teachMePrompt.ts`, `src/types/teachMe.ts`

A structured, topic-by-topic learning mode that persists across page reloads.

### How It Works

1. Student activates "Teach Me" for a unit
2. AI analyzes uploaded notes and generates a topic outline (via control tags in responses)
3. Topics displayed in a sidebar panel with progress tracking
4. AI teaches one topic at a time with:
   - Clear explanations
   - Key definitions
   - Examples from notes
   - Why it matters for exams
5. After each topic, a checkpoint quiz tests understanding
6. Progress saved to `teach_me_sessions` table in the database

### Features

| Feature | Description |
|---------|-------------|
| **Topic Outline** | Auto-generated from notes, displayed as a progress sidebar |
| **Checkpoint Quizzes** | After every few topics, AI tests understanding (scored) |
| **ELI5 Mode** | "Explain like I'm 5" — simplify any topic |
| **Focus Mode** | Hides sidebar distractions during study |
| **Persistence** | Session survives page reload (restored from database) |
| **Progress Tracking** | Topics marked as active/done/locked with visual indicators |

### Control Tags

The AI uses special control tags in responses that the frontend parses:

| Tag | Purpose |
|-----|---------|
| `[TOPIC_OUTLINE]...[/TOPIC_OUTLINE]` | Define the topic roadmap |
| `[TOPIC_DONE:N]` | Mark topic N as completed |
| `[ELI5_TRIGGERED:N]` | Record ELI5 was used for topic N |
| `[CHECKPOINT]...[/CHECKPOINT]` | Checkpoint quiz result |
| `[UNIT_COMPLETE]` | All topics finished |

---

## Voice Input (Transcription)

**Edge Function**: `supabase/functions/transcribe/index.ts`

Voice input uses OpenAI's `gpt-4o-mini-transcribe` model for high-quality transcription.

### Flow

1. User taps the **microphone button** → browser `MediaRecorder` starts recording (WebM/Opus)
2. User speaks freely — recording continues until manually stopped (no auto-stop on pause)
3. User taps **Stop** → recording ends
4. Audio blob sent to `transcribe` edge function via `FormData`
5. Edge function forwards to OpenAI `/v1/audio/transcriptions`
6. Transcript returned and shown in a **preview card**
7. User can **confirm** (✓) to paste into input, or **discard** (✗)

### UI States

| State | Display |
|-------|---------|
| Idle | Mic button |
| Recording | Animated audio visualizer bars + "Speak freely — tap Stop when done" |
| Transcribing | Spinner + "Transcribing..." |
| Preview | Transcript card with confirm/discard buttons |

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

### Attachment Flow (`ChatContext.tsx` + `ChatPage.tsx`)

Three separate file inputs for distinct handling:
- **Camera**: Direct camera capture (`cameraInputRef`)
- **Photo library**: Multi-image selection (`photoInputRef`)
- **Documents**: File picker for PDFs, DOCX, etc. (`docInputRef`)

### Processing by File Type

| File Type | Processing | AI Handling |
|-----------|-----------|-------------|
| **Images** (JPG, PNG, etc.) | Converted to base64 | Sent as `image_url` parts to vision model |
| **Text** (TXT, CSV, MD) | Read via `file.text()` | Content injected into message |
| **Word** (DOCX) | Extracted via `mammoth` library | Content injected + optionally embedded |
| **Excel** (XLSX, XLS) | Parsed via `xlsx` library | Sheet data as CSV injected |
| **PDF** | Base64 encoded | Sent to AI with note about limited browser extraction |

### Background Embedding

When a text-based attachment has ≥20 characters of extractable text, it is automatically embedded into the knowledge base via the `embed-document` edge function, tagged with the current `unit_id` for context-aware RAG retrieval.

---

## Student-Led Knowledge Base Training

A core architectural principle: **students train the AI** by uploading their own notes.

### Flow

1. Student selects a unit from their enrolled units
2. Uploads one or more files (PDF, DOCX, PPTX, TXT, etc.)
3. Files stored in `materials` Storage bucket under `uploads/{user_id}/{timestamp}_{filename}`
4. Metadata saved to `materials` table with `embedding_status: "processing"`
5. `process-document` edge function called:
   - Downloads file from Storage
   - Extracts text (PDF via pdfjs-serverless with fallback, DOCX via mammoth, PPTX via JSZip XML, DOC via binary extraction, TXT/CSV/MD direct)
   - Validates text quality (minimum 120 chars, word count, letter ratio)
   - Chunks text (1000 chars, 200 overlap)
   - Generates embeddings via OpenAI `text-embedding-3-large` (768d)
   - Inserts into `document_embeddings` with metadata (title, unit_code, unit_id, uploaded_by)
6. Updates `materials.embedding_status` to `"completed"` with chunk count

### Training Reward

The **first user** to successfully train (upload and embed) a document for a specific unit receives **10,000 bonus tokens** as a reward for contributing to the shared knowledge base.

### RLS for Student Uploads

RLS policies allow authenticated students to:
- Insert their own materials (`auth.uid() = uploaded_by`)
- Update their own materials
- Delete their own materials

---

## Payment System (Paystack)

### Pricing

| Plan | Price | Token Limit | Users |
|------|-------|-------------|-------|
| **Free** | KES 0 | 50,000 tokens/day | 1 |
| **Individual** | KES 129/month | Unlimited | 1 |
| **Group** | KES 499/month | Unlimited | 5 |

Group plans require email validation for all 5 members, with the payer automatically assigned as member one.

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

**File**: `src/contexts/ArtifactContext.tsx`, `src/components/ArtifactViewer.tsx`

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

**File**: `src/pages/AdminPage.tsx`

### Navigation Sections

| Section | Features |
|---------|----------|
| **Overview** | Stats cards (Total Users, Paid Users, Revenue KES, Tokens Today), Quick Stats, Recent Users |
| **Users** | Searchable user table, role management (student/admin/lecturer), per-user token adjustment (add/deduct), detailed user view (chats, materials, payments, token usage) |
| **Courses & Units** | CRUD for courses and units, bulk unit import (CODE - Name format per line) |
| **Documents** | File upload to Storage → automatic text extraction + embedding, delete documents |
| **Payments** | Revenue analytics (total, monthly, daily chart), filterable transaction table, CSV export |
| **AI Config** | Token limits (free, paid, global), model configuration (general, unit, vision), RAG chunk count, rate limiting, **global credit adjustment** (add/deduct tokens for all users at once), feature toggles (image gen, moderation, TTS, Whisper) |
| **Broadcast** | Emergency email broadcast (downtime, back online, custom) to all registered users, clear active broadcast |
| **Analytics** | User counts, role distribution, token usage, system stats (courses, units, materials, chats) |
| **Settings** | System information display |

### Global Credit Adjustment

Admins can add or deduct tokens for **all users at once** from the AI Config section. This inserts a `token_usage` row for each user in batches of 100.

### Document Upload Flow (Admin)

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
| `chat` | JWT (via header) | AI chat with streaming, RAG, token limits, rate limiting |
| `transcribe` | None | Voice audio → text via OpenAI gpt-4o-mini-transcribe |
| `embed-document` | JWT | Embed chat attachments into knowledge base |
| `process-document` | JWT + ownership/admin check | Extract text from uploaded files + embed |
| `paystack-initialize` | JWT | Initialize M-Pesa or card payment |
| `paystack-webhook` | Paystack signature | Handle payment success webhooks |
| `paystack-callback` | None (redirect) | Verify card payment + redirect to app |
| `send-broadcast` | JWT + admin | Send email broadcast to all users |
| `process-email-queue` | Service role | Process queued emails via PGMQ |
| `auth-email-hook` | Internal | Custom HTML email templates for auth emails |

---

## Email System

The platform has a custom email infrastructure:

### Components

| Component | Purpose |
|-----------|---------|
| `auth-email-hook` | Custom HTML templates for signup confirmation, password reset, magic link, invite, email change, reauthentication |
| `send-broadcast` | Admin broadcast emails to all registered users |
| `process-email-queue` | PGMQ-based email queue processor with retry logic and dead letter queue |

### Email Templates

Located in `supabase/functions/_shared/email-templates/`:
- `signup.tsx` — Welcome / email confirmation
- `recovery.tsx` — Password reset
- `magic-link.tsx` — Magic link login
- `invite.tsx` — User invitation
- `email-change.tsx` — Email change confirmation
- `reauthentication.tsx` — Reauthentication

### Queue Architecture

Uses PostgreSQL Message Queue (PGMQ) with:
- `enqueue_email()` — Add to queue
- `read_email_batch()` — Read batch with visibility timeout
- `delete_email()` — Acknowledge processed
- `move_to_dlq()` — Dead letter queue for failed messages
- Configurable batch size, send delay, and TTL via `email_send_state` table
- `email_send_log` tracks delivery status
- `suppressed_emails` prevents sending to opted-out addresses
- `email_unsubscribe_tokens` manages unsubscribe links

---

## Caching (Redis)

**Provider**: Upstash Redis (REST API)

### Usage

| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `system_settings:all` | 5 minutes | System settings (token limits, models, feature flags) |
| `rate_limit:{user_id}` | 60 seconds | Per-user request rate limiting |

### Implementation

Redis is accessed via Upstash REST API (no client library needed). Falls back gracefully to database if Redis is unavailable.

```typescript
const redis = createRedis(); // REST-based helper
const cached = await redis.get("system_settings:all");
if (!cached) {
  // Fetch from database, cache for 5 min
  await redis.set("system_settings:all", settings, 300);
}
```

---

## Security & RLS Policies

### Row Level Security

All tables have RLS enabled with policies enforcing:
- Users can only read/write their own data (`auth.uid() = user_id`)
- Admin access via `has_role(auth.uid(), 'admin')` security definer function
- Public read access on `courses`, `units` for unauthenticated browsing
- Authenticated read access on `academic_calendar`, `materials`, `document_embeddings`, `system_settings`
- Service role access on email-related tables (`email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`)

### Edge Function Security

- JWT tokens validated via `supabase.auth.getUser()`
- Admin-only functions check role via `has_role` RPC
- Document processing validates material ownership (`uploaded_by === user.id`) or admin status
- Paystack webhook validates HMAC-SHA512 signature
- Service role key used only server-side for admin operations
- Rate limiting enforced per-user via Redis

### Token Limit Enforcement

| Limit | Default | Configurable |
|-------|---------|-------------|
| Free daily | 50,000 | ✅ via `system_settings.token_limit_free` |
| Paid daily | Unlimited | ✅ via `system_settings.token_limit_paid` |
| Global daily (all users) | 5,000,000 | ✅ via `system_settings.daily_global_limit` |
| Admin | Bypasses all limits | — |

---

## PWA Support

- **Config**: `vite.config.ts` with `vite-plugin-pwa`
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
| `OPENAI_API_KEY` | OpenAI API for chat, embeddings, and transcription |
| `Live_Secret_Key` | Paystack secret key for payments |
| `Live_Public_Key` | Paystack public key |
| `LOVABLE_API_KEY` | Lovable AI Gateway access |
| `GEMINI_API_KEY` | Google Gemini (reserved) |
| `UPSTASH_REDIS_REST_URL` | Redis cache endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Redis authentication token |

---

## Deployment

- **Frontend**: Deployed via Lovable Cloud at [https://mvp-cuea.lovable.app](https://mvp-cuea.lovable.app)
- **Backend**: Edge functions auto-deploy on code changes
- **Database**: Managed PostgreSQL via Lovable Cloud
- **Storage**: Supabase Storage buckets:
  - `materials` (private) — course documents and student uploads
  - `email-assets` (public) — email template assets

### To publish updates:

1. Make changes in Lovable editor
2. Click **Publish** → **Update** to deploy frontend
3. Backend changes (edge functions, migrations) deploy automatically

---

## File Structure

```
src/
├── App.tsx                          # Root component, routes, providers
├── App.css                          # Global styles
├── index.css                        # Design system tokens (CSS variables)
├── main.tsx                         # Entry point
├── contexts/
│   ├── AuthContext.tsx               # Authentication + role management + pending enrollment
│   ├── ChatContext.tsx               # Chat state + AI messaging + file processing
│   ├── ArtifactContext.tsx           # Code artifact viewer state
│   └── PersonalizationContext.tsx    # Theme, font, background preferences
├── pages/
│   ├── ChatPage.tsx                  # Main chat UI (voice, teach me, uploads, payments)
│   ├── AdminPage.tsx                 # Admin dashboard (all sections)
│   ├── LoginPage.tsx                 # Auth flow (login + signup)
│   ├── PersonalizationPage.tsx       # Settings page
│   ├── ArtifactsPage.tsx             # Artifact gallery
│   ├── ResetPasswordPage.tsx         # Password reset
│   ├── TermsPage.tsx                 # Terms of service
│   └── NotFound.tsx                  # 404 page
├── hooks/
│   ├── useTeachMeSession.ts          # Teach Me session CRUD + progress
│   ├── usePWAInstall.ts              # PWA install prompt
│   └── use-mobile.tsx                # Mobile viewport detection
├── lib/
│   ├── teachMePrompt.ts             # Teach Me control tag parser
│   └── utils.ts                     # Utility functions (cn, etc.)
├── types/
│   └── teachMe.ts                   # Teach Me TypeScript interfaces
├── utils/
│   ├── documentGenerator.ts          # PDF/DOCX/PPTX/XLSX generation
│   └── greetings.ts                  # Time-based greetings
├── components/
│   ├── AcademicCalendar.tsx          # Calendar widget
│   ├── ArtifactViewer.tsx            # Code preview component
│   ├── ConfirmDialog.tsx             # Reusable confirmation dialog
│   ├── NavLink.tsx                   # Navigation link component
│   ├── PWAInstallBanner.tsx          # PWA install prompt
│   ├── TeachMePanel.tsx              # Teach Me sidebar panel
│   └── ui/                           # shadcn/ui components (40+ components)
└── integrations/supabase/
    ├── client.ts                     # Supabase client (auto-generated)
    └── types.ts                      # Database types (auto-generated)

supabase/
├── config.toml                       # Edge function configuration
└── functions/
    ├── _shared/email-templates/      # Custom email templates (6 templates)
    ├── auth-email-hook/              # Auth email hook (custom templates)
    ├── chat/index.ts                 # AI chat (streaming, RAG, limits, Redis)
    ├── transcribe/index.ts           # Voice transcription (gpt-4o-mini-transcribe)
    ├── embed-document/index.ts       # Chat attachment embedding
    ├── process-document/index.ts     # Document extraction + embedding
    ├── paystack-initialize/index.ts  # Payment initialization
    ├── paystack-webhook/index.ts     # Payment webhook handler
    ├── paystack-callback/index.ts    # Card payment callback
    ├── send-broadcast/index.ts       # Admin email broadcast
    └── process-email-queue/          # Email queue processor
```

---

*Built by the Soma na Sekani team — building smart academic AI companions for students across Kenya.* 🎓
