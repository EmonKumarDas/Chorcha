'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ChevronLeft, List, BookOpen, GraduationCap, Target, KeyRound, Sparkles, BookMarked, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AiChatPanel, AiChatButton } from '@/components/questions/ai-chat-panel';
import { Skeleton } from '@/components/ui/skeleton';

// Helper component to render nested JSON content decently
const ObjectRenderer = ({ data, level = 0 }: { data: any, level?: number }) => {
  if (!data) return null;
  if (typeof data === 'string') return <p className="leading-relaxed mb-3 text-muted-foreground">{data}</p>;
  if (typeof data === 'number' || typeof data === 'boolean') return <p className="mb-3">{data.toString()}</p>;
  
  if (Array.isArray(data)) {
    // If it's an array of strings, render as bullet points
    if (data.every(item => typeof item === 'string')) {
      return (
        <ul className="list-disc pl-5 mb-4 space-y-2 text-muted-foreground marker:text-primary/60">
          {data.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    }
    // Mixed array
    return (
      <div className="space-y-4 mb-4">
        {data.map((item, i) => (
          <div key={i} className="pl-4 border-l-2 border-border/40">
            <ObjectRenderer data={item} level={level + 1} />
          </div>
        ))}
      </div>
    );
  }

  // Handle objects
  return (
    <div className={`space-y-4 mb-6 ${level > 0 ? 'pl-4 border-l-2 border-primary/20' : ''}`}>
      {Object.entries(data).map(([key, value]) => {
        // Skip some internal keys or empty values
        if (key === 'section_no' || key === 'title' || key === 'content' || key === 'id' || !value) return null;
        
        const displayKey = key.replace(/_/g, ' ');
        return (
          <div key={key} className="bg-muted/20 p-4 rounded-xl border border-border/40">
            {typeof value !== 'string' && !Array.isArray(value) && (
              <h4 className="font-semibold text-foreground/80 mb-2 capitalize">{displayKey}</h4>
            )}
            {typeof value === 'string' && (
              <div className="flex gap-2">
                 <span className="font-semibold capitalize text-foreground/80 min-w-max">{displayKey}:</span>
                 <ObjectRenderer data={value} level={level + 1} />
              </div>
            )}
            {typeof value !== 'string' && (
               <ObjectRenderer data={value} level={level + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function TextbookReaderPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    
    const firestore = useFirestore();
    const textbookRef = useMemoFirebase(() => firestore && id ? doc(firestore, 'textbooks', id) : null, [firestore, id]);
    const { data: textbook, isLoading } = useDoc<any>(textbookRef);

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatSelectedText, setChatSelectedText] = useState<string | undefined>(undefined);
    const [activeSection, setActiveSection] = useState('intro');
    const [showSidebar, setShowSidebar] = useState(true);

    const mainContentRef = useRef<HTMLDivElement>(null);

    // AI Selection Logic
    useEffect(() => {
        if (!mainContentRef.current) return;
        const handleMouseUp = () => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0) {
                // Determine if selection is within the reader
                const isWithinReader = mainContentRef.current?.contains(selection.anchorNode);
                if (isWithinReader) {
                    setChatSelectedText(selection.toString());
                }
            }
        };
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    <Skeleton className="h-10 w-32 rounded-lg" />
                    <Skeleton className="h-16 w-3/4 rounded-2xl" />
                    <div className="flex gap-3">
                        <Skeleton className="h-8 w-24 rounded-full" />
                        <Skeleton className="h-8 w-24 rounded-full" />
                        <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                    <div className="mt-12 space-y-4">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-5/6" />
                        <Skeleton className="h-6 w-4/6" />
                    </div>
                </div>
            </div>
        );
    }

    if (!textbook) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <BookOpen className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h2 className="text-2xl font-bold text-foreground">পাঠ্যবই পাওয়া যায়নি</h2>
                <p className="text-muted-foreground mt-2 mb-6">এই লিংকের বইটির ডাটা ডাটাবেসে নেই।</p>
                <Button onClick={() => router.push('/textbooks')}>ফিরে যান</Button>
            </div>
        );
    }

    const m = textbook.metadata || {};
    const sections = textbook.sections || [];

    const handleAskAI = (theme?: string) => {
        if (!isChatOpen) setIsChatOpen(true);
        // We can pass context via chatSelectedText which is already grabbed by window.getSelection
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-background">
            {/* Sidebar ToC */}
            {showSidebar && (
                <aside className="w-full md:w-80 lg:w-96 border-r border-border/40 bg-muted/10 shrink-0 md:h-[calc(100vh-4rem)] md:sticky md:top-16 overflow-y-auto custom-scrollbar flex flex-col shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                    <div className="p-5 border-b border-border/40 backdrop-blur-sm bg-background/50 sticky top-0 z-10">
                        <Button variant="ghost" className="mb-4 pl-0 text-muted-foreground hover:text-foreground group" onClick={() => router.push('/textbooks')}>
                            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" /> 
                            সব বই
                        </Button>
                        <h2 className="font-headline font-bold text-xl leading-tight text-primary">
                            {m.chapter_name || 'অধ্যায়'}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{m.book_name}</p>
                    </div>
                    <div className="p-3 space-y-1">
                         <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-3 py-2">সূচিপত্র</div>
                         <Button variant={activeSection === 'intro' ? 'secondary' : 'ghost'} 
                            className={`w-full justify-start font-normal text-left ${activeSection === 'intro' ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15' : 'hover:bg-muted/50'}`}
                            onClick={() => { setActiveSection('intro'); document.getElementById('intro')?.scrollIntoView({ behavior: 'smooth' }); }}>
                             <BookMarked className="h-4 w-4 mr-3 opacity-70" /> ভূমিকা
                         </Button>
                         {textbook.learning_objectives && (
                            <Button variant={activeSection === 'objectives' ? 'secondary' : 'ghost'} 
                                className={`w-full justify-start font-normal text-left ${activeSection === 'objectives' ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15' : 'hover:bg-muted/50'}`}
                                onClick={() => { setActiveSection('objectives'); document.getElementById('objectives')?.scrollIntoView({ behavior: 'smooth' }); }}>
                                <Target className="h-4 w-4 mr-3 opacity-70" /> শিখনফল
                            </Button>
                         )}
                         {textbook.key_words && (
                             <Button variant={activeSection === 'keywords' ? 'secondary' : 'ghost'} 
                                className={`w-full justify-start font-normal text-left ${activeSection === 'keywords' ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15' : 'hover:bg-muted/50'}`}
                                onClick={() => { setActiveSection('keywords'); document.getElementById('keywords')?.scrollIntoView({ behavior: 'smooth' }); }}>
                                 <KeyRound className="h-4 w-4 mr-3 opacity-70" /> মুখ্য শব্দ
                             </Button>
                         )}
                         
                         <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-3 pt-6 py-2">অধ্যায়সমূহ</div>
                         {sections.map((sec: any, idx: number) => (
                             <Button key={`nav-${idx}`} variant={activeSection === sec.section_no ? 'secondary' : 'ghost'} 
                                className={`w-full justify-start font-normal text-left min-h-10 h-auto py-2 ${activeSection === sec.section_no ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15' : 'hover:bg-muted/50'}`}
                                onClick={() => { setActiveSection(sec.section_no); document.getElementById(`section-${sec.section_no}`)?.scrollIntoView({ behavior: 'smooth' }); }}>
                                <span className="text-xs mr-3 font-mono opacity-50 shrink-0">{sec.section_no}</span>
                                <span className="line-clamp-2">{sec.title}</span>
                             </Button>
                         ))}
                    </div>
                </aside>
            )}

            {/* Main Content Area */}
            <main ref={mainContentRef} className="flex-1 w-full bg-background relative selection:bg-primary/20 selection:text-primary-foreground min-h-screen">
                {/* Mobile TOC Toggle */}
                {!showSidebar && (
                    <div className="sticky top-16 z-20 bg-background/80 backdrop-blur border-b border-border/40 p-4 shrink-0 flex items-center justify-between">
                        <Button variant="outline" size="sm" onClick={() => setShowSidebar(true)}>
                            <List className="h-4 w-4 mr-2" /> সূচিপত্র
                        </Button>
                        <h2 className="font-semibold truncate max-w-[200px]">{m.chapter_name}</h2>
                    </div>
                )}
                
                <div className="max-w-4xl mx-auto p-6 md:p-12 lg:p-16 pb-32">
                     <Button variant="ghost" className="mb-8 md:hidden pl-0 text-muted-foreground" onClick={() => router.push('/textbooks')}>
                         <ChevronLeft className="h-4 w-4 mr-1" /> ফিরে যান
                     </Button>

                     {/* Header Metadata */}
                     <header className="mb-16 space-y-6">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {m.subject && <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">{m.subject}</Badge>}
                            {m.class && <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground shadow-sm"><GraduationCap className="w-3.5 h-3.5 mr-1"/>{m.class}</Badge>}
                            {m.chapter_no && <Badge variant="outline" className="border-border">অধ্যায় {m.chapter_no}</Badge>}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold font-headline leading-tight tracking-tight text-foreground">
                            {m.chapter_name}
                        </h1>
                        {m.chapter_name_english && (
                            <p className="text-xl text-muted-foreground font-medium uppercase tracking-widest">{m.chapter_name_english}</p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border/40 mt-8 text-sm text-muted-foreground">
                            {m.book_name && (
                                <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                                    <BookOpen className="w-4 h-4 text-primary/70" />
                                    <span>{m.book_name}</span>
                                </div>
                            )}
                            {m.author && (
                                <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                                    <User className="w-4 h-4 text-primary/70" />
                                    <span>{m.author}</span>
                                </div>
                            )}
                        </div>
                     </header>

                     {/* Book Content */}
                     <div className="prose prose-slate dark:prose-invert prose-lg max-w-none 
                                    prose-headings:font-headline prose-headings:text-foreground
                                    prose-h2:text-3xl prose-h2:font-bold prose-h2:border-b prose-h2:border-border/40 prose-h2:pb-4 prose-h2:mb-8 prose-h2:mt-16
                                    prose-h3:text-2xl prose-h3:text-primary/90 prose-h3:font-semibold prose-h3:mt-10
                                    prose-p:leading-loose prose-p:text-muted-foreground/90
                                    prose-li:text-muted-foreground/90 prose-li:marker:text-primary/60">
                        {/* Introduction */}
                        {textbook.introduction && (
                            <div id="intro" className="scroll-mt-24">
                                <h2>{textbook.introduction.title}</h2>
                                <p className="text-xl leading-relaxed text-foreground/80 first-letter:text-5xl first-letter:font-bold first-letter:text-primary first-letter:mr-3 first-letter:float-left">
                                    {textbook.introduction.content}
                                </p>
                            </div>
                        )}

                        {/* Learning Objectives */}
                        {textbook.learning_objectives && (
                            <div id="objectives" className="scroll-mt-24 mt-16 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 p-8 rounded-3xl border border-blue-500/10 relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
                                <h3 className="flex items-center gap-3 mt-0 mb-6 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                                    <Target className="w-8 h-8 text-blue-500" />
                                    {textbook.learning_objectives.title}
                                </h3>
                                <ul className="space-y-3">
                                    {textbook.learning_objectives.objectives?.map((obj: string, i: number) => (
                                        <li key={i} className="flex gap-3 items-start text-lg">
                                            <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                                            <span>{obj}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                         {/* Keywords */}
                         {textbook.key_words && (
                            <div id="keywords" className="scroll-mt-24 mt-16">
                                <h3 className="flex items-center gap-2 mb-6">
                                    <KeyRound className="w-6 h-6 text-primary" />
                                    {textbook.key_words.title}
                                </h3>
                                <div className="flex flex-wrap gap-2.5">
                                    {textbook.key_words.words?.map((word: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm font-medium bg-muted hover:bg-muted/80 text-foreground/80 border border-border/50">
                                            {word}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sections Map */}
                        {sections.map((sec: any, idx: number) => (
                            <div key={`sec-${idx}`} id={`section-${sec.section_no}`} className="scroll-mt-24">
                                <h2 className="flex items-baseline gap-4 group">
                                    <span className="text-2xl font-mono text-primary/50 group-hover:text-primary transition-colors">{sec.section_no}</span>
                                    <span>{sec.title}</span>
                                </h2>
                                {sec.title_english && <p className="-mt-6 mb-8 text-lg font-medium text-muted-foreground/60 uppercase tracking-widest">{sec.title_english}</p>}
                                
                                {sec.content && <p>{sec.content}</p>}
                                
                                {/* Deep render all other JSON objects recursively */}
                                <div>
                                    <ObjectRenderer data={sec} />
                                </div>
                                <hr className="my-16 border-border/40" />
                            </div>
                        ))}
                     </div>
                </div>
            </main>

            {/* AI Highlight Hint */}
            <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 sm:left-auto sm:right-8 sm:translate-x-0 sm:bottom-24 bg-card/95 backdrop-blur-md border border-border p-4 rounded-2xl shadow-2xl transition-all duration-300 z-40 max-w-sm ${chatSelectedText && !isChatOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                <div className="flex items-start gap-4">
                    <div className="h-10 w-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">পড়া বুঝতে অসুবিধা হচ্ছে?</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-3 line-clamp-2 italic border-l-2 border-primary/30 pl-2">"{chatSelectedText}"</p>
                        <Button size="sm" className="w-full h-8 text-xs rounded-lg" onClick={() => setIsChatOpen(true)}>
                            এটির ব্যাখ্যা জানতে AI কে জিজ্ঞাসা করুন
                        </Button>
                    </div>
                </div>
            </div>

            {/* AI Chat Button */}
            {!isChatOpen && (
                <AiChatButton onClick={() => {
                    setChatSelectedText(undefined);
                    setIsChatOpen(true);
                }} />
            )}

            {/* AI Chat Panel */}
            <AiChatPanel
                isOpen={isChatOpen}
                onClose={() => {
                    setIsChatOpen(false);
                    setChatSelectedText(undefined);
                }}
                onClear={() => {
                    setChatSelectedText(undefined);
                }}
                questionContext={{ 
                    type: 'textbook',
                    subject: m.subject,
                    chapter: m.chapter_name,
                    title: m.book_name
                }}
                selectedText={chatSelectedText}
            />
        </div>
    );
}
