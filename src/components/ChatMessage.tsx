'use client';

import { cn } from '@/lib/utils';
import { Monitor, User, AlertTriangle } from 'lucide-react';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const isError = message.isError;

  return (
    <div
      className={cn("flex gap-3", isAssistant ? "justify-start" : "justify-end")}
    >
      {isAssistant && (
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isError
            ? 'bg-destructive/10 text-destructive'
            : 'bg-primary/10 text-primary'
        )}>
          {isError ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Monitor className="w-4 h-4" />
          )}
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isAssistant
            ? isError
              ? 'bg-destructive/10 border border-destructive/20 text-destructive'
              : 'bg-muted border border-border text-foreground'
            : 'bg-primary text-primary-foreground'
        )}
      >
        {isAssistant ? (
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        ) : (
          <p className="text-sm">{message.content}</p>
        )}
        <span className={cn(
          "text-[10px] mt-2 block",
          isAssistant
            ? isError ? 'text-destructive/60' : 'text-muted-foreground'
            : 'text-primary-foreground/70'
        )}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>

      {!isAssistant && (
        <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
