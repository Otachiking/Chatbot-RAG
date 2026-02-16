/**
 * SourcesPanel.tsx
 *
 * Right panel showing uploaded documents (sources).
 * Features:
 *  - Upload Document section at top (drag & drop)
 *  - List all uploaded documents with file-type icons
 *  - Checkbox on right to enable/disable each source for RAG
 *  - Delete button on far right
 *  - Click filename to preview document
 *  - Collapsible (shows only icons when collapsed)
 */

import React, { useEffect, useState } from "react";

export interface Source {
  file_id: string;
  filename: string;
  pages: number;
  chunks_indexed: number;
  type: "pdf" | "image";
  uploadedAt: string;
  enabled: boolean;
  preview_url?: string;
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

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "📄",
  image: "🖼️",
};

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
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileOrTablet(window.innerWidth <= 860);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const isCollapsed = collapsed && !isMobileOrTablet;
  const enabledCount = sources.filter((s) => s.enabled).length;
  const allEnabled = sources.length > 0 && enabledCount === sources.length;

  const handleSelectAll = () => {
    onToggleAll(!allEnabled);
  };

  const getFileIcon = (type: string) => FILE_TYPE_ICONS[type] || "📄";

  return (
    <aside className={`sources-panel ${isCollapsed ? "collapsed" : ""}`}>
      <div className="panel-header">
        {!isCollapsed && <h3>📚 Sources</h3>}
        <button
          className="collapse-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          <span className="material-symbols-outlined">
            {isCollapsed ? "left_panel_open" : "right_panel_close"}
          </span>
        </button>
      </div>

      {/* File uploader - only when expanded */}
      {!isCollapsed && (
        <div className="upload-section">
          {uploadComponent}
        </div>
      )}

      {/* Source list */}
      <div className="sources-list">
        {sources.length === 0 && !isCollapsed ? (
          <div className="empty-state">
            <p>No sources yet.</p>
            <p className="hint">Upload PDF or images to get started.</p>
          </div>
        ) : (
          sources.map((source) => (
            <div
              key={source.file_id}
              className={`source-item ${source.enabled ? "enabled" : "disabled"} ${isCollapsed ? "collapsed" : ""}`}
              title={isCollapsed ? source.filename : undefined}
            >
              {isCollapsed ? (
                <span
                  className="source-icon-only"
                  onClick={() => onPreviewSource(source)}
                >
                  {getFileIcon(source.type)}
                </span>
              ) : (
                <>
                  <span className="source-type-icon">
                    {getFileIcon(source.type)}
                  </span>
                  <span
                    className="source-name-link"
                    onClick={() => onPreviewSource(source)}
                    title="Click to preview"
                  >
                    {source.filename}
                  </span>
                  <label className="source-checkbox-right">
                    <input
                      type="checkbox"
                      checked={source.enabled}
                      onChange={() => onToggleSource(source.file_id)}
                    />
                  </label>
                  <button
                    className="icon-btn danger source-delete-btn"
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
