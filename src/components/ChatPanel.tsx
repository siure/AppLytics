'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage, { ChatMessageData } from './ChatMessage';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, RotateCcw } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessageData[];
  onSendMessage: (message: string) => void;
  onReset: () => void;
  isLoading: boolean;
  jobTitle?: string;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  onReset,
  isLoading,
  jobTitle,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = useCallback(() => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  }, [input, isLoading, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-sm">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 shrink-0 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold">AI Chat</h3>
            {jobTitle && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                Modifying for: {jobTitle}
              </span>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          title="Start a new modification"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0 min-h-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <div className="w-12 h-12 mb-3 rounded-full bg-muted flex items-center justify-center">
                <MessageCircle className="w-6 h-6 opacity-50" />
              </div>
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">AI responses will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Input Area */}
      <div className="p-4 border-t shrink-0">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Request changes... (Enter to send, Shift+Enter for newline)"
              disabled={isLoading}
              rows={1}
              className="resize-none pr-4"
              style={{ maxHeight: '120px' }}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-auto aspect-square shrink-0"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>

        {/* Start New Link */}
        <div className="mt-3 text-center">
          <button
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Start new modification with different job
          </button>
        </div>
      </div>
    </Card>
  );
}
