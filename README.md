# RAG ChatBot — Hybrid General + RAG Chat

A **production-ready** RAG (Retrieval-Augmented Generation) chatbot with a polished Next.js frontend and a FastAPI backend powered by **Gemini 2.5 Flash** and **ChromaDB**. Supports hybrid chat: general AI conversation when no document is loaded, and document-grounded RAG when a file is uploaded and the toggle is ON.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Otachiking/Chatbot-RAG&root-directory=frontend)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## Author

**Muhammad Iqbal Rasyid**  
🌐 [Portfolio](https://portfolio-otachiking.vercel.app/)  
📧 GitHub: [@Otachiking](https://github.com/Otachiking)

## Features

- **Hybrid chat mode** — General AI chat by default; RAG mode activates after file upload.
- **Explicit RAG toggle** — "Use document reference" switch lets users control when retrieval is used.
- **PDF + image upload** — Drag-and-drop support for `.pdf`, `.png`, `.jpg`, `.jpeg`.
- **Image OCR** — pytesseract extracts text from images, treated as single-page documents.
- **PDF text extraction** — PyMuPDF with OCR fallback for scanned pages.
- **Vector search** — ChromaDB stores chunks with Gemini embeddings, filtered by `file_id`.
- **Citation badges** — Bot answers include `Hal. X` citation badges linking to source pages.
- **Typing indicator** — 3-dot bounce animation during LLM generation.
- **Recommend actions** — "Summarize" and "Generate Quiz" buttons after upload.
- **Export transcript** — Download full conversation as `.txt`.
- **Filename overflow fix** — Long filenames scroll horizontally within their container.
- **Toast notifications** — Error, success, and info feedback.
- **Query logging** — Every query logged as JSON lines with latency metrics.
- **Metrics report** — CLI tool to compute average latency and precision@K.

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
│  │  ├─ FileUploader.tsx           # Drag & drop, progress, image/PDF preview
│  │  ├─ RecommendCard.tsx          # Summarize / Generate Quiz
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
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model for generation |
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
   - `GEMINI_MODEL` = `gemini-2.5-flash`
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
| Render (Backend) | `GEMINI_MODEL` | `gemini-2.5-flash` |
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
