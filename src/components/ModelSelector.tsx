'use client';

import { Provider, Model, getModelsByProvider } from '@/lib/models';

interface ModelSelectorProps {
  provider: Provider;
  value: string;
  onChange: (modelId: string) => void;
}

export default function ModelSelector({ provider, value, onChange }: ModelSelectorProps) {
  const availableModels = getModelsByProvider(provider);
  const selectedModel = availableModels.find((m) => m.id === value) || availableModels[0];

  return (
    <div className="flex flex-col">
      <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Model
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="clean-input w-full p-4 pr-12 rounded-xl text-foreground text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20"
        >
          {availableModels.map((model: Model) => (
            <option key={model.id} value={model.id} className="bg-background text-foreground">
              {model.name}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {selectedModel && (
        <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {selectedModel.description}
        </p>
      )}
    </div>
  );
}
