/**
 * SourcesPanel.tsx
 *
 * Right panel showing uploaded documents (sources).
 * Features:
 *  - List all uploaded documents
 *  - Checkbox to enable/disable each source for RAG
 *  - Click to preview document
 *  - Delete source
 *  - Sources are shared across threads
 */

import React from "react";

export interface Source {
  file_id: string;
  filename: string;
  pages: number;
  chunks_indexed: number;
  type: "pdf" | "image";
  uploadedAt: string;
  enabled: boolean;  // Whether to use in RAG
}

interface Props {
  sources: Source[];
  onToggleSource: (fileId: string) => void;
  onToggleAll: (enabled: boolean) => void;
  onDeleteSource: (fileId: string) => void;
  onPreviewSource: (source: Source) => void;
  uploadComponent: React.ReactNode;
}

const SourcesPanel: React.FC<Props> = ({
  sources,
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
    <aside className="sources-panel">
      <div className="panel-header">
        <h3>📚 Sources</h3>
      </div>

      {/* File uploader component */}
      <div className="upload-section">
        {uploadComponent}
      </div>

      {sources.length > 0 && (
        <div className="sources-controls">
          <label className="select-all">
            <input
              type="checkbox"
              checked={allEnabled}
              onChange={handleSelectAll}
            />
            <span>Select all ({enabledCount}/{sources.length})</span>
          </label>
        </div>
      )}

      <div className="sources-list">
        {sources.length === 0 ? (
          <div className="empty-state">
            <p>No sources yet.</p>
            <p className="hint">Upload PDF or images to get started.</p>
          </div>
        ) : (
          sources.map((source) => (
            <div
              key={source.file_id}
              className={`source-item ${source.enabled ? "enabled" : "disabled"}`}
            >
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
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {sources.length > 0 && enabledCount > 0 && (
        <div className="sources-status">
          ✅ {enabledCount} source{enabledCount > 1 ? "s" : ""} active for RAG
        </div>
      )}
    </aside>
  );
};

export default SourcesPanel;
