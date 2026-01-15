'use client';

import { Provider, providers } from '@/lib/models';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Server } from 'lucide-react';

interface ProviderSelectorProps {
  value: Provider;
  onChange: (provider: Provider) => void;
}

export default function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <Label className="flex items-center gap-2 text-sm font-semibold">
        <Server className="w-4 h-4 text-primary" />
        AI Provider
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12">
          <SelectValue placeholder="Select a provider" />
        </SelectTrigger>
        <SelectContent>
          {providers.map((provider) => (
            <SelectItem key={provider.id} value={provider.id}>
              {provider.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
