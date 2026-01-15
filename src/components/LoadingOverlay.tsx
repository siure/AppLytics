'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, Zap, RefreshCw } from 'lucide-react';

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
      <Card className="max-w-md w-full mx-4 shadow-2xl">
        <CardContent className="p-8 text-center">
          {/* Spinner */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin"></div>
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isCompiling ? (
                <FileText className="w-6 h-6 text-primary" />
              ) : (
                <Zap className="w-6 h-6 text-primary" />
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
                <RefreshCw className="w-4 h-4 text-amber-500" />
                <span>Attempt {attempt.current} of {attempt.max}</span>
              </div>
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2">
                {Array.from({ length: attempt.max }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${i < attempt.current
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
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Compiling LaTeX to PDF</span>
            </div>
          )}

          {/* Subtle hint */}
          <p className="mt-6 text-xs text-muted-foreground">
            This may take a moment...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
