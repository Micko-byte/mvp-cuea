
# Sources Panel — Implementation Plan

## Overview
Build a NotebookLM-inspired "Sources" panel that lets students view their uploaded notes directly alongside the chat, plus a "Teach Me with Sources" mode that teaches interactively while highlighting the actual documents.

---

## Phase 1 — Sources Panel (Desktop only, right sidebar)

**What it does:**
- When you click "Sources" on a unit chat, the right panel shows all uploaded files for that unit
- Files are listed by name, sorted intelligently (Introduction → Module 1 → Module 2, etc.)
- Click a file → opens an embedded PDF viewer in the same panel
- No AI tokens used — just displaying your uploaded files

**Technical approach:**
- Fetch materials from the `materials` table filtered by `unit_id`
- Sort files by name using smart ordering (detect "intro", "module 1", "chapter 1", etc.)
- Use the Supabase Storage signed URL to load the PDF
- Embed PDF using `<iframe>` with the PDF URL or a lightweight PDF viewer (react-pdf)
- Panel replaces the units panel on the right side (same slot as TeachMePanel)

**New components:**
- `SourcesPanel.tsx` — file list + embedded PDF viewer
- `SourceFileList.tsx` — sorted list of unit materials
- Add "Sources" button to the chat header (next to Teach Me button)

---

## Phase 2 — "Teach Me with Sources" Mode

**What it does:**
- Split view: chat on left, PDF source on right
- AI teaches from the notes and tells you which page/section to look at
- The PDF viewer scrolls to the relevant section as the AI teaches
- Only the chat uses tokens — the PDF display is free

**Technical approach:**
- When "Teach Me with Sources" is activated, show TeachMe progress bar + Sources panel together
- AI references specific chunks — we map chunks back to their source material via `material_id` in `document_embeddings`
- Each chunk's metadata stores page numbers (if available from extraction)
- AI emits a new tag: `[SOURCE_REF:material_id=X,page=Y]` to highlight the relevant source
- Frontend scrolls the PDF to that page when the tag is detected

**What needs to change in the edge function:**
- Include `material_id` and page info in the teach me context
- Add instruction for the AI to emit `[SOURCE_REF]` tags when referencing notes

---

## Phase 3 — Smart File Ordering

**What it does:**
- Files auto-sort by detecting patterns: "Introduction", "Chapter 1", "Module 1", "Week 1", "Topic 1"
- Course outlines/syllabi pinned to the top
- Past papers grouped separately at the bottom

**Technical approach:**
- Parse file names for ordering keywords
- Use `document_type` field (notes vs past_paper) for grouping
- Optional: let students manually reorder via drag-and-drop (future)

---

## What's NOT included (future):
- Mobile Sources panel (start desktop-only)
- Annotation/highlighting on PDFs
- Full-text search within PDFs
- Manual file reordering

---

## Questions for you:
1. Should we start with Phase 1 only (just viewing sources), or do you want Phase 1 + 2 together?
2. For the PDF viewer — do you want the full PDF rendered page-by-page, or is a simple iframe embed enough?
3. Should "Sources" be available in general chat too, or only in unit chats?
