'use client';

import { Provider, Model, getModelsByProvider } from '@/lib/models';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Monitor, Info } from 'lucide-react';

interface ModelSelectorProps {
  provider: Provider;
  value: string;
  onChange: (modelId: string) => void;
}

export default function ModelSelector({ provider, value, onChange }: ModelSelectorProps) {
  const availableModels = getModelsByProvider(provider);
  const selectedModel = availableModels.find((m) => m.id === value) || availableModels[0];

  return (
    <div className="flex flex-col gap-3">
      <Label className="flex items-center gap-2 text-sm font-semibold">
        <Monitor className="w-4 h-4 text-primary" />
        Model
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model: Model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedModel && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          {selectedModel.description}
        </p>
      )}
    </div>
  );
}
