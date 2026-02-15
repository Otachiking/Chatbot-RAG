/**
 * ThreadSidebar.tsx
 *
 * Left sidebar showing list of chat threads.
 * Features:
 *  - Create new thread
 *  - Switch between threads
 *  - Delete thread
 *  - Threads persist in localStorage
 */

import React from "react";

export interface Thread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  threads: Thread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newTitle: string) => void;
}

const ThreadSidebar: React.FC<Props> = ({
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
  onRenameThread,
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");

  const handleStartRename = (thread: Thread) => {
    setEditingId(thread.id);
    setEditValue(thread.title);
  };

  const handleFinishRename = () => {
    if (editingId && editValue.trim()) {
      onRenameThread(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <aside className="thread-sidebar">
      <div className="sidebar-header">
        <h3>💬 Threads</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={onCreateThread}
          title="New Thread"
        >
          + New
        </button>
      </div>

      <div className="thread-list">
        {threads.length === 0 ? (
          <p className="empty-state">No threads yet. Create one!</p>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              className={`thread-item ${activeThreadId === thread.id ? "active" : ""}`}
              onClick={() => onSelectThread(thread.id)}
            >
              {editingId === thread.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={(e) => e.key === "Enter" && handleFinishRename()}
                  autoFocus
                  className="rename-input"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <div className="thread-info">
                    <span className="thread-title">{thread.title}</span>
                    <span className="thread-date">{formatDate(thread.updatedAt)}</span>
                  </div>
                  <div className="thread-actions">
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(thread);
                      }}
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this thread?")) {
                          onDeleteThread(thread.id);
                        }
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default ThreadSidebar;
