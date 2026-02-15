/**
 * SourcesPanel.tsx
 *
 * Right panel showing uploaded documents (sources).
 * Features:
 *  - List all uploaded documents
 *  - Checkbox to enable/disable each source for RAG
 *  - Click to preview document
 *  - Delete source
 *  - Collapsible (shows only icons when collapsed)
 */

import React from "react";

export interface Source {
  file_id: string;
  filename: string;
  pages: number;
  chunks_indexed: number;
  type: "pdf" | "image";
  uploadedAt: string;
  enabled: boolean;
}

interface Props {
  sources: Source[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleSource: (fileId: string) => void;
  onToggleAll: (enabled: boolean) => void;
  onDeleteSource: (fileId: string) => void;
  onPreviewSource: (source: Source) => void;
  uploadComponent: React.ReactNode;
}

const SourcesPanel: React.FC<Props> = ({
  sources,
  collapsed,
  onToggleCollapse,
  onToggleSource,
  onToggleAll,
  onDeleteSource,
  onPreviewSource,
  uploadComponent,
}) => {
  const enabledCount = sources.filter((s) => s.enabled).length;
  const allEnabled = sources.length > 0 && enabledCount === sources.length;

  const handleSelectAll = () => {
    onToggleAll(!allEnabled);
  };

  return (
    <aside className={`sources-panel ${collapsed ? "collapsed" : ""}`}>
      <div className="panel-header">
        {!collapsed && <h3>📚 Sources</h3>}
        <button
          className="collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <span className="material-symbols-outlined">
            {collapsed ? "left_panel_open" : "right_panel_close"}
          </span>
        </button>
      </div>

      {/* File uploader - only when expanded */}
      {!collapsed && (
        <div className="upload-section">
          {uploadComponent}
        </div>
      )}

      {sources.length > 0 && !collapsed && (
        <div className="sources-controls">
          <label className="select-all">
            <input
              type="checkbox"
              checked={allEnabled}
              onChange={handleSelectAll}
            />
            <span>Select all</span>
          </label>
        </div>
      )}

      <div className="sources-list">
        {sources.length === 0 && !collapsed ? (
          <div className="empty-state">
            <p>No sources yet.</p>
            <p className="hint">Upload PDF or images to get started.</p>
          </div>
        ) : (
          sources.map((source) => (
            <div
              key={source.file_id}
              className={`source-item ${source.enabled ? "enabled" : "disabled"} ${collapsed ? "collapsed" : ""}`}
              title={collapsed ? source.filename : undefined}
            >
              {collapsed ? (
                <span
                  className="source-icon-only"
                  onClick={() => onPreviewSource(source)}
                >
                  {source.type === "pdf" ? "📄" : "🖼️"}
                </span>
              ) : (
                <>
                  <label className="source-checkbox">
                    <input
                      type="checkbox"
                      checked={source.enabled}
                      onChange={() => onToggleSource(source.file_id)}
                    />
                  </label>
                  <div
                    className="source-info"
                    onClick={() => onPreviewSource(source)}
                    title="Click to preview"
                  >
                    <span className="source-icon">
                      {source.type === "pdf" ? "📄" : "🖼️"}
                    </span>
                    <div className="source-details">
                      <span className="source-name">{source.filename}</span>
                      <span className="source-meta">
                        {source.pages} pages • {source.chunks_indexed} chunks
                      </span>
                    </div>
                  </div>
                  <button
                    className="icon-btn danger"
                    onClick={() => {
                      if (confirm(`Delete "${source.filename}"?`)) {
                        onDeleteSource(source.file_id);
                      }
                    }}
                    title="Delete"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default SourcesPanel;
