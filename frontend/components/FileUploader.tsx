/**
 * FileUploader.tsx
 *
 * Drag-and-drop + file-picker component with:
 *  - Visual drop-zone with hover highlight
 *  - Animated progress bar during upload
 *  - Uploaded file preview (name, size, pages)
 *  - Image preview for uploaded images
 *  - Filename overflow handled with horizontal scroll
 *
 * Calls POST /api/upload on the backend.
 * Supports PDF and image files (.pdf, .png, .jpg, .jpeg).
 */

import React, { useCallback, useRef, useState } from "react";

// ---- Types ----------------------------------------------------------------

export interface UploadResult {
  file_id: string;
  filename: string;
  pages: number;
  chunks_indexed: number;
  type: "pdf" | "image";
  recommended_actions: string[];
}

interface Props {
  backendUrl: string;
  onUploadComplete: (result: UploadResult) => void;
  onError: (message: string) => void;
}

// ---- Component -------------------------------------------------------------

const FileUploader: React.FC<Props> = ({
  backendUrl,
  onUploadComplete,
  onError,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    pages?: number;
    type?: string;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"pdf" | "image">("pdf");
  const inputRef = useRef<HTMLInputElement>(null);

  // -- Upload logic ----------------------------------------------------------

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setProgress(0);
      setUploadedFile(null);

      // Create client-side preview URL
      const objUrl = URL.createObjectURL(file);
      const isImage = file.type.startsWith("image/");
      setPreviewUrl(objUrl);
      setPreviewType(isImage ? "image" : "pdf");

      // Simulate progress animation while the real request is in-flight.
      // The backend stub sleeps ~1 s so we animate from 0 → 90 % over 800 ms
      // and jump to 100 % on completion.
      const interval = setInterval(() => {
        setProgress((p) => (p < 90 ? p + Math.random() * 12 : p));
      }, 120);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${backendUrl}/api/upload`, {
          method: "POST",
          body: formData,
        });

        clearInterval(interval);

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data: UploadResult = await res.json();
        setProgress(100);
        setUploadedFile({ name: file.name, size: file.size, pages: data.pages, type: data.type });

        // Let the parent know
        setTimeout(() => onUploadComplete(data), 400);
      } catch (err: any) {
        clearInterval(interval);
        setProgress(0);
        onError(
          err?.message?.includes("fetch")
            ? "Server unavailable — try again"
            : err?.message || "Upload failed"
        );
      } finally {
        setUploading(false);
      }
    },
    [backendUrl, onUploadComplete, onError]
  );

  // -- Drag & Drop handlers --------------------------------------------------

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const onPickFile = () => inputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  // -- Render ----------------------------------------------------------------

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div>
      <h3 style={{ fontSize: ".88rem", marginBottom: 10, fontWeight: 700 }}>
        Upload Document
      </h3>

      {/* Hidden native file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      {/* Drop zone */}
      <div
        className={`dropzone${dragOver ? " drag-over" : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onPickFile}
      >
        <div className="icon">📄</div>
        <p>
          <strong>Drag &amp; drop</strong> a PDF or image here, or{" "}
          <span style={{ color: "var(--primary)", textDecoration: "underline" }}>
            choose file
          </span>
        </p>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      {/* File preview after successful upload */}
      {uploadedFile && (
        <div className="file-preview">
          <span className="icon">✅</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span className="file-name-scroll">{uploadedFile.name}</span>
            {formatSize(uploadedFile.size)}
            {uploadedFile.pages != null && ` · ${uploadedFile.pages} pages`}
            {uploadedFile.type && ` · ${uploadedFile.type.toUpperCase()}`}
          </div>
        </div>
      )}

      {/* Image preview */}
      {previewUrl && previewType === "image" && uploadedFile && (
        <img
          src={previewUrl}
          alt="Uploaded preview"
          className="image-preview"
        />
      )}

      {/* PDF embed preview */}
      {previewUrl && previewType === "pdf" && uploadedFile && (
        <iframe
          src={previewUrl}
          title="PDF preview"
          className="pdf-preview"
        />
      )}
    </div>
  );
};

export default FileUploader;
