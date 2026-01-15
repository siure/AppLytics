'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Pencil, Zap } from 'lucide-react';

interface OverflowChoiceModalProps {
  isOpen: boolean;
  overflowPercentage: number;
  onFixManually: () => void;
  onLetAIFix: () => void;
}

export default function OverflowChoiceModal({
  isOpen,
  overflowPercentage,
  onFixManually,
  onLetAIFix,
}: OverflowChoiceModalProps) {
  const [mounted, setMounted] = useState(false);

  // Only render portal on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key - default to manual fix
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onFixManually();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onFixManually]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onFixManually}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header with warning icon */}
        <CardHeader className="flex flex-col items-center pt-6 pb-4 px-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 mb-4">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-center">Small Overflow Detected</h2>
          <p className="text-muted-foreground text-sm text-center mt-2">
            Your resume is only <span className="text-amber-500 font-semibold">~{overflowPercentage}%</span> over one page.
          </p>
        </CardHeader>

        {/* Content */}
        <CardContent className="px-6 pb-4">
          <p className="text-sm text-center leading-relaxed">
            This small overflow can often be fixed with minor manual adjustments like reducing margins,
            shortening a few bullet points, or adjusting font sizes.
          </p>

          {/* Question */}
          <p className="text-center font-medium mt-4">
            Would you like to fix it yourself or let AI condense the content?
          </p>
        </CardContent>

        {/* Buttons */}
        <CardFooter className="flex flex-col gap-3 px-6 pb-6">
          <Button
            onClick={onFixManually}
            className="w-full h-12 font-semibold shadow-md"
            size="lg"
          >
            <Pencil className="w-5 h-5 mr-2" />
            I&apos;ll Fix It Myself
          </Button>

          <Button
            onClick={onLetAIFix}
            variant="outline"
            className="w-full h-12 font-medium"
            size="lg"
          >
            <Zap className="w-5 h-5 mr-2" />
            Let AI Condense It
          </Button>
        </CardFooter>

        {/* Footer hint */}
        <div className="px-6 pb-4 border-t pt-3">
          <p className="text-xs text-muted-foreground text-center">
            <span className="text-muted-foreground/70">Tip:</span> Manual fixes preserve your exact wording while AI may rephrase content.
          </p>
        </div>
      </Card>
    </div>
  );

  // Render modal at document body level using portal
  return createPortal(modalContent, document.body);
}
