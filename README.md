# RAG Chat — Intelligent Document Q&A with Hybrid AI

**Turn any document into a conversation — upload, ask, and get grounded answers in seconds.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Otachiking/Chatbot-RAG&root-directory=frontend)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## Author

**Muhammad Iqbal Rasyid**  
🌐 [Portfolio](https://portfolio-otachiking.vercel.app/)  
📧 GitHub: [@Otachiking](https://github.com/Otachiking)

---

## Overview

RAG Chat is a full-stack AI chatbot application that combines the power of Google's **Gemini 3 Pro** large language model with **ChromaDB** vector search to deliver both general-purpose AI conversation and document-grounded question answering in a single, unified interface. Whether you need a quick AI chat or want to interrogate a 50-page PDF, RAG Chat handles it seamlessly — no configuration needed.

The application follows a hybrid architecture: when no document is uploaded, it functions as a standard AI assistant powered by Gemini 3 Pro. The moment a user uploads a PDF or image, the system automatically ingests, chunks, and indexes the content into a vector database. From that point on, every answer is retrieved from the document's own content and cited with page references — giving users full transparency into where each answer originates.

---

## Details

### Architecture & Technology Stack

RAG Chat is built on a modern, decoupled architecture. The **frontend** is a Next.js (React + TypeScript) single-page application featuring a NotebookLM-inspired three-column layout: a thread sidebar on the left for managing multiple conversations, a central chat window with real-time typing indicators and Markdown rendering, and a collapsible sources panel on the right for managing uploaded documents. The **backend** is a FastAPI service responsible for document ingestion, vector storage via ChromaDB, and LLM orchestration through the Gemini API. Both halves communicate over a clean REST API and are independently deployable — the frontend to Vercel and the backend to Render — making the system production-ready out of the box.

### Intelligent Document Processing

Under the hood, uploaded PDFs are parsed page-by-page using PyMuPDF, with an automatic OCR fallback (via pytesseract) for scanned or image-heavy pages. Image files (`.png`, `.jpg`, `.jpeg`) are processed directly through OCR and treated as single-page documents. The extracted text is split into overlapping chunks (configurable size and overlap), embedded using Gemini's embedding model, and stored in ChromaDB with metadata tags for file ID and page number. At query time, the user's question is embedded and matched against the stored chunks using cosine similarity, with a configurable threshold that determines whether to return document-grounded answers or fall back to general AI chat.

### Feature Highlights

RAG Chat ships with a rich set of features designed for both casual users and power users:

- **Hybrid Chat Mode** — General AI conversation by default; automatic RAG activation on file upload with an explicit toggle for user control.
- **Multi-Thread Conversations** — Create, rename, delete, and switch between independent chat threads, each with its own history persisted in localStorage.
- **PDF + Image Upload with OCR** — Drag-and-drop file upload supporting `.pdf`, `.png`, `.jpg`, `.jpeg`, with automatic text extraction and OCR fallback for scanned documents.
- **Vector Search & Citations** — ChromaDB-powered semantic retrieval with `Hal. X` citation badges on every answer, linking responses to their source pages.
- **Quick Actions** — One-click "Summarize" and "Generate Quiz" buttons appear after upload, automatically fetching broad document context for comprehensive results.
- **Source Management Panel** — View, enable/disable, preview, and delete uploaded sources; toggle individual documents in and out of the RAG pipeline.
- **Document Preview Modal** — Click any source to preview the original file directly in the browser.
- **Conversation Export** — Download the full chat transcript as a `.txt` file.
- **Responsive Design** — Fully responsive layout with mobile tab navigation, collapsible sidebars, and touch-friendly interactions for tablets and phones.
- **Graceful Error Handling** — Intelligent quota detection (429 rate limits) with user-friendly retry messages instead of raw error dumps; toast notifications for all feedback.
- **Query Logging & Metrics** — Every query is logged as structured JSONL with latency breakdowns; a built-in CLI tool computes average latency and precision\@K.
- **One-Click Deployment** — Pre-configured `render.yaml` and `vercel.json` for instant deployment to Render (backend) and Vercel (frontend).

## Repository structure

```
ChatbotRAG/
├─ frontend/                        # Next.js (React + TypeScript)
│  ├─ package.json
│  ├─ pages/
│  │  ├─ _app.tsx
│  │  └─ index.tsx                  # Main page — state, layout, hybrid logic
│  ├─ components/
│  │  ├─ ChatWindow.tsx             # Chat bubbles, typing indicator, export
│  │  ├─ FileUploader.tsx           # Drag & drop, progress, image/PDF upload
│  │  ├─ ThreadSidebar.tsx          # Multi-thread management sidebar
│  │  ├─ SourcesPanel.tsx           # Document source management panel
│  │  ├─ PreviewModal.tsx           # In-browser document preview
│  │  ├─ RecommendCard.tsx          # Summarize / Generate Quiz actions
│  │  └─ RagToggle.tsx              # "Use document reference" toggle
│  └─ styles/globals.css
├─ backend/
│  ├─ .env                          # API keys (NEVER commit)
│  ├─ requirements.txt
│  ├─ main.py                       # FastAPI app — mounts routers
│  ├─ routers/
│  │  ├─ upload.py                  # POST /api/upload
│  │  └─ query.py                   # POST /api/query (use_rag flag)
│  ├─ services/
│  │  ├─ ingest_service.py          # PDF/image → text → chunks → ChromaDB
│  │  └─ rag_service.py             # Hybrid: general vs. RAG response
│  └─ utils/
│     ├─ settings.py                # Config from .env
│     ├─ logging_utils.py           # JSON-line query logging
│     └─ metrics_report.py          # CLI latency & precision metrics
├─ render.yaml                      # Render blueprint for backend deploy
├─ demo_files/
│  └─ sample_manual.pdf
└─ README.md
```

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> **Tesseract OCR** (required for image upload):
> - Windows: download installer from https://github.com/UB-Mannheim/tesseract/wiki and add to PATH.
> - macOS: `brew install tesseract`
> - Linux: `sudo apt install tesseract-ocr`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**. The frontend talks to `http://localhost:8000` by default. Override:

```bash
NEXT_PUBLIC_API_URL=http://your-host:8000 npm run dev
```

## Hybrid RAG mode — how it works

| Scenario | Toggle state | Chat behavior |
| --- | --- | --- |
| No file uploaded | Disabled (OFF) | General AI chat (pure Gemini) |
| File uploaded | Auto-ON | RAG mode — answers reference the document |
| User flips toggle OFF | OFF | General AI chat (document stays indexed) |
| User flips toggle ON | ON | RAG mode resumes |

The backend respects the `use_rag` boolean in the `/api/query` request body:

```
IF use_rag == true AND file_id exists:
    → retrieve chunks from ChromaDB → generate grounded answer
ELSE:
    → generate general response (no retrieval)
```

## API reference

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/health | `{"status": "ok"}` |
| POST | /api/upload | Multipart file → ingest + index → metadata |
| POST | /api/query | `{file_id, query, type, use_rag}` → answer |

## Environment variables (backend/.env)

| Variable | Default | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | — | Google AI API key (required) |
| `GEMINI_MODEL` | `gemini-3-pro` | Model for generation |
| `USE_LOCAL_LLM` | `false` | Set `true` to use a local model instead |
| `CHUNK_SIZE` | `500` | Characters per chunk |
| `CHUNK_OVERLAP` | `100` | Overlap between chunks |
| `RAG_SIMILARITY_THRESHOLD` | `0.35` | Below this, fallback to general chat |

### Switching to a local LLM

Set `USE_LOCAL_LLM=true` in `.env` and replace the `generate_from_prompt()` function body in `backend/services/rag_service.py` with your local inference call (e.g., llama-cpp-python, vLLM, Ollama). Note: local models like LLaMA 7B require ~8 GB VRAM.

## Logging & Metrics

Every query is logged to `backend/logs/queries.jsonl`:

```json
{"timestamp": "...", "query": "...", "mode": "rag", "file_id": "doc-abc123",
 "use_rag": true, "retrieved_chunk_ids": ["..."], "retrieval_scores": [0.82],
 "retrieval_latency_ms": 120.5, "generation_latency_ms": 890.3,
 "total_latency_ms": 1015.2, "success": true, "error": null}
```

Run the metrics report:

```bash
cd backend
python -m utils.metrics_report
python -m utils.metrics_report --ground-truth ground_truth.json
```

## License

MIT

---

## 🚀 Deployment Guide

### Architecture

```
┌─────────────────┐      API calls      ┌─────────────────┐
│   Vercel        │ ──────────────────► │   Render        │
│   (Frontend)    │                     │   (Backend)     │
│   Next.js       │ ◄────────────────── │   FastAPI       │
└─────────────────┘      JSON responses └─────────────────┘
```

### Step 1: Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo: `https://github.com/Otachiking/Chatbot-RAG`
4. Configure:
   - **Name**: `rag-chatbot-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Region**: Choose closest to your users
   - **Instance Type**: `Free` (or `Starter` for production)
5. Add **Environment Variables**:
   - `GEMINI_API_KEY` = your Google AI API key
   - `GEMINI_MODEL` = `gemini-3-pro`
6. (Optional) Add **Disk** for persistent ChromaDB:
   - Name: `chroma-data`
   - Mount Path: `/app/chroma_data`
   - Size: `1 GB`
7. Click **"Create Web Service"**
8. Wait for deployment → Copy your backend URL (e.g., `https://rag-chatbot-backend.onrender.com`)

### Step 2: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repo: `https://github.com/Otachiking/Chatbot-RAG`
4. Configure:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend` ← **IMPORTANT!**
5. Add **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = `https://rag-chatbot-backend.onrender.com` (your Render URL)
6. Click **"Deploy"**

### Done! 🎉

Your app is now live:
- **Frontend**: `https://your-project.vercel.app`
- **Backend**: `https://rag-chatbot-backend.onrender.com`

### Environment Variables Summary

| Service | Variable | Value |
|---------|----------|-------|
| Render (Backend) | `GEMINI_API_KEY` | Your Google AI API key |
| Render (Backend) | `GEMINI_MODEL` | `gemini-3-pro` |
| Vercel (Frontend) | `NEXT_PUBLIC_API_URL` | Your Render backend URL |

### Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error | Backend already allows all origins (`*`). Check if backend URL is correct. |
| 500 on upload | Check Render logs. Ensure `GEMINI_API_KEY` is set. |
| Cold start delay | Free tier sleeps after 15 min. First request takes ~30s. Upgrade to Starter. |
| ChromaDB data lost | Add a Render Disk (see Step 1.6) |

---

Made with ❤️ by [Muhammad Iqbal Rasyid](https://portfolio-otachiking.vercel.app/)
