'use client';

import { useState } from 'react';
import ExpandModal from './ExpandModal';

interface JobOfferInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function JobOfferInput({ value, onChange }: JobOfferInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Job Description
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
          placeholder="Paste the job offer description here... Include the job title, requirements, responsibilities, and any other relevant details."
          className="clean-input w-full flex-1 min-h-0 p-4 rounded-xl text-foreground text-sm leading-relaxed resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <ExpandModal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title="Job Description"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
        iconColorClass="bg-emerald-500/10 text-emerald-500"
        value={value}
        onChange={onChange}
        placeholder="Paste the job offer description here... Include the job title, requirements, responsibilities, and any other relevant details."
      />
    </>
  );
}
