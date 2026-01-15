'use client';

import { useState } from 'react';
import { Provider } from '@/lib/models';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Key, Lock, ExternalLink, Eye, EyeOff } from 'lucide-react';

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  provider: Provider;
  onProviderChange?: (provider: Provider) => void;
}

const providerConfig = {
  openai: {
    label: 'OpenAI API Key',
    placeholder: 'sk-...',
    iconColor: 'text-primary',
    linkText: 'Get your API key',
    linkUrl: 'https://platform.openai.com/api-keys',
  },
  google: {
    label: 'Google API Key',
    placeholder: 'AIza...',
    iconColor: 'text-primary',
    linkText: 'Get your API key',
    linkUrl: 'https://aistudio.google.com/app/apikey',
  },
};

function detectProvider(apiKey: string): Provider | null {
  const trimmed = apiKey.trim();
  if (trimmed.startsWith('sk-')) {
    return 'openai';
  }
  if (trimmed.startsWith('AIza')) {
    return 'google';
  }
  return null;
}

export default function ApiKeyInput({ value, onChange, provider, onProviderChange }: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  const config = providerConfig[provider];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Auto-detect provider from API key prefix
    if (onProviderChange) {
      const detectedProvider = detectProvider(newValue);
      if (detectedProvider && detectedProvider !== provider) {
        onProviderChange(detectedProvider);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <Key className={`w-4 h-4 ${config.iconColor}`} />
          {config.label}
        </Label>
        <a
          href={config.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {config.linkText}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="relative group">
        <Input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          placeholder={config.placeholder}
          className="pr-20 h-12"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2"
        >
          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="ml-1 text-xs">{showKey ? 'Hide' : 'Show'}</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Lock className="w-3 h-3" />
        Your key is processed securely and never stored.
      </p>
    </div>
  );
}
