'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileQuestion, Pencil, Save, X, Sparkles, ChevronDown, Bookmark, Heart, Trash2, ImagePlus, Link2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MathRenderer from '@/components/MathRenderer';
import { useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type BoardQuestionDoc = {
    text: string;
    board: string;
    year: number;
    subject: string;
    chapter: string;
    explanation: string;
    guidebookAnswer?: string; // For old data
    guidebookAnswers?: string[]; // For new data
    videoUrl?: string;
    imageUrl?: string; // Image URL for the question
};

export type BoardQuestion = BoardQuestionDoc & { id: string };

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

// Format number to Bengali
function toBengaliNum(n: number): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(n).split('').map(d => bengaliDigits[parseInt(d)] || d).join('');
}

export function CqCard({
  cq,
  index,
  isAdmin,
  onAskAI,
  collectionName = 'boardQuestions',
}: {
  cq: BoardQuestion,
  index: number,
  isAdmin?: boolean,
  onAskAI?: (questionContext: any, selectedText?: string) => void,
  collectionName?: string,
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // Inline Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(cq.text);
  const [editExplanation, setEditExplanation] = useState(cq.explanation || '');
  const [editImageUrl, setEditImageUrl] = useState(cq.imageUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Per sub-question accordion state
  const [openSubQuestion, setOpenSubQuestion] = useState<number | null>(null);

  const questionContext = {
    text: cq.text,
    subject: cq.subject,
    chapter: cq.chapter,
    board: cq.board,
    year: cq.year,
    type: 'cq',
    explanation: cq.explanation,
  };

  const handleAskAI = useCallback((selectedText: string) => {
    onAskAI?.(questionContext, selectedText);
  }, [onAskAI, cq]);

  const handleSave = async () => {
      if (!firestore) return;
      setIsSaving(true);
      try {
          const docRef = doc(firestore, collectionName, cq.id);
          const updateData: any = {
              text: editText,
              explanation: editExplanation,
          };
          // Only set imageUrl if provided, otherwise remove it
          if (editImageUrl.trim()) {
              updateData.imageUrl = editImageUrl.trim();
          } else {
              updateData.imageUrl = '';
          }
          await updateDoc(docRef, updateData);
          toast({ title: '✅ সফল', description: 'প্রশ্ন আপডেট হয়েছে।' });
          setIsEditing(false);
      } catch (err) {
          console.error('Update failed:', err);
          toast({ variant: 'destructive', title: 'ত্রুটি', description: `আপডেট ব্যর্থ: ${err instanceof Error ? err.message : 'Unknown error'}` });
      } finally {
          setIsSaving(false);
      }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const handleDelete = async () => {
      if (!firestore) {
          console.error('Firestore not available');
          toast({ variant: 'destructive', title: 'ত্রুটি', description: 'ডাটাবেস সংযোগ নেই।' });
          return;
      }
      setIsDeleting(true);
      try {
          console.log('Deleting CQ with id:', cq.id);
          const docRef = doc(firestore, collectionName, cq.id);
          await deleteDoc(docRef);
          toast({ title: '✅ মুছে ফেলা হয়েছে', description: 'প্রশ্ন সফলভাবে মুছে ফেলা হয়েছে।' });
          setShowDeleteConfirm(false);
      } catch (err) {
          console.error('Delete failed:', err);
          toast({ variant: 'destructive', title: 'ত্রুটি', description: `মুছতে ব্যর্থ: ${err instanceof Error ? err.message : 'Permission denied'}` });
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
    return url; // fallback for other video platforms or direct links
  }

  const guidebookAns = cq.guidebookAnswers || (cq.guidebookAnswer ? [cq.guidebookAnswer] : []);

  // Detect actual sub-question labels from the question text (ক., খ., গ., ঘ. etc.)
  const allBanglaLabels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ'];
  const detectedLabels: string[] = [];
  for (const label of allBanglaLabels) {
    // Match patterns like "ক." or "ক)" or "**ক." at the start of a line in the question text
    if (cq.text && (cq.text.includes(`${label}.`) || cq.text.includes(`${label})`))) {
      detectedLabels.push(label);
    }
  }
  // Fallback: if we can't detect from text, use guidebookAnswers length or default to 3
  const expectedSubCount = detectedLabels.length > 0 
    ? detectedLabels.length 
    : (guidebookAns.length > 0 ? guidebookAns.length : 3);

  // Use explanation if available, otherwise fallback to guidebookAns
  // Split on '---' but limit to the expected number of sub-questions
  const rawExplanationParts = cq.explanation 
    ? cq.explanation.split('---').map(s => s.trim()).filter(Boolean)
    : guidebookAns;

  // If we got more parts than expected sub-questions, merge extras into the last valid part
  const explanationParts = rawExplanationParts.length > expectedSubCount && expectedSubCount > 0
    ? [
        ...rawExplanationParts.slice(0, expectedSubCount - 1),
        rawExplanationParts.slice(expectedSubCount - 1).join('\n\n---\n\n')
      ]
    : rawExplanationParts;

  // Sub-question labels: use detected labels or fallback
  const subQuestionLabels = detectedLabels.length > 0 ? detectedLabels : ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ'];

  return (
    <div className="liquid-card overflow-hidden animate-fade-in">
      {/* Question Header — Prominent number badge like 3rd image UI */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Large question number badge */}
          <div className="question-number-badge shrink-0 mt-1">
            {String(index).padStart(2, '0')}
          </div>
          
          <div className="min-w-0 flex-1">
            {/* Header row: Label + Actions */}
            <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2 mb-3">
              {/* Question label */}
              <div className="question-label shrink-0">
                <span>Question {String(index).padStart(2, '0')}</span>
              </div>

              {/* Action buttons — bookmark, AI, edit */}
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
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors" onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting} title="Delete Question">
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
                <MathRenderer content={cq.text} />
              </div>
            )}

            {/* Chapter reference */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {cq.board && (
                <Badge variant="outline" className="text-xs text-primary bg-primary/5 border-primary/20">
                  {cq.board} {cq.year && `- ${toBengaliNum(cq.year)}`}
                </Badge>
              )}
              {cq.chapter && (
                <span className="text-xs text-primary/70 font-medium">
                  Chapter: {cq.chapter}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image display for all users */}
      {!isEditing && cq.imageUrl && (
        <div className="px-5 pb-3">
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
            <img 
              src={cq.imageUrl} 
              alt="প্রশ্নের ছবি" 
              className="w-full h-auto max-h-[500px] object-contain bg-black/5"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        </div>
      )}

      {/* Sub-questions as individual accordion items */}
      {isEditing ? (
        <div className="px-5 pb-5 space-y-4">
          <div className="mb-4">
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
            <p className="text-xs text-muted-foreground mt-1">
              ছবি সুবিধামত জায়গায় বসাতে <code className="bg-white/10 px-1 py-0.5 rounded">![ছবি](https://...)</code> লেখাটি কাট করে যেকোনো স্থানে পেস্ট করুন।
            </p>
          </div>
          <div>
            <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <ImagePlus className="h-4 w-4" /> ছবি যোগ করুন (URL):
            </span>
            <div className="flex items-center gap-2 mt-2">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input 
                value={editImageUrl}
                onChange={e => setEditImageUrl(e.target.value)}
                placeholder="https://example.com/image.png বা ছবির লিংক দিন"
                className="flex-1"
              />
            </div>
            {editImageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-white/10 max-w-xs">
                <img 
                  src={editImageUrl} 
                  alt="Preview" 
                  className="w-full h-auto max-h-[200px] object-contain bg-black/5"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        (explanationParts.length > 0 || cq.videoUrl) && (
          <div className="px-5 pb-5 space-y-2">
            
            {/* Explanations (grouped or single) */}
            {explanationParts.length > 1 ? (
              explanationParts.map((part, idx) => (
                <div key={idx} className="sub-question-item">
                  <button
                    className="sub-question-trigger"
                    onClick={() => setOpenSubQuestion(openSubQuestion === idx ? null : idx)}
                  >
                    <span className="sub-question-badge">
                      {subQuestionLabels[idx] || `${idx + 1}`}
                    </span>
                    <div className="flex-1 text-sm text-foreground/80 font-medium">
                      {subQuestionLabels[idx] ? `${subQuestionLabels[idx]} নং প্রশ্নের উত্তর ও ব্যাখ্যা` : `উত্তর ${idx + 1}`}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${openSubQuestion === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {openSubQuestion === idx && (
                    <div className="px-4 pb-4 pt-1 animate-slide-in-up">
                      <div className="rounded-xl glass-panel p-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
                        {onAskAI ? (
                          <SelectableExplanation content={part} onAskAI={handleAskAI} />
                        ) : (
                          <MathRenderer content={part} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : explanationParts.length === 1 ? (
               <div className="sub-question-item">
                 <button
                   className="sub-question-trigger"
                   onClick={() => setOpenSubQuestion(openSubQuestion === -1 ? null : -1)}
                 >
                   <span className="sub-question-badge">
                     <Sparkles className="h-3.5 w-3.5" />
                   </span>
                   <span className="flex-1 text-sm font-medium text-foreground/80">📖 উত্তর ও ব্যাখ্যা দেখুন</span>
                   <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${openSubQuestion === -1 ? 'rotate-180' : ''}`} />
                 </button>
                 {openSubQuestion === -1 && (
                   <div className="px-4 pb-4 pt-1 animate-slide-in-up">
                     <div className="rounded-xl glass-panel p-4 relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
                       {onAskAI ? (
                         <SelectableExplanation content={explanationParts[0]} onAskAI={handleAskAI} />
                       ) : (
                         <MathRenderer content={explanationParts[0]} />
                       )}
                     </div>
                   </div>
                 )}
               </div>
            ) : null}

            {/* Video only */}
            {cq.videoUrl && (
              <div className="sub-question-item">
                <button
                  className="sub-question-trigger"
                  onClick={() => setOpenSubQuestion(openSubQuestion === -3 ? null : -3)}
                >
                  <span className="sub-question-badge">▶</span>
                  <span className="flex-1 text-sm font-medium text-foreground/80">🎬 ভিডিও দেখুন</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${openSubQuestion === -3 ? 'rotate-180' : ''}`} />
                </button>
                {openSubQuestion === -3 && (
                  <div className="px-4 pb-4 pt-1 animate-slide-in-up">
                    <iframe
                      className="w-full aspect-video rounded-xl"
                      src={getYouTubeEmbedUrl(cq.videoUrl)}
                      title="Video explanation"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
              </div>
            )}

          </div>
        )
      )}
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="glass-strong border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">প্রশ্ন মুছে ফেলতে চান?</AlertDialogTitle>
            <AlertDialogDescription>
              এই প্রশ্নটি স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>বাতিল</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'মুছছে...' : 'হ্যাঁ, মুছে ফেলুন'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
