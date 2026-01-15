'use client';

import { useState } from 'react';
import { Provider } from '@/lib/models';

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
    iconColor: 'text-emerald-400',
    linkText: 'Get your API key',
    linkUrl: 'https://platform.openai.com/api-keys',
  },
  google: {
    label: 'Google API Key',
    placeholder: 'AIza...',
    iconColor: 'text-blue-400',
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
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <label className={`flex items-center gap-2 text-sm font-semibold text-foreground`}>
          <svg className={`w-4 h-4 ${config.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          {config.label}
        </label>
        <a
          href={config.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {config.linkText}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
      <div className="relative group">
        <input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          placeholder={config.placeholder}
          className="clean-input w-full p-4 pr-20 rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
        >
          {showKey ? 'Hide' : 'Show'}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your key is processed securely and never stored.
      </p>
    </div>
  );
}
