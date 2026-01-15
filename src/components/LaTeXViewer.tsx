'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import LaTeXEditor from './LaTeXEditor';
import ImageManager from './ImageManager';
import type { UploadedImage } from '@/app/page';

type AppMode = 'initial' | 'chat';
type ViewMode = 'code' | 'preview' | 'original' | 'images';

interface LaTeXViewerProps {
  value: string;
  onChange: (value: string) => void;
  mode?: AppMode;
  originalPdfUrl?: string | null;
  uploadedImages?: UploadedImage[];
  onImageUpload?: (files: FileList) => void;
  onImageRename?: (id: string, newFilename: string) => void;
  onImageDelete?: (id: string) => void;
}

export default function LaTeXViewer({ 
  value, 
  onChange, 
  mode = 'initial', 
  originalPdfUrl,
  uploadedImages = [],
  onImageUpload,
  onImageRename,
  onImageDelete,
}: LaTeXViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  const [copied, setCopied] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; logs: string } | null>(null);
  
  // Track if content has been modified since last compile
  const [isModified, setIsModified] = useState(false);
  // Track which content was last compiled
  const [lastCompiledLatex, setLastCompiledLatex] = useState('');
  // Track the previous value to detect AI updates
  const prevValueRef = useRef(value);

  // Detect when AI updates the content (external change)
  useEffect(() => {
    if (value !== prevValueRef.current) {
      // Content changed externally (from AI)
      prevValueRef.current = value;
      // Reset PDF to force recompile with new content
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setLastCompiledLatex('');
      setIsModified(false);
      setError(null);
    }
  }, [value, pdfUrl]);

  // Handle user editing
  const handleLatexChange = useCallback((newValue: string) => {
    onChange(newValue);
    prevValueRef.current = newValue;
    setIsModified(newValue !== lastCompiledLatex && lastCompiledLatex !== '');
  }, [onChange, lastCompiledLatex]);

  const handleCopy = useCallback(() => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  const openInOverleaf = useCallback(() => {
    if (!value) return;
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.overleaf.com/docs';
    form.target = '_blank';
    
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'snip';
    input.value = value;
    
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }, [value]);

  const compileLatex = useCallback(async () => {
    if (!value.trim()) {
      setError({ message: 'No LaTeX code to compile', logs: '' });
      return;
    }

    setIsCompiling(true);
    setError(null);
    
    // Revoke previous PDF URL to free memory
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    try {
      const response = await fetch('/api/compile-latex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          latex: value,
          images: uploadedImages.length > 0 ? uploadedImages : undefined,
        }),
      });

      if (response.ok) {
        const pdfBlob = await response.blob();
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setLastCompiledLatex(value);
        setIsModified(false);
      } else {
        const errorData = await response.json();
        setError({
          message: errorData.error || 'Compilation failed',
          logs: errorData.logs || '',
        });
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to compile',
        logs: '',
      });
    } finally {
      setIsCompiling(false);
    }
  }, [value, pdfUrl, uploadedImages]);

  // Auto-compile when switching to preview mode (only if not already compiled)
  useEffect(() => {
    if (viewMode === 'preview' && value && !pdfUrl && !isCompiling && !error) {
      compileLatex();
    }
  }, [viewMode, value, pdfUrl, isCompiling, error, compileLatex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (value) {
      const blob = new Blob([value], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.tex';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [value]);

  return (
    <div className="flex flex-col h-full clean-panel rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">LaTeX Resume</h3>
              {/* Modified indicator */}
              {isModified && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-600 font-medium">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                  Modified
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {value ? 'Editable' : 'Paste your LaTeX code'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-muted rounded-lg p-1 border border-border">
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'code'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'preview'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              Preview
            </button>
            {/* Images tab */}
            <button
              onClick={() => setViewMode('images')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'images'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Images
              {uploadedImages.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-muted-foreground/10 text-muted-foreground rounded-full">
                  {uploadedImages.length}
                </span>
              )}
            </button>
            {/* Original tab - only visible in chat mode when original PDF is available */}
            {mode === 'chat' && originalPdfUrl && (
              <button
                onClick={() => setViewMode('original')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'original'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                Original
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-border mx-1"></div>

          {/* Compile Button - Always visible when there's content */}
          {value && (
            <>
              <button
                onClick={() => {
                  setViewMode('preview');
                  // Clear existing PDF to force recompile
                  if (pdfUrl) {
                    URL.revokeObjectURL(pdfUrl);
                    setPdfUrl(null);
                  }
                  setError(null);
                }}
                disabled={isCompiling}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  isModified
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isModified ? 'Compile to see your changes' : 'Compile PDF'}
              >
                <svg className={`w-4 h-4 ${isCompiling ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isCompiling ? 'Compiling...' : isModified ? 'Recompile' : 'Compile'}
              </button>
              <div className="h-6 w-px bg-border mx-1"></div>
            </>
          )}

          {/* Action Buttons */}
          <button
            onClick={handleCopy}
            disabled={!value}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed group relative"
            title="Copy to clipboard"
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          <button
            onClick={handleDownload}
            disabled={!value}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed group relative"
            title="Download .tex file"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-muted/20 relative">
        {/* LaTeX Editor - Always mounted to preserve cursor position, hidden when not active */}
        <div className={`h-full overflow-hidden ${viewMode === 'code' ? '' : 'hidden'}`}>
          <LaTeXEditor
            value={value}
            onChange={handleLatexChange}
            placeholder="Paste your LaTeX resume code here..."
          />
        </div>
        
        {viewMode === 'images' && (
          <div className="h-full overflow-auto p-4">
            <ImageManager
              images={uploadedImages}
              onUpload={onImageUpload || (() => {})}
              onRename={onImageRename || (() => {})}
              onDelete={onImageDelete || (() => {})}
            />
          </div>
        )}
        
        {viewMode === 'original' && originalPdfUrl && (
          /* Original PDF View */
          <div className="h-full relative">
            {/* Original badge */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-full shadow-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Original Resume (before AI modifications)
            </div>
            <iframe
              src={originalPdfUrl}
              className="w-full h-full border-0"
              title="Original PDF Preview"
            />
          </div>
        )}
        
        {viewMode === 'preview' && (
          <div className="h-full relative">
            {!value ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                  <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="font-medium">Paste LaTeX code to preview</p>
              </div>
            ) : isCompiling ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-primary font-medium">Compiling LaTeX...</p>
                  <p className="text-muted-foreground text-sm mt-2">This may take a moment for first-time package downloads</p>
                </div>
              </div>
            ) : error ? (
              <div className="h-full overflow-auto p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 backdrop-blur-sm mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 shrink-0 bg-destructive/20 rounded-full flex items-center justify-center text-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground mb-1">Compilation Failed</h3>
                        <p className="text-muted-foreground text-sm">{error.message}</p>
                      </div>
                    </div>
                  </div>

                  {error.logs && (
                    <div className="bg-muted border border-border rounded-xl p-4 mb-4">
                      <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Compilation Logs
                      </h4>
                      <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words max-h-64 overflow-auto">
                        {error.logs}
                      </pre>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={compileLatex}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry Compilation
                    </button>
                    <button
                      onClick={openInOverleaf}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 3H3v18h18V3zM10.5 16.5l-4.5-4.5 1.5-1.5 3 3 5-5 1.5 1.5-6.5 6.5z"/>
                      </svg>
                      Try in Overleaf
                    </button>
                  </div>
                </div>
              </div>
            ) : pdfUrl ? (
              <>
                {/* Modified indicator overlay */}
                {isModified && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-amber-500/90 text-white text-sm font-medium rounded-full shadow-lg">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    Code modified - click Recompile to update preview
                  </div>
                )}
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
