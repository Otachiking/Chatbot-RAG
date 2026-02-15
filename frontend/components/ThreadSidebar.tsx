/**
 * ThreadSidebar.tsx
 *
 * Left sidebar showing list of chat threads.
 * Features:
 *  - Create new thread (button in list)
 *  - Switch between threads
 *  - Delete/rename thread
 *  - Collapsible (shows only icons when collapsed)
 *  - Representative icon per thread
 */

import React from "react";

export interface Thread {
  id: string;
  title: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  threads: Thread[];
  activeThreadId: string | null;
  collapsed: boolean;
  mobileOpen?: boolean;
  onToggleCollapse: () => void;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newTitle: string) => void;
  onChangeIcon: (threadId: string, newIcon: string) => void;
}

const THREAD_ICONS = ["💬", "📝", "🔍", "💡", "📊", "🎯", "📚", "🧪", "⚡", "🌟"];

const ThreadSidebar: React.FC<Props> = ({
  threads,
  activeThreadId,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
  onRenameThread,
  onChangeIcon,
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const [iconPickerId, setIconPickerId] = React.useState<string | null>(null);

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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
    const time = date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${day}, ${time}`;
  };

  return (
    <aside className={`thread-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-header">
        {!collapsed && <h3>💬 Threads</h3>}
        <button
          className="collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <span className="material-symbols-outlined">
            {collapsed ? "right_panel_open" : "left_panel_close"}
          </span>
        </button>
      </div>

      <div className="thread-list">
        {/* New Thread Button */}
        <button
          className={`new-thread-btn ${collapsed ? "collapsed" : ""}`}
          onClick={onCreateThread}
          title="New Thread"
        >
          <span className="material-symbols-outlined">add</span>
          {!collapsed && <span>New Chat</span>}
        </button>

        {threads.length === 0 && !collapsed ? (
          <p className="empty-state">No threads yet</p>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              className={`thread-item ${activeThreadId === thread.id ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
              onClick={() => onSelectThread(thread.id)}
              title={collapsed ? thread.title : undefined}
            >
              {collapsed ? (
                <span
                  className="thread-icon-only"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIconPickerId(iconPickerId === thread.id ? null : thread.id);
                  }}
                >
                  {thread.icon}
                </span>
              ) : editingId === thread.id ? (
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
                  <span
                    className="thread-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIconPickerId(iconPickerId === thread.id ? null : thread.id);
                    }}
                    title="Change icon"
                  >
                    {thread.icon}
                  </span>
                  <div className="thread-info">
                    <span className="thread-title">{thread.title}</span>
                    <span className="thread-date">{formatDateTime(thread.updatedAt)}</span>
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
                      <span className="material-symbols-outlined">edit</span>
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
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </>
              )}

              {/* Icon Picker */}
              {iconPickerId === thread.id && (
                <div className="icon-picker" onClick={(e) => e.stopPropagation()}>
                  {THREAD_ICONS.map((icon) => (
                    <button
                      key={icon}
                      className={`icon-option ${thread.icon === icon ? "selected" : ""}`}
                      onClick={() => {
                        onChangeIcon(thread.id, icon);
                        setIconPickerId(null);
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default ThreadSidebar;
