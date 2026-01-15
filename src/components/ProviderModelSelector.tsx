'use client';

import { Provider, Model, providers, getModelsByProvider } from '@/lib/models';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Server, Monitor, Info } from 'lucide-react';

interface ProviderModelSelectorProps {
    provider: Provider;
    model: string;
    onProviderChange: (provider: Provider) => void;
    onModelChange: (modelId: string) => void;
}

export default function ProviderModelSelector({
    provider,
    model,
    onProviderChange,
    onModelChange,
}: ProviderModelSelectorProps) {
    const availableModels = getModelsByProvider(provider);
    const selectedModel = availableModels.find((m) => m.id === model) || availableModels[0];

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="w-4 h-4 text-primary" />
                AI Configuration
            </div>

            <div className="flex items-end shadow-sm gap-0">
                {/* Provider Selector */}
                <div className="flex-1 min-w-0 z-10 transition-all focus-within:z-20">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                        <Server className="w-3 h-3" />
                        Provider
                    </Label>
                    <Select value={provider} onValueChange={onProviderChange}>
                        <SelectTrigger className="w-full h-9 text-sm rounded-r-none border-r-0 focus:ring-0 focus:ring-offset-0 focus:border-primary">
                            <SelectValue placeholder="Provider" />
                        </SelectTrigger>
                        <SelectContent>
                            {providers.map((p) => (
                                <SelectItem key={p.id} value={p.id} className="text-sm">
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Model Selector */}
                <div className="flex-[2] min-w-0 -ml-[1px] transition-all focus-within:z-20">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5 pl-2 border-l border-transparent">
                        <Monitor className="w-3 h-3" />
                        Model
                    </Label>
                    <Select value={model} onValueChange={onModelChange}>
                        <SelectTrigger className="w-full h-9 text-sm rounded-l-none focus:ring-0 focus:ring-offset-0 focus:border-primary">
                            <SelectValue placeholder="Model" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableModels.map((m: Model) => (
                                <SelectItem key={m.id} value={m.id} className="text-sm">
                                    {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Description */}
            {selectedModel && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-muted/50 p-2 rounded-md">
                    <Info className="w-3 h-3 shrink-0" />
                    {selectedModel.description}
                </p>
            )}
        </div>
    );
}
