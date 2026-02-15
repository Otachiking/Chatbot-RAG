/**
 * RecommendCard.tsx
 *
 * Shown after a successful upload.  Offers quick-action buttons
 * ("Summarize", "Generate Quiz") that call the backend stub.
 *
 * TODO: Add more recommended actions as the product evolves
 * (e.g., "Extract key terms", "Generate flashcards").
 */

import React from "react";

interface Props {
  filename: string;
  pages: number;
  onAction: (type: "summarize" | "quiz") => void;
  disabled?: boolean;
}

const RecommendCard: React.FC<Props> = ({
  filename,
  pages,
  onAction,
  disabled,
}) => (
  <div className="recommend-card">
    <h3>✨ Document Ready</h3>
    <p>
      <span className="filename">{filename}</span>
      ({pages} pages) has been processed. Try one of the recommended actions below:
    </p>
    <div className="actions">
      <button
        className="btn btn-primary btn-sm"
        disabled={disabled}
        onClick={() => onAction("summarize")}
      >
        📝 Summarize
      </button>
      <button
        className="btn btn-outline btn-sm"
        disabled={disabled}
        onClick={() => onAction("quiz")}
      >
        🧩 Generate Quiz
      </button>
    </div>
  </div>
);

export default RecommendCard;
