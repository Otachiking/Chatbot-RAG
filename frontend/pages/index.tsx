/**
 * pages/index.tsx — Main chat page (NotebookLM-style 3-column layout)
 *
 * Layout:
 *  ┌───────────────────────────────────────────────────────────────────┐
 *  │  Header: "RAG Chat v1.2.0"                "by Muhammad Iqbal..."  │
 *  ├─────────────┬──────────────────────────────┬──────────────────────┤
 *  │  Thread     │                              │  Sources Panel       │
 *  │  Sidebar    │       ChatWindow             │  - File list         │
 *  │  - threads  │                              │  - Toggle checkboxes │
 *  │  - new chat │                              │  - Preview on click  │
 *  ├─────────────┴──────────────────────────────┴──────────────────────┤
 *  │  Input bar                                                        │
 *  └───────────────────────────────────────────────────────────────────┘
 *
 * Backend base URL defaults to http://localhost:8000 — change via
 * the NEXT_PUBLIC_API_URL env var.
 */

import React, { useState, useCallback, useEffect } from "react";
import Head from "next/head";
import ChatWindow, { ChatMessage } from "../components/ChatWindow";
import FileUploader, { UploadResult } from "../components/FileUploader";
import RecommendCard from "../components/RecommendCard";
import RagToggle from "../components/RagToggle";
import ThreadSidebar, { Thread } from "../components/ThreadSidebar";
import SourcesPanel, { Source } from "../components/SourcesPanel";
import PreviewModal from "../components/PreviewModal";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BACKEND =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8000";

// Version info - update this when releasing
const APP_VERSION = "1.2.0";
const LAST_UPDATED = "15 Februari 2026";

// ---------------------------------------------------------------------------
// Seed messages so the chat doesn't start empty
// ---------------------------------------------------------------------------

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: "seed-1",
    role: "bot",
    text: "👋 Welcome! I can chat with you about anything. Upload a document on the right to unlock RAG mode.",
  },
  {
    id: "seed-2",
    role: "bot",
    text: "You can ask me anything about the document, or try the quick actions (\"Summarize\", \"Generate Quiz\") once it's uploaded.",
  },
];

// ---------------------------------------------------------------------------
// Toast helper (lightweight — no extra dependency)
// ---------------------------------------------------------------------------

interface Toast {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

// Thread data stored per thread
interface ThreadData {
  messages: ChatMessage[];
  sources: Source[];
}

let _toastId = 0;

// LocalStorage keys
const STORAGE_THREADS_KEY = "rag-chat-threads";
const STORAGE_ACTIVE_THREAD_KEY = "rag-chat-active-thread";
const STORAGE_THREAD_DATA_PREFIX = "rag-chat-thread-data-";

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function Home() {
  // Thread state
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  
  // Chat state (per thread)
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  
  // Sources state (shared across threads but can be toggled per-thread)
  const [sources, setSources] = useState<Source[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [useRag, setUseRag] = useState(false);
  
  // UI state
  const [actionLoading, setActionLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [previewSource, setPreviewSource] = useState<Source | null>(null);

  // -- localStorage persistence ---------------------------------------------

  // Load threads from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_THREADS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Thread[];
        setThreads(parsed);
        
        // Restore active thread
        const activeId = localStorage.getItem(STORAGE_ACTIVE_THREAD_KEY);
        if (activeId && parsed.some(t => t.id === activeId)) {
          setActiveThreadId(activeId);
          // Load thread data
          const threadData = localStorage.getItem(STORAGE_THREAD_DATA_PREFIX + activeId);
          if (threadData) {
            const data = JSON.parse(threadData) as ThreadData;
            setMessages(data.messages.length > 0 ? data.messages : SEED_MESSAGES);
            setSources(data.sources || []);
          }
        } else if (parsed.length > 0) {
          // Select first thread if active not found
          setActiveThreadId(parsed[0].id);
          const threadData = localStorage.getItem(STORAGE_THREAD_DATA_PREFIX + parsed[0].id);
          if (threadData) {
            const data = JSON.parse(threadData) as ThreadData;
            setMessages(data.messages.length > 0 ? data.messages : SEED_MESSAGES);
            setSources(data.sources || []);
          }
        }
      } catch (e) {
        console.error("Failed to load threads from localStorage", e);
      }
    }
  }, []);

  // Save threads list to localStorage
  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem(STORAGE_THREADS_KEY, JSON.stringify(threads));
    }
  }, [threads]);

  // Save active thread id
  useEffect(() => {
    if (activeThreadId) {
      localStorage.setItem(STORAGE_ACTIVE_THREAD_KEY, activeThreadId);
    }
  }, [activeThreadId]);

  // Save current thread data when messages or sources change
  useEffect(() => {
    if (activeThreadId && messages.length > 0) {
      const data: ThreadData = { messages, sources };
      localStorage.setItem(STORAGE_THREAD_DATA_PREFIX + activeThreadId, JSON.stringify(data));
    }
  }, [activeThreadId, messages, sources]);

  // -- Toast ----------------------------------------------------------------

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "error") => {
      const id = ++_toastId;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    },
    []
  );

  // -- Thread management ----------------------------------------------------

  const handleCreateThread = useCallback(() => {
    const newThread: Thread = {
      id: `thread-${Date.now()}`,
      title: "New Chat",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setMessages(SEED_MESSAGES);
    // Don't clear sources - they're shared
  }, []);

  const handleSelectThread = useCallback((threadId: string) => {
    // Save current thread first
    if (activeThreadId) {
      const data: ThreadData = { messages, sources };
      localStorage.setItem(STORAGE_THREAD_DATA_PREFIX + activeThreadId, JSON.stringify(data));
    }
    
    setActiveThreadId(threadId);
    
    // Load thread data
    const threadData = localStorage.getItem(STORAGE_THREAD_DATA_PREFIX + threadId);
    if (threadData) {
      const data = JSON.parse(threadData) as ThreadData;
      setMessages(data.messages.length > 0 ? data.messages : SEED_MESSAGES);
      // Keep current sources for now (shared model)
    } else {
      setMessages(SEED_MESSAGES);
    }
  }, [activeThreadId, messages, sources]);

  const handleRenameThread = useCallback((threadId: string, newTitle: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? { ...t, title: newTitle, updatedAt: new Date().toISOString() }
          : t
      )
    );
  }, []);

  const handleDeleteThread = useCallback((threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    localStorage.removeItem(STORAGE_THREAD_DATA_PREFIX + threadId);
    
    // If deleted the active thread, select another
    if (activeThreadId === threadId) {
      const remaining = threads.filter((t) => t.id !== threadId);
      if (remaining.length > 0) {
        handleSelectThread(remaining[0].id);
      } else {
        setActiveThreadId(null);
        setMessages(SEED_MESSAGES);
      }
    }
  }, [activeThreadId, threads, handleSelectThread]);

  // -- Source management ----------------------------------------------------

  const handleToggleSource = useCallback((fileId: string) => {
    setSources((prev) =>
      prev.map((s) =>
        s.file_id === fileId ? { ...s, enabled: !s.enabled } : s
      )
    );
  }, []);

  const handleToggleAllSources = useCallback((enabled: boolean) => {
    setSources((prev) => prev.map((s) => ({ ...s, enabled })));
    setUseRag(enabled && sources.length > 0);
  }, [sources.length]);

  const handleDeleteSource = useCallback((fileId: string) => {
    setSources((prev) => prev.filter((s) => s.file_id !== fileId));
    if (uploadResult?.file_id === fileId) {
      setUploadResult(null);
      setUseRag(false);
    }
  }, [uploadResult]);

  const handlePreviewSource = useCallback((source: Source) => {
    setPreviewSource(source);
  }, []);

  // -- Helpers --------------------------------------------------------------

  const addBotMessage = useCallback(
    (text: string, sources?: { file: string; page: number }[]) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "bot",
          text,
          sources,
        },
      ]);
    },
    []
  );

  // -- Query backend --------------------------------------------------------

  const queryBackend = useCallback(
    async (query: string, type: string = "freeform", forceRag?: boolean) => {
      const ragOn = forceRag ?? useRag;

      // Only block if RAG is requested but no document is uploaded
      if (ragOn && !uploadResult) {
        showToast("Upload a document first to use RAG.", "info");
        return;
      }

      setIsTyping(true);

      try {
        const res = await fetch(`${BACKEND}/api/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: uploadResult?.file_id || null,
            filename: uploadResult?.filename || null,
            query,
            type,
            use_rag: ragOn,
          }),
        });

        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const data = await res.json();

        // Small extra delay so typing indicator feels natural
        await new Promise((r) => setTimeout(r, 300));

        setIsTyping(false);
        addBotMessage(data.answer, data.sources);
      } catch {
        setIsTyping(false);
        showToast("Server unavailable \u2014 try again");
      }
    },
    [uploadResult, useRag, addBotMessage, showToast]
  );

  // -- User sends a chat message -------------------------------------------

  const handleSend = useCallback(
    (text: string) => {
      // Add user bubble immediately
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", text },
      ]);
      queryBackend(text);
    },
    [queryBackend]
  );

  // -- Upload completed ----------------------------------------------------

  const handleUploadComplete = useCallback(
    (result: UploadResult) => {
      setUploadResult(result);
      setUseRag(true);
      
      // Add to sources list if not already present
      setSources((prev) => {
        const exists = prev.some((s) => s.file_id === result.file_id);
        if (exists) return prev;
        
        const newSource: Source = {
          file_id: result.file_id,
          filename: result.filename,
          pages: result.pages,
          chunks_indexed: result.chunks_indexed,
          type: result.type,
          uploadedAt: new Date().toISOString(),
          enabled: true,
        };
        return [...prev, newSource];
      });
      
      // Create a thread if none exists
      if (threads.length === 0) {
        const newThread: Thread = {
          id: `thread-${Date.now()}`,
          title: result.filename.replace(/\.[^/.]+$/, "").slice(0, 30),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setThreads([newThread]);
        setActiveThreadId(newThread.id);
      }
      
      showToast(
        `"${result.filename}" uploaded \u2014 ${result.pages} pages, ${result.chunks_indexed} chunks indexed.`,
        "success"
      );
    },
    [showToast, threads.length]
  );

  // -- Recommend card actions ----------------------------------------------

  const handleRecommendAction = useCallback(
    async (type: "summarize" | "quiz") => {
      setActionLoading(true);

      // Insert a user-like message so the conversation makes sense
      const label = type === "summarize" ? "Summarize this document" : "Generate a quiz from this document";
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", text: label },
      ]);

      await queryBackend(label, type, true);  // always use RAG for recommend actions
      setActionLoading(false);
    },
    [queryBackend]
  );

  // -- Render ---------------------------------------------------------------

  // Get enabled sources for RAG query
  const enabledSources = sources.filter((s) => s.enabled);
  const hasEnabledSources = enabledSources.length > 0;

  return (
    <>
      <Head>
        <title>RAG Chat — Demo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app-shell">
        {/* ---- Header ---- */}
        <header className="app-header">
          <div className="header-left">
            <h1>
              RAG Chat<span className="version-badge">v{APP_VERSION}</span>
            </h1>
            <span className="last-update">Last Update: {LAST_UPDATED}</span>
          </div>
          <div className="header-right">
            <span>by{" "}
              <a 
                href="https://portfolio-otachiking.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="author-link"
              >
                Muhammad Iqbal Rasyid
              </a>
              {" "}🐺
            </span>
          </div>
        </header>

        {/* ---- Main grid (3-column NotebookLM style) ---- */}
        <div className="main-grid">
          {/* Left: Thread Sidebar */}
          <ThreadSidebar
            threads={threads}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            onCreateThread={handleCreateThread}
            onRenameThread={handleRenameThread}
            onDeleteThread={handleDeleteThread}
          />

          {/* Center: Chat */}
          <div className="chat-area">
            <ChatWindow
              messages={messages}
              onSend={handleSend}
              isTyping={isTyping}
              documentInfo={uploadResult ? {
                filename: uploadResult.filename,
                pages: uploadResult.pages,
                chunks_indexed: uploadResult.chunks_indexed,
                type: uploadResult.type,
              } : null}
            />
            
            {/* Quick actions when source is available */}
            {uploadResult && (
              <div className="quick-actions">
                <RecommendCard
                  filename={uploadResult.filename}
                  pages={uploadResult.pages}
                  onAction={handleRecommendAction}
                  disabled={actionLoading}
                />
              </div>
            )}
          </div>

          {/* Right: Sources Panel */}
          <SourcesPanel
            sources={sources}
            onToggleSource={handleToggleSource}
            onToggleAll={handleToggleAllSources}
            onDeleteSource={handleDeleteSource}
            onPreviewSource={handlePreviewSource}
            uploadComponent={
              <FileUploader
                backendUrl={BACKEND}
                onUploadComplete={handleUploadComplete}
                onError={(msg) => showToast(msg)}
              />
            }
          />
        </div>
      </div>

      {/* ---- Preview Modal ---- */}
      {previewSource && (
        <PreviewModal
          source={previewSource}
          onClose={() => setPreviewSource(null)}
        />
      )}

      {/* ---- Toasts ---- */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type}`}>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
