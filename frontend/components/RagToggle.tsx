/**
 * RagToggle.tsx
 *
 * A toggle switch that controls whether chat queries use
 * document-based RAG retrieval or plain general chat.
 *
 * States:
 *  - No document uploaded  → toggle disabled, OFF
 *  - Document uploaded      → toggle auto-ON
 *  - User can flip it OFF   → general chat mode
 */

import React from "react";

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

const RagToggle: React.FC<Props> = ({ enabled, onChange, disabled }) => (
  <div className={`rag-toggle${disabled ? " rag-toggle--disabled" : ""}`}>
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="toggle-slider" />
    </label>
    <span className="toggle-label">
      Use document reference
    </span>
  </div>
);

export default RagToggle;
