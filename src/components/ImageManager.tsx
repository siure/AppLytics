'use client';

import { useState, useRef, useCallback } from 'react';
import type { UploadedImage } from '@/app/page';

interface ImageManagerProps {
  images: UploadedImage[];
  onUpload: (files: FileList) => void;
  onRename: (id: string, newFilename: string) => void;
  onDelete: (id: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageManager({
  images,
  onUpload,
  onRename,
  onDelete,
}: ImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onUpload(e.target.files);
        e.target.value = ''; // Reset input
      }
    },
    [onUpload]
  );

  const startEditing = useCallback((image: UploadedImage) => {
    setEditingId(image.id);
    setEditValue(image.filename);
  }, []);

  const finishEditing = useCallback(() => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  }, [editingId, editValue, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        finishEditing();
      } else if (e.key === 'Escape') {
        setEditingId(null);
        setEditValue('');
      }
    },
    [finishEditing]
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-foreground">
            Images{' '}
            {images.length > 0 && (
              <span className="text-muted-foreground">({images.length})</span>
            )}
          </span>
        </div>
        <button
          onClick={handleUploadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Image Grid */}
      {images.length === 0 ? (
        <div
          onClick={handleUploadClick}
          className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-emerald-500/10 transition-colors">
            <svg
              className="w-6 h-6 text-muted-foreground group-hover:text-emerald-500 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground group-hover:text-foreground">
            Click to upload images
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            JPG, PNG, GIF, WebP supported
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group bg-muted/40 rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-colors"
            >
              {/* Thumbnail */}
              <div
                className="aspect-square cursor-pointer relative overflow-hidden"
                onClick={() => setPreviewImage(image)}
              >
                <img
                  src={`data:${image.mimeType};base64,${image.data}`}
                  alt={image.filename}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white/80"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </div>
              </div>

              {/* Info Footer */}
              <div className="p-2">
                {editingId === image.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="w-full px-2 py-1 text-xs bg-background border border-primary rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <div
                    className="flex items-center gap-1 cursor-pointer group/filename"
                    onClick={() => startEditing(image)}
                    title="Click to rename"
                  >
                    <span className="text-xs text-foreground truncate flex-1 group-hover/filename:text-primary transition-colors">
                      {image.filename}
                    </span>
                    <svg
                      className="w-3 h-3 text-muted-foreground opacity-0 group-hover/filename:opacity-100 transition-opacity shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </div>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {formatFileSize(image.size)}
                  </span>
                  <button
                    onClick={() => onDelete(image.id)}
                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    title="Delete image"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usage hint */}
      {images.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
          <svg
            className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-xs text-muted-foreground">
            <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-1">
              Use in LaTeX:
            </p>
            <code className="px-1.5 py-0.5 bg-muted rounded text-emerald-600 dark:text-emerald-400 font-mono">
              \includegraphics[width=3cm]{'{images[0].filename}'}
            </code>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-2 -right-2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <img
              src={`data:${previewImage.mimeType};base64,${previewImage.data}`}
              alt={previewImage.filename}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="mt-3 text-center">
              <p className="text-white font-medium">{previewImage.filename}</p>
              <p className="text-gray-400 text-sm">
                {formatFileSize(previewImage.size)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
