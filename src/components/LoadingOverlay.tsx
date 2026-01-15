'use client';

interface LoadingOverlayProps {
  isVisible: boolean;
  status: string;
  attempt?: { current: number; max: number } | null;
  isCompiling?: boolean;
}

export default function LoadingOverlay({ 
  isVisible, 
  status, 
  attempt, 
  isCompiling 
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="clean-panel p-8 rounded-2xl max-w-md w-full mx-4 text-center shadow-2xl">
        {/* Spinner */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
          {/* Spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin"></div>
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isCompiling ? (
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
          </div>
        </div>

        {/* Status text */}
        <p className="text-foreground font-medium text-lg mb-2 transition-all duration-300">
          {status || 'Processing...'}
        </p>

        {/* Attempt indicator */}
        {attempt && (
          <div className="mt-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Attempt {attempt.current} of {attempt.max}</span>
            </div>
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: attempt.max }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i < attempt.current
                      ? 'bg-primary shadow-sm'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Compiling indicator */}
        {isCompiling && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>Compiling LaTeX to PDF</span>
          </div>
        )}

        {/* Subtle hint */}
        <p className="mt-6 text-xs text-muted-foreground">
          This may take a moment...
        </p>
      </div>
    </div>
  );
}
