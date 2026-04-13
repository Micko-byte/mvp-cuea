# Sekani — AI Study Companion

Sekani is an AI-powered study assistant built by the **Soma na Sekani** team for Kenyan university students. It helps students learn from their own uploaded notes, past papers, and course materials using RAG (Retrieval-Augmented Generation) and adaptive teaching.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [System Prompts & AI Behavior](#system-prompts--ai-behavior)
- [Database Schema](#database-schema)
- [Edge Functions](#edge-functions)
- [Changelog (Last 2 Weeks)](#changelog-last-2-weeks)
- [Development](#development)
- [License](#license)

---

## Features

### 💬 AI Chat
- Context-aware conversations grounded in uploaded course materials (RAG with pgvector)
- Unit-specific and general chat modes
- Multi-modal support: text, images, PDFs, Word docs, spreadsheets
- Voice input with transcription (Whisper)
- Document generation (PDF, DOCX, PPTX, XLSX) with download links
- Streaming responses via SSE (Server-Sent Events)
- Hybrid RAG: vector similarity (0.8 weight) + keyword overlap (0.2 weight) with re-ranking
- Smart follow-up suggestions at the end of responses

### 📚 Teach Me Mode
- Systematic topic-by-topic teaching from uploaded notes
- **No-intro behavior**: immediately scans notes, builds outline, and starts teaching Topic 1
- Each lesson follows a strict structure: Hook → Definition from notes → Full breakdown (400–900 words) → Worked example → Exam angle → Recall check
- Checkpoint quizzes every 2 topics (3 questions, one at a time)
- Progress tracking with topic outline sidebar (active/done/locked states)
- ELI5 (Explain Like I'm 5) simplification — proactive confusion detection
- Spaced repetition via student memory system (strength levels 1–5)
- Mid-topic active recall prompts
- Adaptive topic reordering based on checkpoint performance
- Exam readiness scoring (0–100%) and study streaks
- Session recaps with downloadable PDF notes
- Exam-priority topic ordering when past papers are uploaded

### 📝 Exam Mode
- Deep analysis of uploaded past papers
- Topic frequency ranking across multiple papers (High/Medium/Low priority)
- Topic Frequency Table: Topic | Times Tested | Priority | Years Appeared
- Predicted exam questions (5 questions, one at a time, graded /10)
- Model answers from uploaded course notes (not generic)
- Cheat sheet generation (Top 5 topics, key formulas, exam traps, last-minute review)
- Cross-referencing past papers with course notes
- Exam countdown awareness from academic calendar
- Targeted revision plans based on exam proximity (7+ days / 3–6 / 1–2 / exam day)

### 📖 Sources Panel (NotebookLM-style)
- Side-by-side PDF viewer alongside chat on desktop
- Smart sorting: outlines first, modules in numerical order
- Categorized file listing (Course Notes vs Past Papers)
- Direct browser PDF rendering via signed URLs (no third-party proxy)
- Opened source tracking — the AI knows which files you're viewing
- Reference-aware responses citing specific files and sections
- Up to 200 content chunks fetched from opened files for citation context

### 🎓 Student Features
- Course and unit enrollment system
- Material uploads (notes and past papers) with background embedding
- Document embedding for RAG-powered answers (text-embedding-3-large, 768 dimensions)
- Academic calendar with personal events
- Personalization (nickname, AI nickname, chat background, theme)
- PWA installable on mobile
- Student memory system tracking topic strengths and review schedules

### 🔒 Security & Auth
- Email-based authentication with verification
- Google OAuth sign-in
- Role-based access control (admin, student, lecturer) via separate `user_roles` table
- `has_role()` security definer function to prevent RLS recursion
- Row-level security on all database tables
- Rate limiting (configurable per-minute limit, default 20)
- Token usage tracking with daily limits
- Admin users bypass all rate limits and token limits

### 💳 Payments
- Paystack integration (M-Pesa and card)
- Individual and group plans
- Free tier: 50,000 tokens/day (configurable)
- Premium tier: 200,000 tokens/day (configurable)
- Global daily limit: 5,000,000 tokens (configurable)

### 🛠 Admin Dashboard
- User management and role assignment
- Course and unit configuration
- Material management with embedding status
- System settings (model selection, token limits, rate limits)
- Broadcast messaging via email
- Analytics and token usage monitoring
- Configurable AI models: default general, default unit, vision model

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript 5, Vite 5, Tailwind CSS v3 |
| **UI** | shadcn/ui, Framer Motion, Lucide icons |
| **Backend** | Lovable Cloud (Supabase) — Edge Functions (Deno) |
| **AI** | OpenAI GPT models (gpt-4.1, gpt-4.1-nano configurable) |
| **Embeddings** | OpenAI text-embedding-3-large (768 dimensions) with pgvector |
| **Database** | PostgreSQL with pgvector extension |
| **Caching** | Upstash Redis (REST API) — settings 5min, profile 10min, calendar 1hr, tokens 60s, memory 5min |
| **Payments** | Paystack |
| **Email** | Resend with custom React email templates (MJML-compatible) |
| **Voice** | OpenAI Whisper (transcription) |

---

## Architecture

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui primitives
│   ├── TeachMePanel.tsx # Teach Me mode sidebar with topic tracker
│   ├── SourcesPanel.tsx # NotebookLM-style PDF viewer
│   ├── ArtifactViewer   # Code/HTML artifact preview
│   ├── AcademicCalendar # Academic calendar component
│   ├── MermaidBlock      # Mermaid diagram renderer
│   ├── ConfirmDialog     # Reusable confirmation dialog
│   └── PWAInstallBanner  # PWA install prompt
├── contexts/            # React contexts
│   ├── AuthContext       # Authentication state & guards
│   ├── ChatContext       # Chat state, message streaming, file embedding
│   ├── ArtifactContext   # Code artifact management
│   └── PersonalizationContext # Theme, nickname, background
├── hooks/               # Custom hooks
│   ├── useTeachMeSession # Teach Me session persistence & control tag parsing
│   ├── usePWAInstall     # PWA install state
│   └── use-mobile        # Responsive breakpoint detection
├── pages/               # Route pages
│   ├── ChatPage          # Main chat interface with Sources panel
│   ├── LoginPage         # Auth (email + Google OAuth)
│   ├── AdminPage         # Admin dashboard
│   ├── ArtifactsPage     # Saved artifacts
│   ├── PersonalizationPage
│   ├── ResetPasswordPage
│   └── TermsPage
├── utils/               # Utilities
│   ├── documentGenerator # PDF/DOCX/PPTX/XLSX generation
│   └── greetings         # Time-based greeting messages
├── lib/
│   ├── teachMePrompt     # Teach Me system prompt + control tag parser
│   └── utils             # cn() and other helpers
└── types/
    └── teachMe           # TypeScript types for Teach Me sessions

supabase/
├── functions/
│   ├── chat/             # Main AI chat — RAG, streaming, mode detection
│   ├── embed-document/   # Document chunking & embedding pipeline
│   ├── process-document/ # PDF text extraction
│   ├── transcribe/       # Voice transcription (Whisper)
│   ├── paystack-*/       # Payment processing (initialize, callback, webhook)
│   ├── delete-user/      # Account deletion
│   ├── send-broadcast/   # Admin broadcast emails
│   ├── auth-email-hook/  # Custom auth email templates
│   └── process-email-queue/ # Email queue processing
└── config.toml           # Project configuration
```

---

## System Prompts & AI Behavior

### Main System Prompt (`SEKANI_SYSTEM_PROMPT`)

Located in: `supabase/functions/chat/index.ts` (lines 111–279)

The core identity prompt defines Sekani as a warm, sharp AI study companion for Kenyan university students. Key behaviors:

**Identity:**
- Name: Sekani, built by the Soma na Sekani team
- Speaks like a brilliant older student — not a professor, not a robot
- Understands Kenyan academic culture (CATs, end-sems, HELB, trimesters)
- Never claims to be ChatGPT, Claude, or any commercial AI product
- Not affiliated with any university

**Modes of Operation (auto-detected):**

| Mode | Trigger | Behavior |
|------|---------|----------|
| 📚 Study Mode | "teach me", "walk me through" | Topic-by-topic roadmap, control tags, checkpoints |
| 📝 Exam Prep | "help me revise", "I have an exam" | Past paper analysis, frequency ranking, revision plans |
| 🎯 Predicted Questions | "predict exam questions" | 5 questions one at a time, graded /10, total /50 |
| 🧠 Quiz Mode | "quiz me", "test me" | One question at a time, evaluate, keep score |
| ⚡ Cheat Sheet | "cheat sheet", "one-pager" | Top 5 topics + formulas + traps + last 10 min review |
| ❓ Q&A (Default) | Any direct question | RAG-grounded answers, cite sources |
| 🌐 General Knowledge | Non-academic questions | Answer like a smart friend, never refuse |

**Academic Grounding Enforcement:**
- Coursework questions use ONLY uploaded Course Material Context (RAG)
- If notes are insufficient, explicitly says so and asks for relevant notes
- Answers as closely as possible to wording in the notes
- Flags general knowledge: "This isn't in your uploaded notes"

**Communication Style:**
- Short paragraphs, headers, bullet points
- References CATs, end-sems, HELB stress
- Emojis sparingly (📚 🎓 ✅ 💡 🔬 📝 💪)
- Never says "great question!", "certainly!", "as we know..."
- Suggests 1–2 follow-ups at end of responses

**Formatting:**
- LaTeX with `$` delimiters (inline) and `$$` (display)
- `\boxed{}` for final answers
- Fenced code blocks with language tags
- Tables for comparisons
- Bold for key terms

**Banned behaviors:**
- No hallucination on unit-specific content
- No fabricating lecture content
- No sharing notes between students
- No repeatedly nagging about token limits
- No 10-question quiz dumps
- No inflating Exam Readiness Score

---

### Teach Me System Prompt (`TEACH_ME_SYSTEM_PROMPT`)

Located in: `src/lib/teachMePrompt.ts` (lines 1–238)

A comprehensive adaptive tutoring prompt. Key sections:

**The Single Most Important Rule:**
> When a student activates Teach Me Mode, scan the notes, build the outline, and START TEACHING TOPIC 1. No questions. No "do you want to start from the beginning?" Just go.

**First Response Structure:**
1. **Scan Report** (8–12 lines) — topics found, gaps identified, exam priorities
2. **Topic Outline** — JSON in a `topic_outline` code block
3. **Topic 1 Lesson** — Hook → Definition (quoted from notes) → Full breakdown (400+ words) → Worked example → Exam angle → Recall check

**Checkpoint Protocol (every 2 topics):**
- 3 questions, ONE at a time
- Score, identify strong/weak areas
- 2/3 or 3/3 → proceed; 0/3 or 1/3 → re-teach from different angle
- Emits `[CHECKPOINT]score=X/3,strong=A|B,weak=C[/CHECKPOINT]`

**Adaptive Features:**
- **Exam-Priority Ordering**: Past paper frequency determines topic order
- **Topic Strength Awareness**: Checks student memory (strength 1–5, days since last seen)
- **Spaced Repetition**: Reviews weak topics (strength ≤3, >3 days ago) before new content
- **Mid-Topic Active Recall**: One retrieval moment halfway through each topic
- **Confusion Detection**: Watches for vague answers, proactively offers ELI5
- **Adaptive Reordering**: Below 60% → reinforce; perfect answers → skip

**Depth Rules:**
- Minimum 400 words per topic (complex: 600–900)
- Always reference notes: "Your notes say...", "According to your uploaded material..."
- Never use "basically", never give bullet summaries as teaching
- Fully use case studies, formulas, and lists from notes

**Control Tags (emitted silently):**
```
[TOPIC_OUTLINE]...[/TOPIC_OUTLINE]     — first response only
[TOPIC_DONE:N]                          — topic N complete
[CHECKPOINT]score=X/3,...[/CHECKPOINT]  — after checkpoints
[ELI5_TRIGGERED:N]                      — simplification activated
[ELI5_PROACTIVE:topic=N,trigger=...]    — proactive ELI5
[UNIT_COMPLETE]                         — all topics done
[SESSION_RECAP:topics_done=...,...]     — session end
[READINESS_UPDATE:score=X,unit=Y]       — readiness score
[STREAK_UPDATE:unit=X,action=extend]    — study streak
[MEMORY_UPDATE:topic_name=X,...]        — memory update
[SPACED_REVIEW:topic=X,result=...,...]  — spaced review result
[RECALL_PROMPT:topic=N]                 — mid-topic recall
[TOPIC_REINFORCE:N]                     — re-teach topic
[TOPIC_SKIP:N]                          — skip topic
[OUTLINE_REORDERED:reason=...]          — outline reordered
[PREDICTED_Q_SESSION:score=X/50,...]    — predicted Q session
```

**Banned Phrases:**
- "Do you want to start from the beginning?"
- "What topic would you like to cover?"
- "Shall we begin?" / "Ready to learn?"
- "Great question!" / "Of course!"
- "Let me know if you have questions"

---

### Exam Mode System Prompt

Located in: `supabase/functions/chat/index.ts` (lines 715–756)

Activated when exam mode is triggered. Key behaviors:
- Scans ALL past papers and identifies question patterns
- Ranks topics by frequency: 3+ papers = "High Priority 🔥", 2 = "Medium", 1 = "Low"
- Cross-references with course notes for answers
- Generates Topic Frequency Table
- Predicted questions: 5 questions, one at a time, graded /10
- Cheat sheet: Top 5 topics, key formulas, exam traps, last 10 minutes review
- Emits `[READINESS_UPDATE:score=X,unit=Y]` and `[PREDICTED_Q_SESSION:score=X/50,...]`

---

### Institutional Knowledge Block

Located in: `supabase/functions/chat/index.ts` (lines 100–109)

```
Sekani is an AI-powered study assistant built by the Soma na Sekani team.
It helps students learn using student-contributed notes and is not officially
affiliated with any university.
```

---

### Context Injection Pipeline

The chat edge function builds the system prompt dynamically by concatenating:

1. **Base prompt** (Sekani / Teach Me / Exam Mode — selected by mode)
2. **Student Profile** — name, program, course, year, semester
3. **Enrolled Units** — unit codes, names, lecturers
4. **Unit Context** — current unit details (if unit chat)
5. **Academic Calendar** — upcoming events (cached 1 hour)
6. **Student Memory** — weak topics, strengths, recent questions (cached 5 min)
7. **RAG Context** — relevant document chunks from vector search (hybrid re-ranking)
8. **Teach Me Context** — full unit notes + past papers (up to 14K + 6K chars)
9. **Exam Mode Context** — past papers + course notes for exam analysis
10. **Opened Sources Context** — content from files currently open in Sources panel
11. **Admin context** — if user is admin, full system access note

**RAG Pipeline:**
- Embedding: `text-embedding-3-large` (768 dimensions)
- Vector search: `match_documents_for_units` RPC (threshold 0.35, unit-scoped)
- Re-ranking: `score = similarity * 0.8 + keyword_overlap * 0.2`
- Filtering: keyword overlap > 0 OR similarity ≥ 0.72
- Deduplication by title + content prefix
- Max chunks: configurable via admin settings (default 8)

**Model Selection:**
- Vision/Math content → vision model (default: `gpt-4.1`)
- Unit chat → configurable unit model
- General chat → configurable general model (default: `gpt-4.1-nano`)
- All configurable from admin dashboard `system_settings` table

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Student profiles (name, email, program, course, year, semester) |
| `user_roles` | Role-based access (admin, student, lecturer) — separate from profiles |
| `courses` | Course definitions (code, name, faculty) |
| `units` | Units within courses (code, name, lecturer, semester, year) |
| `student_units` | Student ↔ unit enrollment (many-to-many) |
| `materials` | Uploaded files (notes, past papers) with embedding status |
| `document_embeddings` | Chunked + embedded document content (pgvector) |
| `document_hashes` | Content hashes for duplicate detection |
| `chats` | Chat sessions (general or unit-specific) |
| `chat_messages` | Individual messages within chats |
| `token_usage` | Token consumption tracking per user per model |
| `payments` | Paystack payment records |
| `academic_calendar` | Academic events (system + student-created) |
| `student_memory` | Topic strength tracking for spaced repetition |
| `teach_me_sessions` | Teach Me session state (progress, scores, streaks) |
| `system_settings` | Admin-configurable key-value settings |
| `email_send_log` | Email delivery tracking |
| `email_send_state` | Email queue configuration |
| `email_unsubscribe_tokens` | Unsubscribe tokens |
| `suppressed_emails` | Suppressed email addresses |

### Key Functions

| Function | Purpose |
|----------|---------|
| `has_role(user_id, role)` | Security definer — checks user role without RLS recursion |
| `get_daily_token_usage(user_id)` | Returns daily token consumption |
| `match_documents(embedding, threshold, count)` | Global vector similarity search |
| `match_documents_for_units(embedding, unit_ids, ...)` | Unit-scoped vector search |
| `enqueue_email` / `read_email_batch` / `delete_email` | Email queue management |

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `chat` | Main AI chat — mode detection, RAG, streaming, token tracking |
| `embed-document` | Document chunking and embedding pipeline |
| `process-document` | PDF text extraction |
| `transcribe` | Voice transcription via Whisper |
| `paystack-initialize` | Initialize Paystack payment |
| `paystack-callback` | Handle Paystack redirect callback |
| `paystack-webhook` | Process Paystack webhook events |
| `delete-user` | Account deletion |
| `send-broadcast` | Admin broadcast emails |
| `auth-email-hook` | Custom auth email templates (signup, recovery, magic link, etc.) |
| `process-email-queue` | Email queue batch processing |

---

## Changelog (Last 2 Weeks)

### Sources Panel — Phase 1 (New Feature)
- **Created `SourcesPanel.tsx`**: NotebookLM-style side-by-side file viewer
- Smart sorting: course outlines first, modules/chapters in numerical order
- Categorized file listing: Course Notes vs Past Papers
- PDF preview using direct Supabase signed URLs (`#toolbar=1&navpanes=0`)
- Sources button in chat header (visible when unit selected)
- Panel closes when Teach Me mode activates

### Source-Aware AI Context
- **`ChatPage.tsx`**: Added `openedSources` state tracking which files the student has open
- **`ChatContext.tsx`**: `sendMessage` now passes `openedSources` IDs to the chat edge function
- **`chat/index.ts`**: AI receives opened file IDs, fetches up to 200 content chunks from those specific files, injects `OPENED SOURCES` block into system prompt
- AI can now cite specific file names and sections when student asks "where is this?"

### PDF Viewer Optimization
- Replaced Google Docs proxy (`docs.google.com/gview`) with direct browser PDF rendering
- Eliminated latency for large PDFs — files load instantly via signed URLs

### Teach Me Topic Tracker Fix
- **`useTeachMeSession.ts`**: Fixed `mapRow` helper to enrich `topicOutline` with `status` field (`active`/`done`/`locked`) when loading from database
- Topics now correctly appear in the sidebar with proper states

### Chat Scroll Behavior Fix
- **`ChatPage.tsx`**: Scroll-to-bottom only triggers when user is within 150px of bottom
- Users can now scroll up to read previous messages during AI streaming without being snapped back

### Input Bar Layout Fix
- Set explicit initial height (36px) for chat textarea
- Fixed layout jump/size glitch when starting or clearing a message

### README Update
- Comprehensive documentation of all features, system prompts, architecture, and changelog

---

## Development

```bash
npm install
npm run dev
```

### Environment Variables

Managed automatically by Lovable Cloud:
- `VITE_SUPABASE_URL` — Backend URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Anon key
- `VITE_SUPABASE_PROJECT_ID` — Project ID

### Edge Function Secrets

- `OPENAI_API_KEY` — OpenAI API access
- `UPSTASH_REDIS_REST_URL` — Redis caching
- `UPSTASH_REDIS_REST_TOKEN` — Redis auth
- `PAYSTACK_SECRET_KEY` — Payment processing
- `RESEND_API_KEY` — Email sending
- `SUPABASE_SERVICE_ROLE_KEY` — Admin database access

---

## License

Proprietary — Soma na Sekani team.
