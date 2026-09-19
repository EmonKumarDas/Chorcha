'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MessageCircleQuestion, Pencil, Save, X, Sparkles, Bookmark, Heart, ChevronDown, Trash2, ImagePlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import MathRenderer from '@/components/MathRenderer';
import { Textarea } from '@/components/ui/textarea';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type MCQDoc = {
    text: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
    board: string;
    year: number;
    subject: string;
    chapter: string;
    guidebookAnswer?: string;
    videoUrl?: string;
};

export type MCQ = MCQDoc & { id: string };

// Component to render explanation with selectable lines
function SelectableExplanation({ content, onAskAI }: { content: string; onAskAI: (selectedText: string) => void }) {
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length <= 1) {
    return (
      <div className="group relative">
        <div className="explanation-line" onClick={() => onAskAI(content)}>
          <MathRenderer content={content} />
          <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAskAI(content); }}
                    className="h-7 w-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all animate-scale-in"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left"><p className="text-xs">AI-কে জিজ্ঞাসা করুন</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {lines.map((line, index) => (
        <div key={index} className="group relative">
          <div
            className={`explanation-line ${selectedLine === index ? 'selected' : ''}`}
            onClick={() => setSelectedLine(selectedLine === index ? null : index)}
          >
            <MathRenderer content={line} />
          </div>
          {selectedLine === index && (
            <div className="flex items-center gap-2 mt-1 ml-1 animate-scale-in">
              <button
                onClick={() => { onAskAI(line); setSelectedLine(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-all border border-primary/20"
              >
                <Sparkles className="h-3 w-3" />
                AI-কে জিজ্ঞাসা করুন
              </button>
              <button
                onClick={() => setSelectedLine(null)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-xs transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function McqCard({
  mcq,
  index,
  isAdmin,
  onAskAI,
  collectionName = 'mcqs',
  showAnswerByDefault = false,
  testMode = false,
  selectedAnswer: controlledSelectedAnswer,
  onSelectAnswer,
  revealAnswer,
}: {
  mcq: MCQ,
  index: number,
  isAdmin?: boolean,
  onAskAI?: (questionContext: any, selectedText?: string) => void,
  collectionName?: string,
  showAnswerByDefault?: boolean,
  testMode?: boolean,
  selectedAnswer?: number | null,
  onSelectAnswer?: (optionIndex: number) => void,
  revealAnswer?: boolean,
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [internalSelectedAnswer, setInternalSelectedAnswer] = useState<number | null>(null);
  const [internalIsAnswered, setInternalIsAnswered] = useState(showAnswerByDefault);
  const [showExplanation, setShowExplanation] = useState(showAnswerByDefault);
  
  // Inline Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(mcq.text || '');
  const [editOptions, setEditOptions] = useState([...(mcq.options || [])]);
  const [editExplanation, setEditExplanation] = useState(mcq.explanation || '');
  const [editCorrectAnswerIndex, setEditCorrectAnswerIndex] = useState(mcq.correctAnswerIndex ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const selectedAnswer = controlledSelectedAnswer !== undefined ? controlledSelectedAnswer : internalSelectedAnswer;
  const isAnswered = revealAnswer || internalIsAnswered;

  useEffect(() => {
    if (testMode) {
      setInternalIsAnswered(false);
      setShowExplanation(false);
      return;
    }
    setInternalIsAnswered(showAnswerByDefault);
    setShowExplanation(showAnswerByDefault || !!revealAnswer);
  }, [revealAnswer, showAnswerByDefault, testMode]);

  const questionContext = {
    text: mcq.text,
    subject: mcq.subject,
    chapter: mcq.chapter,
    board: mcq.board,
    year: mcq.year,
    type: 'mcq',
    explanation: mcq.explanation,
    options: mcq.options,
    correctAnswerIndex: mcq.correctAnswerIndex,
  };

  const handleAskAI = useCallback((selectedText: string) => {
    onAskAI?.(questionContext, selectedText);
  }, [onAskAI, mcq]);

  const handleAnswer = (optionIndex: number) => {
    if (isAnswered) return;
    if (onSelectAnswer) {
      onSelectAnswer(optionIndex);
      return;
    }
    setInternalSelectedAnswer(optionIndex);
    setInternalIsAnswered(true);
  };

  const handleShowAnswer = () => {
    setInternalSelectedAnswer(null);
    setInternalIsAnswered(true);
    setShowExplanation(true);
  };

  const correctAnswerIndex = Number.isInteger(mcq.correctAnswerIndex) ? mcq.correctAnswerIndex : 0;

  const handleSave = async () => {
      if (!firestore) return;
      setIsSaving(true);
      try {
          const docRef = doc(firestore, collectionName, mcq.id);
          const safeCorrectAnswerIndex = Math.max(0, Math.min(editOptions.length - 1, Number(editCorrectAnswerIndex) || 0));
          const updateData = {
              text: editText || '',
              options: editOptions.map((option) => option || ''),
              explanation: editExplanation || '',
              correctAnswerIndex: safeCorrectAnswerIndex,
          };
          await updateDoc(docRef, updateData);
          toast({ title: 'Success', description: 'MCQ updated successfully.' });
          setIsEditing(false);
      } catch (err) {
          console.error('MCQ update failed:', err);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: err instanceof Error ? err.message : 'Failed to update.',
          });
      } finally {
          setIsSaving(false);
      }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const handleDelete = async () => {
      if (!window.confirm('Are you sure you want to delete this MCQ?')) return;
      if (!firestore) return;
      setIsDeleting(true);
      try {
          const docRef = doc(firestore, collectionName, mcq.id);
          await deleteDoc(docRef);
          toast({ title: 'Success', description: 'MCQ deleted successfully.' });
      } catch (err) {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete.' });
      } finally {
          setIsDeleting(false);
      }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            return `https://www.youtube.com/embed/${urlObj.pathname.slice(1)}`;
        }
        if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
             const videoId = urlObj.searchParams.get('v');
             if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
             }
        }
    } catch (e) {
        // invalid URL
    }
    return url;
  }
  
  return (
    <div className="liquid-card overflow-hidden animate-fade-in">
      {/* Question Header — Prominent number badge */}
      {/* Question Header — Prominent number badge */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Large question number badge */}
          <div className="question-number-badge shrink-0 mt-1 bg-gradient-to-br from-emerald-500/25 to-primary/10 border-emerald-500/30 text-emerald-400">
            {String(index).padStart(2, '0')}
          </div>
          
          <div className="min-w-0 flex-1">
            {/* Header row: Label + Actions */}
            <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2 mb-3">
              {/* Question label */}
              <div className="question-label text-emerald-400 shrink-0">
                <span>Question {String(index).padStart(2, '0')}</span>
                <Badge variant="secondary" className="rounded-lg bg-emerald-500/10 text-emerald-400 border-0 text-[10px] px-1.5 py-0 ml-2">MCQ</Badge>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 shrink-0 justify-end">
                <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                  <Bookmark className="h-4 w-4" />
                </button>
                <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all">
                  <Heart className="h-4 w-4" />
                </button>
                {isAdmin && (
                  <>
                    {isEditing ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving || isDeleting} className="h-8"><X className="h-4 w-4" /></Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving || isDeleting} className="h-8">
                            {isSaving ? '...' : <Save className="h-4 w-4" />}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-500/70 hover:text-blue-500 hover:bg-blue-500/10 transition-colors" onClick={() => setIsEditing(true)} title="Edit Question">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors" onClick={handleDelete} disabled={isDeleting} title="Delete Question">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </>
                )}
                {onAskAI && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                    onClick={() => onAskAI(questionContext)}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="mb-2 w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Pencil className="h-4 w-4" /> প্রশ্ন এডিট করুন:
                  </span>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const url = window.prompt("ছবির URL দিন (Image URL):");
                      if (url) {
                        setEditText(prev => prev + `\n\n![ছবি](${url})\n`);
                      }
                    }}
                    className="h-7 text-xs flex items-center gap-1.5"
                  >
                    <ImagePlus className="h-3.5 w-3.5" /> ছবি ঢোকান
                  </Button>
                </div>
                <Textarea 
                    value={editText} 
                    onChange={e => setEditText(e.target.value)}
                    className="min-h-[100px] text-lg w-full"
                    placeholder="Edit question text..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ছবি সুবিধামত জায়গায় বসাতে <code className="bg-white/10 px-1 py-0.5 rounded">![ছবি](https://...)</code> লেখাটি কাট করে যেকোনো স্থানে পেস্ট করুন।
                </p>
              </div>
            ) : (
              <div className="text-base md:text-lg leading-relaxed text-foreground/90 w-full overflow-hidden break-words">
                <MathRenderer content={mcq.text} />
              </div>
            )}

            {/* Chapter reference */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {mcq.board && (
                <Badge variant="outline" className="text-xs text-primary bg-primary/5 border-primary/20">
                  {mcq.board} {mcq.year && `- ${mcq.year}`}
                </Badge>
              )}
              {mcq.chapter && (
                <span className="text-xs text-primary/70 font-medium">
                  Chapter: {mcq.chapter}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="px-5 pb-4">
        <div className="space-y-2.5">
          {isEditing ? (
            <>
              {editOptions.map((opt, optIndex) => (
                <div key={optIndex} className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditCorrectAnswerIndex(optIndex)}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 text-sm font-medium transition-colors",
                      editCorrectAnswerIndex === optIndex
                        ? "border-green-500/50 bg-green-500/15 text-green-400"
                        : "bg-muted text-muted-foreground hover:border-primary/40"
                    )}
                    title="Set as correct answer"
                  >
                    {String.fromCharCode(0x0995 + optIndex)}
                  </button>
                  <Textarea
                    value={opt}
                    onChange={e => {
                      const newOpts = [...editOptions];
                      newOpts[optIndex] = e.target.value;
                      setEditOptions(newOpts);
                    }}
                    className="min-h-[40px] py-2"
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                সঠিক উত্তর সেট করতে বাম পাশের অপশন অক্ষরে ক্লিক করুন।
              </p>
            </>
          ) : (
            mcq.options.map((option, idx) => {
              const isCorrect = idx === correctAnswerIndex;
              const isSelected = idx === selectedAnswer;
              
              return (
                <button
                  key={idx}
                  className={cn(
                    "w-full flex items-center gap-3 py-3 px-4 text-base font-normal text-left rounded-xl transition-all duration-200 border",
                    !isAnswered && "bg-white/3 border-white/8 hover:border-primary/40 hover:bg-primary/5 cursor-pointer",
                    !isAnswered && isSelected && "border-primary/50 bg-primary/10 text-primary",
                    isAnswered && isCorrect && "bg-green-500/10 border-green-500/30 text-green-300",
                    isAnswered && isSelected && !isCorrect && "bg-red-500/10 border-red-500/30 text-red-300",
                    isAnswered && !isSelected && !isCorrect && "opacity-50 border-white/5",
                  )}
                  onClick={() => handleAnswer(idx)}
                  disabled={isAnswered}
                >
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border text-sm shrink-0 font-medium transition-colors",
                    !isAnswered && "border-white/15 text-muted-foreground bg-white/5",
                    !isAnswered && isSelected && "border-primary/50 text-primary bg-primary/15",
                    isAnswered && isCorrect && "border-green-500/40 text-green-400 bg-green-500/15",
                    isAnswered && isSelected && !isCorrect && "border-red-500/40 text-red-400 bg-red-500/15",
                  )}>
                    {String.fromCharCode(0x0995 + idx)}
                  </span>
                  <span className="flex-1">
                    <MathRenderer content={option} inline />
                  </span>
                  {isAnswered && isCorrect && <CheckCircle className="ml-auto h-5 w-5 text-green-400 shrink-0" />}
                  {isAnswered && isSelected && !isCorrect && <XCircle className="ml-auto h-5 w-5 text-red-400 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {!testMode && !isEditing && !isAnswered && (
        <div className="px-5 pb-4">
          <Button variant="outline" size="sm" onClick={handleShowAnswer} className="gap-2 rounded-xl">
            <CheckCircle className="h-4 w-4" />
            উত্তর দেখুন
          </Button>
        </div>
      )}

      {/* Explanation — shown after answering */}
      {isEditing ? (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted-foreground">Edit Explanation:</span>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const url = window.prompt("ছবির URL দিন (Image URL):");
                if (url) {
                  setEditExplanation(prev => prev + `\n\n![ছবি](${url})\n`);
                }
              }}
              className="h-7 text-xs flex items-center gap-1.5"
            >
              <ImagePlus className="h-3.5 w-3.5" /> ছবি ঢোকান
            </Button>
          </div>
          <Textarea 
            value={editExplanation}
            onChange={e => setEditExplanation(e.target.value)}
            className="min-h-[100px] w-full mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            ছবি সুবিধামত জায়গায় বসাতে <code className="bg-white/10 px-1 py-0.5 rounded">![ছবি](https://...)</code> লেখাটি কাট করে যেকোনো স্থানে পেস্ট করুন।
          </p>
        </div>
      ) : (
        isAnswered && !testMode && (
          <div className="px-5 pb-5">
            <div className="sub-question-item">
              <button
                className="sub-question-trigger"
                onClick={() => setShowExplanation(!showExplanation)}
              >
                <span className="sub-question-badge">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1 text-sm font-medium text-foreground/80">📖 উত্তর ও ব্যাখ্যা দেখুন</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${showExplanation ? 'rotate-180' : ''}`} />
              </button>
              {showExplanation && (
                <div className="px-4 pb-4 pt-1 animate-slide-in-up">
                  <Tabs defaultValue="answer" className="w-full">
                    <TabsList className="bg-muted/50 rounded-xl p-1">
                      <TabsTrigger value="answer" className="rounded-lg text-xs">সঠিক উত্তর</TabsTrigger>
                      {mcq.explanation && <TabsTrigger value="explanation" className="rounded-lg text-xs">ধাপে ধাপে</TabsTrigger>}
                      {mcq.guidebookAnswer && <TabsTrigger value="guidebook" className="rounded-lg text-xs">গাইড উত্তর</TabsTrigger>}
                      {mcq.videoUrl && <TabsTrigger value="video" className="rounded-lg text-xs">ভিডিও</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="answer" className="pt-3">
                      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-green-300">
                        <p className="text-xs font-semibold uppercase tracking-wide text-green-400/80 mb-2">সঠিক উত্তর</p>
                        <div className="flex items-start gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-500/40 bg-green-500/15 text-sm font-bold">
                            {String.fromCharCode(0x0995 + correctAnswerIndex)}
                          </span>
                          <div className="flex-1 text-sm leading-relaxed text-foreground">
                            <MathRenderer content={mcq.options[correctAnswerIndex] || ''} inline />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    {mcq.explanation && (
                      <TabsContent value="explanation" className="pt-3 space-y-4">
                        <div className="rounded-xl border-0 glass-panel p-4 pb-5 shadow-lg relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                          <div className="glass-panel border border-primary/40 px-4 py-2 text-primary font-bold mb-4 inline-flex items-center gap-2 shadow-[0_4px_20px_rgba(var(--primary)/0.25)] rounded-xl relative z-10">
                            <Sparkles className="h-4 w-4 animate-pulse" />
                            সমাধান পদ্ধতি
                          </div>
                          {onAskAI ? (
                            <SelectableExplanation content={mcq.explanation} onAskAI={handleAskAI} />
                          ) : (
                            <MathRenderer content={mcq.explanation} />
                          )}
                        </div>
                      </TabsContent>
                    )}
                    {mcq.guidebookAnswer && (
                      <TabsContent value="guidebook" className="pt-3 space-y-4">
                        <div className="rounded-xl border-0 glass-panel p-4 pb-5 shadow-lg relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
                          <div className="glass-panel border border-accent/40 px-4 py-2 text-accent font-bold mb-4 inline-flex items-center gap-2 shadow-[0_4px_20px_rgba(var(--accent)/0.25)] rounded-xl relative z-10 w-fit">
                            <Sparkles className="h-4 w-4 animate-pulse" />
                            গাইড উত্তর
                          </div>
                          {onAskAI ? (
                            <SelectableExplanation content={mcq.guidebookAnswer} onAskAI={handleAskAI} />
                          ) : (
                            <MathRenderer content={mcq.guidebookAnswer} />
                          )}
                        </div>
                      </TabsContent>
                    )}
                    {mcq.videoUrl && (
                      <TabsContent value="video">
                        <iframe
                          className="w-full aspect-video rounded-xl mt-2"
                          src={getYouTubeEmbedUrl(mcq.videoUrl)}
                          title="Video explanation"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </TabsContent>
                    )}
                  </Tabs>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
