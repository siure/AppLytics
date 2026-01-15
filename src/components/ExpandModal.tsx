'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import LaTeXEditor from './LaTeXEditor';

interface ExpandModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  iconColorClass: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isMonospace?: boolean;
  useCodeEditor?: boolean;
}

export default function ExpandModal({
  isOpen,
  onClose,
  title,
  icon,
  iconColorClass,
  value,
  onChange,
  placeholder,
  isMonospace = false,
  useCodeEditor = false,
}: ExpandModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);

  // Only render portal on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(value.length, value.length);
    }
  }, [isOpen, value.length]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl h-[80vh] flex flex-col clean-panel rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${iconColorClass}`}>
              {icon}
            </div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 min-h-0">
          {useCodeEditor ? (
            <div className="clean-input w-full h-full rounded-xl overflow-hidden border border-input">
              <LaTeXEditor
                value={value}
                onChange={onChange}
                placeholder={placeholder}
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={`clean-input w-full h-full p-4 rounded-xl text-foreground leading-relaxed resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 ${
                isMonospace ? 'font-mono text-xs' : 'text-sm'
              }`}
              spellCheck={!isMonospace}
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0 bg-muted/30">
          <span className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground font-mono border border-border">Esc</kbd> to close
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  // Render modal at document body level using portal
  return createPortal(modalContent, document.body);
}
