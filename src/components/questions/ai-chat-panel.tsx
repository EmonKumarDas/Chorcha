'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Send, Bot, User, Sparkles, Loader2, MessageCircle, GripVertical, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type QuestionContext = {
  text?: string;
  subject?: string;
  chapter?: string;
  board?: string;
  year?: number;
  type?: string;
  explanation?: string;
  options?: string[];
  correctAnswerIndex?: number;
};

interface AiChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClear?: () => void;
  questionContext?: QuestionContext;
  initialMessage?: string;
  selectedText?: string;
}

// LocalStorage cache key
const CHAT_CACHE_KEY = 'shikkha-ai-chat-cache';

function loadCachedMessages(): Message[] {
  try {
    const cached = localStorage.getItem(CHAT_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

function saveCachedMessages(messages: Message[]) {
  try {
    // Keep only last 50 messages to prevent storage bloat
    const toSave = messages.slice(-50);
    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore storage errors
  }
}

export function AiChatPanel({ isOpen, onClose, onClear, questionContext, initialMessage, selectedText }: AiChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [panelWidth, setPanelWidth] = useState(420);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoSent = useRef(false);
  const isResizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => user && firestore ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  // Load cached messages on mount
  useEffect(() => {
    const cached = loadCachedMessages();
    if (cached.length > 0) {
      setMessages(cached);
    }
  }, []);

  // Save messages to cache whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveCachedMessages(messages);
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto-send message when opened with selectedText
  useEffect(() => {
    if (isOpen && selectedText && !hasAutoSent.current) {
      hasAutoSent.current = true;
      // Clean auto-message: just ask about it, don't dump raw LaTeX
      const autoMsg = `এই অংশটি বুঝতে পারছি না, সহজ ভাষায় ব্যাখ্যা করুন।`;
      sendMessage(autoMsg);
    }
    if (!isOpen) {
      hasAutoSent.current = false;
    }
  }, [isOpen, selectedText]);

  // Resize handling
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const diff = startX - e.clientX;
      const newWidth = Math.min(Math.max(startWidth + diff, 320), 800);
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelWidth]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || inputRef.current?.value?.trim();
    if (!text || isLoading) return;

    const today = new Date().toISOString().split('T')[0];
    const isAdmin = userProfile?.role === 'admin';
    let currentUsageCount = userProfile?.aiUsageCount || 0;
    
    if (!isAdmin) {
      if (userProfile?.aiUsageDate !== today) {
        currentUsageCount = 0; // reset
      }
      if (currentUsageCount >= 10) {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ আপনার দৈনিক AI ব্যবহারের লিমিট (১০ বার) শেষ হয়ে গেছে। আগামীকাল আবার চেষ্টা করুন।' }]);
        setIsLoading(false);
        return;
      }
    }

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (inputRef.current) inputRef.current.value = '';
    setIsLoading(true);
    setStreamingContent('');

    try {
      // Retry logic: try up to 3 times for transient network/timeout errors
      const MAX_RETRIES = 3;
      let lastError = '';
      let success = false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const requestBody = JSON.stringify({
            messages: newMessages,
            questionContext,
            selectedText: selectedText || undefined,
          });

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          });

          if (!response.ok) {
            let errMessage = 'Failed to get response';
            try {
              const contentType = response.headers.get('content-type') || '';
              if (contentType.includes('application/json')) {
                const err = await response.json();
                errMessage = err.error || errMessage;
              } else {
                errMessage = `Server Error (${response.status})`;
              }
            } catch (e) {
              errMessage = `Server Error (${response.status})`;
            }
            throw new Error(errMessage);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No reader');

          const decoder = new TextDecoder();
          let accumulated = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulated += parsed.content;
                  setStreamingContent(accumulated);
                }
                // Check for error field in SSE data
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (parseErr: any) {
                if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
                // skip malformed JSON chunks
              }
            }
          }

          if (accumulated) {
            setMessages(prev => [...prev, { role: 'assistant', content: accumulated }]);
          } else {
            throw new Error('Empty response from AI');
          }
          setStreamingContent('');

          if (!isAdmin && user && firestore) {
            try {
              await updateDoc(doc(firestore, 'users', user.uid), {
                aiUsageCount: currentUsageCount + 1,
                aiUsageDate: today
              });
            } catch (e) {
              console.error('Failed to update AI usage stats', e);
            }
          }

          success = true;
          break; // Success, exit retry loop
        } catch (attemptError: any) {
          lastError = attemptError.message || 'Unknown error';
          console.warn(`[AI Chat] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError}`);
          setStreamingContent('');

          if (attempt < MAX_RETRIES) {
            // Wait before retrying (1s, then 2s)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          }
        }
      }

      if (!success) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ AI সাময়িকভাবে অনুপলব্ধ। কিছুক্ষণ পর আবার চেষ্টা করুন। (${lastError})` }]);
        setStreamingContent('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_CACHE_KEY);
    onClear?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Chat Panel */}
      <div
        ref={panelRef}
        className="relative h-[calc(100vh-1rem)] md:h-full flex flex-col shadow-2xl mt-2 mb-2 mr-2 md:mt-0 md:mb-0 rounded-xl md:rounded-none"
        style={{ width: panelWidth, maxWidth: '100vw' }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={startResize}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/20 transition-colors z-10 flex items-center"
          title="Drag to resize"
        >
          <GripVertical className="h-6 w-6 text-muted-foreground/30 -ml-2" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-foreground">Learn With AI</h3>
              <p className="text-xs text-muted-foreground">আপনার ব্যক্তিগত শিক্ষক</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs text-muted-foreground hover:text-destructive">
                Clear
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Question Context Banner — COLLAPSIBLE */}
        {questionContext?.text && (
          <div className="px-4 py-2 bg-primary/5 border-b border-border/30">
            <button
              onClick={() => setIsContextExpanded(!isContextExpanded)}
              className="flex items-center justify-between w-full text-left gap-2 group"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider shrink-0">প্রশ্নের context</p>
                {questionContext.subject && (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">{questionContext.subject}</span>
                )}
              </div>
              {isContextExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
            {isContextExpanded && (
              <div className="mt-2 animate-slide-in-up">
                <div className="text-sm text-foreground/80 max-h-24 overflow-y-auto custom-scrollbar prose dark:prose-invert prose-sm">
                  <MathRenderer content={questionContext.text} />
                </div>
                {selectedText && (
                  <div className="mt-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-0.5">📌 নির্বাচিত অংশ:</p>
                    <div className="text-xs text-foreground/70 max-h-16 overflow-y-auto custom-scrollbar prose dark:prose-invert prose-sm max-w-none [&>p]:m-0">
                      <MathRenderer content={selectedText} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 && !streamingContent && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <h4 className="font-headline font-bold text-lg mb-2">Learn With AI তে স্বাগতম!</h4>
              <p className="text-sm text-muted-foreground max-w-xs">
                এই প্রশ্ন সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন। AI আপনাকে বুঝতে সাহায্য করবে।
              </p>
              <div className="mt-6 space-y-2 w-full max-w-xs">
                {[
                  'এই প্রশ্নটি ব্যাখ্যা করুন',
                  'সহজ ভাষায় বুঝিয়ে বলুন',
                  'এই বিষয়ে আরো উদাহরণ দিন',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(suggestion)}
                    className="w-full text-left px-4 py-2.5 rounded-xl border border-border/60 bg-card/50 text-sm text-foreground/80 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 chat-bubble-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-md">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-md'
                  : 'glass-panel border-white/10 text-gray-100 rounded-tl-md'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose dark:prose-invert prose-sm max-w-none [&_p]:my-1 [&_li]:my-0.5">
                    <MathRenderer content={msg.content} />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Streaming message */}
          {streamingContent && (
            <div className="flex gap-3 justify-start chat-bubble-in">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-md animate-pulse-glow">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-md px-4 py-3 text-sm glass-panel border-white/10 text-gray-100">
                <div className="prose dark:prose-invert prose-sm max-w-none [&_p]:my-1 [&_li]:my-0.5">
                  <MathRenderer content={streamingContent} />
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && !streamingContent && (
            <div className="flex gap-3 justify-start chat-bubble-in">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-md">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="rounded-2xl rounded-tl-md px-4 py-3 glass-panel border-white/10">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary typing-dot" />
                  <div className="h-2 w-2 rounded-full bg-primary typing-dot" />
                  <div className="h-2 w-2 rounded-full bg-primary typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input - using uncontrolled input to prevent re-renders and typing lag */}
        <div className="p-4 border-t border-border/50 bg-card/50">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="আপনার প্রশ্ন লিখুন..."
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 rounded-xl bg-background border border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 px-4 py-2.5 text-sm outline-none transition-all disabled:opacity-50"
            />
            <Button
              size="icon"
              onClick={() => sendMessage()}
              disabled={isLoading}
              className="rounded-xl h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Floating AI button component
export function AiChatButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:shadow-2xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300 animate-pulse-glow group"
      aria-label="Open AI Chat"
    >
      <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform duration-300" />
    </button>
  );
}
