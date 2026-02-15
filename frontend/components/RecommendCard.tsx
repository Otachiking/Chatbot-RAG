/**
 * RecommendCard.tsx
 *
 * Floating banner shown after a successful upload.
 * Compact design with truncated filename and two action buttons.
 */

import React from "react";

interface Props {
  filename: string;
  onAction: (type: "summarize" | "quiz") => void;
  onDismiss: () => void;
  disabled?: boolean;
}

const RecommendCard: React.FC<Props> = ({
  filename,
  onAction,
  onDismiss,
  disabled,
}) => {
  // Truncate filename if too long
  const truncatedName = filename.length > 25
    ? filename.slice(0, 22) + "..."
    : filename;

  return (
    <div className="recommend-banner">
      <div className="banner-info">
        <span className="banner-icon">✨</span>
        <span className="banner-text">Ready</span>
        <span className="banner-filename" title={filename}>{truncatedName}</span>
      </div>
      <div className="banner-actions">
        <button
          className="btn btn-primary btn-sm"
          disabled={disabled}
          onClick={() => onAction("summarize")}
        >
          📝 Summarize
        </button>
        <button
          className="btn btn-primary btn-sm"
          disabled={disabled}
          onClick={() => onAction("quiz")}
        >
          🧩 Quiz
        </button>
      </div>
      <button
        className="banner-close"
        onClick={onDismiss}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
};

export default RecommendCard;
