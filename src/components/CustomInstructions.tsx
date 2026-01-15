'use client';

import { useState } from 'react';
import ExpandModal from './ExpandModal';

interface CustomInstructionsProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CustomInstructions({ value, onChange }: CustomInstructionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Custom Instructions
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">Optional</span>
          </label>
          <button
            onClick={() => setIsExpanded(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            title="Expand"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Add any specific instructions for the AI... For example: 'Emphasize my Python experience', 'Keep the resume to one page', 'Focus on leadership roles'"
          className="clean-input w-full flex-1 min-h-0 p-4 rounded-xl text-foreground text-sm leading-relaxed resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <ExpandModal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title="Custom Instructions"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        }
        iconColorClass="bg-purple-500/10 text-purple-500"
        value={value}
        onChange={onChange}
        placeholder="Add any specific instructions for the AI... For example: 'Emphasize my Python experience', 'Keep the resume to one page', 'Focus on leadership roles'"
      />
    </>
  );
}
