'use client';

import { useState } from 'react';
import ExpandModal from './ExpandModal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings2, Maximize2 } from 'lucide-react';

interface CustomInstructionsProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CustomInstructions({ value, onChange }: CustomInstructionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div className="flex flex-col h-full gap-3">
        <div className="flex items-center justify-between shrink-0">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="w-4 h-4 text-primary" />
            Custom Instructions
            <Badge variant="secondary" className="text-xs font-normal">
              Optional
            </Badge>
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
          placeholder="Add any specific instructions for the AI... For example: 'Emphasize my Python experience', 'Keep the resume to one page', 'Focus on leadership roles'"
          className="flex-1 min-h-0 resize-none"
        />
      </div>

      <ExpandModal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title="Custom Instructions"
        icon={<Settings2 className="w-5 h-5" />}
        iconColorClass="bg-primary/10 text-primary"
        value={value}
        onChange={onChange}
        placeholder="Add any specific instructions for the AI... For example: 'Emphasize my Python experience', 'Keep the resume to one page', 'Focus on leadership roles'"
      />
    </>
  );
}
