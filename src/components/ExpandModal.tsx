'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import LaTeXEditor from './LaTeXEditor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { X } from 'lucide-react';

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
      <Card className="relative w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b shrink-0 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${iconColorClass}`}>
              {icon}
            </div>
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 p-4 min-h-0">
          {useCodeEditor ? (
            <div className="w-full h-full rounded-xl overflow-hidden border border-input">
              <LaTeXEditor
                value={value}
                onChange={onChange}
                placeholder={placeholder}
              />
            </div>
          ) : (
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={`w-full h-full resize-none ${isMonospace ? 'font-mono text-xs' : 'text-sm'
                }`}
              spellCheck={!isMonospace}
            />
          )}
        </CardContent>

        {/* Footer */}
        <CardFooter className="flex items-center justify-between px-4 py-3 border-t shrink-0 bg-muted/30">
          <span className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono border border-border">Esc</kbd> to close
          </span>
          <Button onClick={onClose}>
            Done
          </Button>
        </CardFooter>
      </Card>
    </div>
  );

  // Render modal at document body level using portal
  return createPortal(modalContent, document.body);
}
