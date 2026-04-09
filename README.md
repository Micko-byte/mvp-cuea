# Sekani — AI Study Companion

Sekani is an AI-powered study assistant built for Kenyan university students. It helps students learn from their own uploaded notes, past papers, and course materials.

## Features

### 💬 AI Chat
- Context-aware conversations grounded in uploaded course materials
- Unit-specific and general chat modes
- Multi-modal support: text, images, PDFs, Word docs, spreadsheets
- Voice input with transcription
- Document generation (PDF, DOCX, PPTX, XLSX)

### 📚 Teach Me Mode
- Systematic topic-by-topic teaching from uploaded notes
- Checkpoint quizzes every 2 topics
- Progress tracking with topic outline sidebar
- ELI5 (Explain Like I'm 5) simplification on demand
- Spaced repetition via student memory system
- Exam readiness scoring and study streaks

### 📝 Exam Mode
- Deep analysis of uploaded past papers
- Topic frequency ranking across multiple papers
- Predicted exam questions with model answers
- Cross-referencing past papers with course notes
- Targeted revision plans based on exam proximity

### 📖 Sources Panel (NotebookLM-style)
- Side-by-side PDF viewer alongside chat
- Smart sorting: outlines first, modules in numerical order
- Categorized file listing (Course Notes vs Past Papers)
- Opened source tracking — the AI knows which files you're viewing
- Reference-aware responses citing specific files and sections

### 🎓 Student Features
- Course and unit enrollment system
- Material uploads (notes and past papers)
- Document embedding for RAG-powered answers
- Academic calendar with personal events
- Personalization (nickname, chat background, theme)
- PWA installable on mobile

### 🔒 Security & Auth
- Email-based authentication with verification
- Google OAuth sign-in
- Role-based access control (admin, student, lecturer)
- Row-level security on all database tables
- Rate limiting and token usage tracking

### 💳 Payments
- Paystack integration (M-Pesa and card)
- Individual and group plans
- Free tier with daily token limits
- Premium tier with expanded limits

### 🛠 Admin Dashboard
- User management and role assignment
- Course and unit configuration
- Material management with embedding status
- System settings (model selection, token limits, rate limits)
- Broadcast messaging
- Analytics and token usage monitoring

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS v3
- **UI**: shadcn/ui, Framer Motion, Lucide icons
- **Backend**: Lovable Cloud (Supabase)
- **AI**: OpenAI GPT models with RAG (pgvector embeddings)
- **Database**: PostgreSQL with pgvector extension
- **Caching**: Upstash Redis
- **Payments**: Paystack
- **Email**: Resend with custom templates

## Architecture

```
src/
├── components/       # Reusable UI components
│   ├── ui/           # shadcn/ui primitives
│   ├── TeachMePanel  # Teach Me mode sidebar
│   ├── SourcesPanel  # NotebookLM-style PDF viewer
│   └── ...
├── contexts/         # React contexts (Auth, Chat, Artifacts, Personalization)
├── hooks/            # Custom hooks (useTeachMeSession, usePWAInstall)
├── pages/            # Route pages (Chat, Login, Admin, etc.)
├── utils/            # Document generation, greetings
└── lib/              # Teach Me prompt parsing

supabase/
├── functions/        # Edge functions
│   ├── chat/         # Main AI chat with RAG
│   ├── embed-document/ # Document chunking & embedding
│   ├── process-document/ # PDF text extraction
│   ├── transcribe/   # Voice transcription
│   ├── paystack-*/   # Payment processing
│   └── ...
└── config.toml       # Project configuration
```

## Development

```bash
npm install
npm run dev
```

## License

Proprietary — Soma na Sekani team.
