/**
 * PreviewModal.tsx
 *
 * Modal to preview uploaded documents.
 * Shows document title, metadata, and a back button.
 * Design follows NotebookLM-style preview.
 */

import React from "react";
import { Source } from "./SourcesPanel";

interface Props {
  source: Source | null;
  backendUrl: string;
  onClose: () => void;
}

const PreviewModal: React.FC<Props> = ({ source, backendUrl, onClose }) => {
  if (!source) return null;

  const uploadDate = new Date(source.uploadedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const previewPath = source.preview_url || `/api/files/${source.file_id}`;
  const previewUrl = `${backendUrl}${previewPath}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content preview-doc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Preview Document</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body preview-body">
          {source.type === "pdf" ? (
            <iframe
              src={previewUrl}
              className="pdf-preview-frame"
              title={`Preview ${source.filename}`}
            />
          ) : (
            <img
              src={previewUrl}
              alt={source.filename}
              className="image-preview-full"
            />
          )}

          {/* Full document name */}
          <h2 className="preview-doc-title">{source.filename}</h2>

          {/* Metadata table */}
          <div className="preview-meta-table">
            <div className="meta-row">
              <span className="meta-label">Type</span>
              <span className="meta-value">{source.type === "pdf" ? "PDF Document" : "Image File"}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Pages</span>
              <span className="meta-value">{source.pages}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Chunks Indexed</span>
              <span className="meta-value">{source.chunks_indexed}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Uploaded</span>
              <span className="meta-value">{uploadDate}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">RAG Status</span>
              <span className="meta-value">
                {source.enabled ? (
                  <span className="status-badge active">Active</span>
                ) : (
                  <span className="status-badge inactive">Disabled</span>
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
