/**
 * ChatWindow.tsx
 *
 * Displays the conversation between the user and the RAG bot.
 * Features:
 *  - Message bubbles (user / bot) with citation badges
 *  - Typing indicator (3-dot animation)
 *  - Free-text input with Enter-to-send
 *  - "Export transcript" button (downloads .txt client-side)
 *  - Markdown rendering with tables, bold, italic, strikethrough
 *
 * TODO: Replace the stub API call in sendMessage() with your
 * real retrieval endpoint once the backend is wired up.
 */

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ---- Types ----------------------------------------------------------------

export interface Source {
  file: string;
  page: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "bot" | "system";
  text: string;
  sources?: Source[];
}

export interface DocumentInfo {
  filename: string;
  pages: number;
  chunks_indexed: number;
  type: string;
}

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isTyping: boolean;
  documentInfo?: DocumentInfo | null;
}

// ---- Component -------------------------------------------------------------

const ChatWindow: React.FC<Props> = ({ messages, onSend, isTyping, documentInfo }) => {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  /** Download the full conversation as a plain-text file. */
  const exportTranscript = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const header = `════════════════════════════════════════════════════════════
RAG Chat - Transcript Export
════════════════════════════════════════════════════════════
Tanggal : ${dateStr}
Waktu   : ${timeStr}${documentInfo ? `

[DOCUMENT ATTACHED]
File    : ${documentInfo.filename}
Pages   : ${documentInfo.pages}
Chunks  : ${documentInfo.chunks_indexed}
Type    : ${documentInfo.type.toUpperCase()}` : ''}
════════════════════════════════════════════════════════════

`;

    const lines = messages.map((m) => {
      const prefix = m.role === "user" ? "You" : "Bot";
      let line = `[${prefix}] ${m.text}`;
      if (m.sources?.length) {
        const cites = m.sources
          .map((s) => `${s.file} p.${s.page}`)
          .join(", ");
        line += `  [sources: ${cites}]`;
      }
      return line;
    });

    const footer = `

════════════════════════════════════════════════════════════
RAG Chat by Muhammad Iqbal Rasyid
https://portfolio-otachiking.vercel.app/
════════════════════════════════════════════════════════════`;

    const content = header + lines.join("\n\n") + footer;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filenameDate = now.toISOString().slice(0, 10);
    const filenameTime = now.toTimeString().slice(0, 5).replace(":", "-");
    a.download = `rag-chat-transcript_${filenameDate}_${filenameTime}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
  <>
    {/* ---- Messages ---- */}
    <div className="chat-area">
      {messages.map((m) => (
        <div key={m.id} className={`msg ${m.role}`}>
          <div className="msg-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {m.text}
            </ReactMarkdown>
          </div>

          {m.sources?.map((s, i) => (
            <span key={i} className="citation">
              Hal.&thinsp;{s.page}
            </span>
          ))}

          {m.role === "bot" && (
            <button
              className="copy-btn"
              onClick={() => copyToClipboard(m.text, m.id)}
              title={copiedId === m.id ? "Copied!" : "Copy message"}
            >
              {copiedId === m.id ? "✓" : "📋"}
            </button>
          )}
        </div>
      ))}

      {/* Typing indicator */}
      {isTyping && (
        <div className="typing-indicator">
          <span /><span /><span />
        </div>
      )}

      <div ref={bottomRef} />
    </div>

    {/* ---- Input bar ---- */}
    <div className="input-bar">
      <input
        type="text"
        placeholder="Ask a question…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
      />
      <button className="btn btn-primary" onClick={handleSend}>
        Send
      </button>
      <button
        className="btn btn-ghost btn-icon"
        onClick={exportTranscript}
        title="Export transcript"
      >
        💾
      </button>
    </div>
  </>
);
};

export default ChatWindow;
