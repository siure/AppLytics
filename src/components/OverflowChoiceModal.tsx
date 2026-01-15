'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
      <div className="relative w-full max-w-md flex flex-col clean-panel rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header with warning icon */}
        <div className="flex flex-col items-center pt-6 pb-4 px-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 mb-4">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground text-center">Small Overflow Detected</h2>
          <p className="text-muted-foreground text-sm text-center mt-2">
            Your resume is only <span className="text-amber-500 font-semibold">~{overflowPercentage}%</span> over one page.
          </p>
        </div>
        
        {/* Content */}
        <div className="px-6 pb-4">
          <p className="text-foreground text-sm text-center leading-relaxed">
            This small overflow can often be fixed with minor manual adjustments like reducing margins, 
            shortening a few bullet points, or adjusting font sizes.
          </p>
        </div>
        
        {/* Question */}
        <div className="px-6 pb-4">
          <p className="text-foreground text-center font-medium">
            Would you like to fix it yourself or let AI condense the content?
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex flex-col gap-3 px-6 pb-6">
          <button
            onClick={onFixManually}
            className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            I&apos;ll Fix It Myself
          </button>
          
          <button
            onClick={onLetAIFix}
            className="w-full py-3 px-4 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Let AI Condense It
          </button>
        </div>
        
        {/* Footer hint */}
        <div className="px-6 pb-4 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground text-center">
            <span className="text-muted-foreground/70">Tip:</span> Manual fixes preserve your exact wording while AI may rephrase content.
          </p>
        </div>
      </div>
    </div>
  );

  // Render modal at document body level using portal
  return createPortal(modalContent, document.body);
}
