/**
 * PreviewModal.tsx
 *
 * Modal to preview uploaded documents.
 * Shows PDF in iframe or image directly.
 */

import React from "react";
import { Source } from "./SourcesPanel";

interface Props {
  source: Source | null;
  onClose: () => void;
}

const PreviewModal: React.FC<Props> = ({ source, onClose }) => {
  if (!source) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{source.filename}</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="preview-placeholder">
            <span className="preview-icon">
              {source.type === "pdf" ? "📄" : "🖼️"}
            </span>
            <p className="preview-name">{source.filename}</p>
            <p className="preview-info">
              {source.type === "pdf" ? "PDF Document" : "Image File"}
            </p>
            <p className="preview-hint">
              Document preview will be available in a future update.
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <span className="preview-meta">
            {source.pages} pages • {source.chunks_indexed} chunks indexed
          </span>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
