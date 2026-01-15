'use client';

import { useState } from 'react';
import ExpandModal from './ExpandModal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Briefcase, Maximize2 } from 'lucide-react';

interface JobOfferInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function JobOfferInput({ value, onChange }: JobOfferInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div className="flex flex-col h-full gap-3">
        <div className="flex items-center justify-between shrink-0">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Briefcase className="w-4 h-4 text-primary" />
            Job Description
          </Label>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsExpanded(true)}
            title="Expand"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste the job offer description here... Include the job title, requirements, responsibilities, and any other relevant details."
          className="flex-1 min-h-0 resize-none"
        />
      </div>

      <ExpandModal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title="Job Description"
        icon={<Briefcase className="w-5 h-5" />}
        iconColorClass="bg-primary/10 text-primary"
        value={value}
        onChange={onChange}
        placeholder="Paste the job offer description here... Include the job title, requirements, responsibilities, and any other relevant details."
      />
    </>
  );
}
