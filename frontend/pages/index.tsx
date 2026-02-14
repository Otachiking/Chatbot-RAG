/**
 * pages/index.tsx — Main chat page
 *
 * Layout:
 *  ┌──────────────────────────────────────────────┐
 *  │  Header: "RAG Chat — Demo"       [Export]    │
 *  ├─────────────────────────┬────────────────────┤
 *  │                         │  FileUploader      │
 *  │   ChatWindow            │  RecommendCard     │
 *  │                         │                    │
 *  ├─────────────────────────┘────────────────────┤
 *  │  Input bar                                   │
 *  └──────────────────────────────────────────────┘
 *
 * State lives here and is threaded into child components via props.
 *
 * Backend base URL defaults to http://localhost:8000 — change via
 * the NEXT_PUBLIC_API_URL env var.
 */

import React, { useState, useCallback } from "react";
import Head from "next/head";
import ChatWindow, { ChatMessage } from "../components/ChatWindow";
import FileUploader, { UploadResult } from "../components/FileUploader";
import RecommendCard from "../components/RecommendCard";
import RagToggle from "../components/RagToggle";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BACKEND =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8000";

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

let _toastId = 0;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [useRag, setUseRag] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // -- Toast ----------------------------------------------------------------

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "error") => {
      const id = ++_toastId;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    },
    []
  );

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
      showToast(
        `"${result.filename}" uploaded \u2014 ${result.pages} pages, ${result.chunks_indexed} chunks indexed.`,
        "success"
      );
    },
    [showToast]
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

  return (
    <>
      <Head>
        <title>RAG Chat — Demo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app-shell">
        {/* ---- Header ---- */}
        <header className="app-header">
          <h1>
            RAG Chat<span className="subtitle">— Demo</span>
          </h1>
        </header>

        {/* ---- Main grid ---- */}
        <div className="main-grid">
          {/* Left: Chat */}
          <ChatWindow
            messages={messages}
            onSend={handleSend}
            isTyping={isTyping}
          />

          {/* Right: sidebar */}
          <aside className="panel">
            <FileUploader
              backendUrl={BACKEND}
              onUploadComplete={handleUploadComplete}
              onError={(msg) => showToast(msg)}
            />

            {/* RAG Toggle */}
            <RagToggle
              enabled={useRag}
              onChange={setUseRag}
              disabled={!uploadResult}
            />

            {/* RAG status banner */}
            {uploadResult && (
              <div className={`rag-banner ${useRag ? "active" : "inactive"}`}>
                {useRag
                  ? "\u2705 Document indexed. Answers will reference this file."
                  : "\u26a0\ufe0f Document indexed but not used as reference."}
              </div>
            )}

            {uploadResult && (
              <RecommendCard
                filename={uploadResult.filename}
                pages={uploadResult.pages}
                onAction={handleRecommendAction}
                disabled={actionLoading}
              />
            )}
          </aside>
        </div>
      </div>

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
