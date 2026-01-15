'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import JobOfferInput from '@/components/JobOfferInput';
import CustomInstructions from '@/components/CustomInstructions';
import ApiKeyInput from '@/components/ApiKeyInput';
import LaTeXViewer from '@/components/LaTeXViewer';
import ProviderSelector from '@/components/ProviderSelector';
import ModelSelector from '@/components/ModelSelector';
import LoadingOverlay from '@/components/LoadingOverlay';
import ChatPanel from '@/components/ChatPanel';
import OverflowChoiceModal from '@/components/OverflowChoiceModal';
import { ChatMessageData } from '@/components/ChatMessage';
import { Provider, getDefaultModel } from '@/lib/models';

// SSE Event types (must match server)
type SSEEvent = 
  | { type: 'status'; message: string }
  | { type: 'attempt'; current: number; max: number }
  | { type: 'compiling' }
  | { type: 'complete'; latex: string; summary: string; pageCount: number; attempts: number; pdfPath?: string }
  | { type: 'error'; message: string }
  | { type: 'overflow_choice'; latex: string; summary: string; pageCount: number; overflowPercentage: number; attempts: number; pdfPath?: string };

// Pending overflow choice state
interface PendingOverflowChoice {
  latex: string;
  summary: string;
  pageCount: number;
  overflowPercentage: number;
}

// App mode
type AppMode = 'initial' | 'chat';

// Uploaded image for LaTeX compilation
export interface UploadedImage {
  id: string;
  filename: string;
  data: string;
  mimeType: string;
  originalName: string;
  size: number;
}

export default function Home() {
  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState(getDefaultModel('openai').id);
  const [resume, setResume] = useState('');
  const [jobOffer, setJobOffer] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // App mode: 'initial' = config form, 'chat' = follow-up chat
  const [mode, setMode] = useState<AppMode>('initial');
  
  // Original resume state (for AI context and viewing)
  const [originalResume, setOriginalResume] = useState('');
  const [originalPdfUrl, setOriginalPdfUrl] = useState<string | null>(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  
  // Loading overlay state
  const [loadingStatus, setLoadingStatus] = useState('');
  const [loadingAttempt, setLoadingAttempt] = useState<{ current: number; max: number } | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  
  // Overflow choice modal state
  const [pendingOverflowChoice, setPendingOverflowChoice] = useState<PendingOverflowChoice | null>(null);
  
  // Uploaded images state
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  
  // Track if provider change was from auto-detection (don't clear API key)
  const isAutoDetectedRef = useRef(false);
  
  // Track if we've already loaded env keys
  const envKeysLoadedRef = useRef(false);

  // Auto-load API key from environment on mount
  useEffect(() => {
    // Only load once
    if (envKeysLoadedRef.current) return;
    envKeysLoadedRef.current = true;

    const loadEnvKeys = async () => {
      try {
        const response = await fetch('/api/env-keys');
        if (response.ok) {
          const data = await response.json();
          if (data.provider && data.apiKey) {
            setProvider(data.provider);
            setModel(getDefaultModel(data.provider).id);
            setApiKey(data.apiKey);
          }
        }
      } catch {
        // Silently fail - env keys are optional
        console.debug('No environment API keys found');
      }
    };

    loadEnvKeys();
  }, []);

  // Handle manual provider change (clears API key)
  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setModel(getDefaultModel(newProvider).id);
    setApiKey('');
  };

  // Handle auto-detected provider change (keeps API key)
  const handleAutoDetectedProvider = (newProvider: Provider) => {
    isAutoDetectedRef.current = true;
    setProvider(newProvider);
    setModel(getDefaultModel(newProvider).id);
  };

  // Process SSE stream
  const processSSEStream = async (
    response: Response,
    onComplete: (latex: string, summary: string, pageCount: number) => void,
    onError: (message: string) => void,
    onOverflowChoice?: (latex: string, summary: string, pageCount: number, overflowPercentage: number) => void
  ) => {
    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));
            
            switch (event.type) {
              case 'status':
                setLoadingStatus(event.message);
                setIsCompiling(false);
                break;
              case 'attempt':
                setLoadingAttempt({ current: event.current, max: event.max });
                break;
              case 'compiling':
                setIsCompiling(true);
                setLoadingStatus('Compiling PDF...');
                break;
              case 'complete':
                onComplete(event.latex, event.summary, event.pageCount);
                break;
              case 'overflow_choice':
                if (onOverflowChoice) {
                  onOverflowChoice(event.latex, event.summary, event.pageCount, event.overflowPercentage);
                }
                break;
              case 'error':
                onError(event.message);
                break;
            }
          } catch (parseError) {
            console.error('Failed to parse SSE event:', line, parseError);
          }
        }
      }
    }
  };

  // Initial modification
  const handleSubmit = async () => {
    if (!resume.trim()) {
      setError('Please provide your LaTeX resume');
      return;
    }
    if (!jobOffer.trim()) {
      setError('Please provide the job offer description');
      return;
    }
    if (!apiKey.trim()) {
      setError(`Please provide your ${provider === 'openai' ? 'OpenAI' : 'Google'} API key`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStatus('Initializing...');
    setLoadingAttempt(null);
    setIsCompiling(false);
    
    // Capture original resume before AI modifies it
    setOriginalResume(resume);
    
    // Compile original PDF in parallel with AI request (for "View Original" feature)
    const compileOriginalPdf = async () => {
      try {
        const response = await fetch('/api/compile-latex', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latex: resume }),
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setOriginalPdfUrl(url);
        }
      } catch {
        // Silently fail - original PDF preview is optional
        console.warn('Failed to compile original PDF for preview');
      }
    };
    
    // Start compiling original PDF in background (don't await)
    compileOriginalPdf();

    try {
      const response = await fetch('/api/modify-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume,
          jobOffer,
          customInstructions,
          apiKey,
          provider,
          model,
        }),
      });

      await processSSEStream(
        response,
        (latex, summary, pageCount) => {
          setResume(latex);
          
          // Add AI message to chat
          const aiMessage: ChatMessageData = {
            id: Date.now().toString(),
            role: 'assistant',
            content: summary,
            timestamp: new Date(),
          };
          setChatMessages([aiMessage]);
          
          // Switch to chat mode
          setMode('chat');
          
          if (pageCount > 1) {
            setError(`Warning: Resume is still ${pageCount} pages. Consider manual editing to fit on one page.`);
          }
        },
        (errorMessage) => {
          setError(errorMessage);
        },
        (latex, summary, pageCount, overflowPercentage) => {
          // Small overflow detected - show choice modal
          setResume(latex);
          setPendingOverflowChoice({ latex, summary, pageCount, overflowPercentage });
          
          // Add AI message about the situation
          const aiMessage: ChatMessageData = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `${summary}\n\n⚠️ Small overflow detected (~${overflowPercentage}% over one page).`,
            timestamp: new Date(),
          };
          setChatMessages([aiMessage]);
          
          // Switch to chat mode so user can see the result
          setMode('chat');
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
      setLoadingAttempt(null);
      setIsCompiling(false);
    }
  };

  // Follow-up modification
  const handleFollowUp = useCallback(async (instruction: string) => {
    if (!instruction.trim() || !apiKey.trim()) return;

    // Validate that we have the necessary context for follow-ups
    if (!resume.trim()) {
      setError('Resume content is missing. Please reset and try again.');
      return;
    }
    if (!jobOffer.trim()) {
      setError('Job offer context is missing. Please reset and try again.');
      return;
    }

    // Add user message to chat
    const userMessage: ChatMessageData = {
      id: Date.now().toString(),
      role: 'user',
      content: instruction,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage].slice(-5)); // Keep last 5

    setIsLoading(true);
    setError(null);
    setLoadingStatus('Processing your feedback...');
    setLoadingAttempt(null);
    setIsCompiling(false);

    try {
      // Build chat history for API (just content, not full objects)
      const chatHistory = chatMessages.slice(-4).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/modify-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume,
          originalResume,
          jobOffer,
          customInstructions,
          apiKey,
          provider,
          model,
          isFollowUp: true,
          followUpInstruction: instruction,
          chatHistory,
        }),
      });

      await processSSEStream(
        response,
        (latex, summary, pageCount) => {
          setResume(latex);
          
          // Add AI response to chat
          const aiMessage: ChatMessageData = {
            id: Date.now().toString(),
            role: 'assistant',
            content: summary,
            timestamp: new Date(),
          };
          setChatMessages(prev => [...prev, aiMessage].slice(-5));
          
          if (pageCount > 1) {
            setError(`Warning: Resume is still ${pageCount} pages. Consider manual editing.`);
          }
        },
        (errorMessage) => {
          // Add error as chat message
          const errorChatMessage: ChatMessageData = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Error: ${errorMessage}`,
            timestamp: new Date(),
            isError: true,
          };
          setChatMessages(prev => [...prev, errorChatMessage].slice(-5));
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      const errorChatMessage: ChatMessageData = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
        isError: true,
      };
      setChatMessages(prev => [...prev, errorChatMessage].slice(-5));
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
      setLoadingAttempt(null);
      setIsCompiling(false);
    }
  }, [apiKey, chatMessages, customInstructions, jobOffer, model, originalResume, provider, resume]);

  // Reset to initial mode (keep resume)
  const handleReset = useCallback(() => {
    setMode('initial');
    setChatMessages([]);
    setJobOffer('');
    setCustomInstructions('');
    setError(null);
    setPendingOverflowChoice(null);
    // Clear original resume state
    setOriginalResume('');
    if (originalPdfUrl) {
      URL.revokeObjectURL(originalPdfUrl);
      setOriginalPdfUrl(null);
    }
  }, [originalPdfUrl]);

  // Handle user choosing to fix overflow manually
  const handleFixManually = useCallback(() => {
    setPendingOverflowChoice(null);
    // User will edit the LaTeX manually - no additional action needed
  }, []);

  // Handle user choosing to let AI condense the overflow
  const handleLetAICondense = useCallback(async () => {
    if (!pendingOverflowChoice || !apiKey.trim()) return;

    setPendingOverflowChoice(null);
    setIsLoading(true);
    setError(null);
    setLoadingStatus('Asking AI to condense content...');
    setLoadingAttempt(null);
    setIsCompiling(false);

    try {
      const response = await fetch('/api/modify-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: pendingOverflowChoice.latex,
          originalResume,
          jobOffer,
          customInstructions,
          apiKey,
          provider,
          model,
          isFollowUp: true,
          followUpInstruction: 'Please condense the resume to fit on exactly one page. Remove or shorten less important bullet points while preserving the most impactful content.',
          chatHistory: chatMessages.slice(-4).map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          forceCondense: true, // Bypass the small overflow check
        }),
      });

      await processSSEStream(
        response,
        (latex, summary, pageCount) => {
          setResume(latex);
          
          // Add AI response to chat
          const aiMessage: ChatMessageData = {
            id: Date.now().toString(),
            role: 'assistant',
            content: summary,
            timestamp: new Date(),
          };
          setChatMessages(prev => [...prev, aiMessage].slice(-5));
          
          if (pageCount > 1) {
            setError(`Warning: Resume is still ${pageCount} pages. Consider manual editing.`);
          }
        },
        (errorMessage) => {
          const errorChatMessage: ChatMessageData = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Error: ${errorMessage}`,
            timestamp: new Date(),
            isError: true,
          };
          setChatMessages(prev => [...prev, errorChatMessage].slice(-5));
        },
        (latex, summary, pageCount, overflowPercentage) => {
          // Still has overflow after AI attempt
          setResume(latex);
          setError(`Warning: Resume still overflows by ~${overflowPercentage}%. Consider manual editing.`);
          
          const aiMessage: ChatMessageData = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `${summary}\n\n⚠️ Still ~${overflowPercentage}% over one page after condensing.`,
            timestamp: new Date(),
          };
          setChatMessages(prev => [...prev, aiMessage].slice(-5));
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      const errorChatMessage: ChatMessageData = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
        isError: true,
      };
      setChatMessages(prev => [...prev, errorChatMessage].slice(-5));
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
      setLoadingAttempt(null);
      setIsCompiling(false);
    }
  }, [pendingOverflowChoice, apiKey, originalResume, jobOffer, customInstructions, provider, model, chatMessages]);

  // Extract job title for chat header
  const jobTitle = jobOffer.split('\n')[0]?.slice(0, 50) || 'Job Position';

  // Image management handlers
  const handleImageUpload = useCallback((files: FileList) => {
    const newImages: UploadedImage[] = [];
    
    Array.from(files).forEach((file) => {
      // Only accept image types
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        // Remove the data:image/xxx;base64, prefix
        const data = base64.split(',')[1];
        
        const newImage: UploadedImage = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          filename: file.name,
          data,
          mimeType: file.type,
          originalName: file.name,
          size: file.size,
        };
        
        setUploadedImages((prev) => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleImageRename = useCallback((id: string, newFilename: string) => {
    setUploadedImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, filename: newFilename } : img
      )
    );
  }, []);

  const handleImageDelete = useCallback((id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={isLoading}
        status={loadingStatus}
        attempt={loadingAttempt}
        isCompiling={isCompiling}
      />

      {/* Overflow Choice Modal */}
      <OverflowChoiceModal
        isOpen={pendingOverflowChoice !== null}
        overflowPercentage={pendingOverflowChoice?.overflowPercentage ?? 0}
        onFixManually={handleFixManually}
        onLetAIFix={handleLetAICondense}
      />

      {/* Navbar with blur effect */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">AppLytics</h1>
            </div>
            
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border transition-all text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span>Star on GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* Left Panel - Config or Chat */}
          <div className="lg:col-span-5 flex flex-col h-full gap-3 overflow-hidden">
            {mode === 'initial' ? (
              // Initial configuration form
              <>
                <div className="clean-panel p-4 rounded-xl flex flex-col flex-1 min-h-0 gap-4 overflow-hidden">
                  {/* Provider Selection */}
                  <div className="shrink-0">
                    <ProviderSelector value={provider} onChange={handleProviderChange} />
                  </div>

                  {/* Model Selection */}
                  <div className="shrink-0">
                    <ModelSelector provider={provider} value={model} onChange={setModel} />
                  </div>

                  {/* Divider */}
                  <div className="relative shrink-0 py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">Configuration</span>
                    </div>
                  </div>

                  {/* API Key Input */}
                  <div className="shrink-0">
                    <ApiKeyInput 
                      value={apiKey} 
                      onChange={setApiKey} 
                      provider={provider} 
                      onProviderChange={handleAutoDetectedProvider}
                    />
                  </div>
                  
                  <div className="flex-[3] min-h-0">
                    <JobOfferInput value={jobOffer} onChange={setJobOffer} />
                  </div>
                  
                  <div className="flex-1 min-h-0">
                    <CustomInstructions value={customInstructions} onChange={setCustomInstructions} />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl animate-in fade-in slide-in-from-top-2 shrink-0">
                    <div className="flex gap-3">
                      <svg className="h-5 w-5 text-destructive shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-medium text-destructive">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full py-3 px-6 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 group relative overflow-hidden"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="relative">Processing...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 relative group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="relative">Modify Resume with AI</span>
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-muted-foreground text-[10px]">
                    By using this tool, your data is sent to the model provider for processing.
                  </p>
                </div>
              </>
            ) : (
              // Chat mode for follow-up instructions
              <>
                <ChatPanel
                  messages={chatMessages}
                  onSendMessage={handleFollowUp}
                  onReset={handleReset}
                  isLoading={isLoading}
                  jobTitle={jobTitle}
                />
                
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl animate-in fade-in slide-in-from-top-2 shrink-0">
                    <div className="flex gap-3">
                      <svg className="h-5 w-5 text-destructive shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-medium text-destructive">{error}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Panel - LaTeX Editor/Preview */}
          <div className="lg:col-span-7 h-full overflow-hidden">
            <LaTeXViewer
              value={resume}
              onChange={setResume}
              mode={mode}
              originalPdfUrl={originalPdfUrl}
              uploadedImages={uploadedImages}
              onImageUpload={handleImageUpload}
              onImageRename={handleImageRename}
              onImageDelete={handleImageDelete}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
