'use client';

import { useMemo, useState, useCallback, Suspense, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight, Home, Calendar, BookText, ChevronLeft, Lock, LogIn, UserPlus, GraduationCap, Library, ChevronDown, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc, query, where, limit } from 'firebase/firestore';
import { McqCard, type MCQ } from '@/components/questions/mcq-card';
import { CqCard, type BoardQuestion } from '@/components/questions/cq-card';
import { AiChatPanel, AiChatButton } from '@/components/questions/ai-chat-panel';
import { PageLoader, CardSkeleton } from '@/components/ui/page-loader';
import type { UserProfile } from '@/types';
import Link from 'next/link';
import { LwaiLogo } from "@/components/ui/lwai-logo";

type Question = (BoardQuestion | MCQ) & { type: 'cq' | 'mcq' };
const ITEMS_PER_PAGE = 20;

function PaginationControls({ currentPage, totalPages, onPageChange, totalItems }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void; totalItems: number }) {
  if (totalPages <= 1) return null;
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-8">
      <p className="text-sm font-medium text-muted-foreground glass px-4 py-2 rounded-full">
        মোট <span className="text-primary font-bold">{totalItems}</span> টি প্রশ্নের মধ্যে <span className="font-bold text-foreground">{startItem}-{endItem}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="gap-1 rounded-full hover:bg-primary/5"><ChevronLeft className="h-4 w-4" />আগে</Button>
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, i) => typeof page === 'string' ? (
            <span key={`e-${i}`} className="px-2 text-muted-foreground">...</span>
          ) : (
            <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm"
              className={`h-9 w-9 p-0 rounded-full ${currentPage === page ? 'shadow-md shadow-primary/20' : 'hover:bg-primary/5'}`}
              onClick={() => onPageChange(page)}>{page}</Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="gap-1 rounded-full hover:bg-primary/5">পরে<ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function BoardQuestionsWizard() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL State: Class -> Subject -> Chapter -> Year -> Type
    const classLevel = searchParams.get('class') || '';
    const subject = searchParams.get('subject') || '';
    const chapter = searchParams.get('chapter') || '';
    const year = searchParams.get('year') || '';
    const type = searchParams.get('type') || '';
    const showModal = searchParams.get('modal') === 'type';

    const [isPending, startTransition] = useTransition();

    const updateUrl = (params: Record<string, string | null>) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        for (const [key, value] of Object.entries(params)) {
             if (value === null) current.delete(key);
             else current.set(key, value);
        }
        startTransition(() => {
            router.push(`${pathname}?${current.toString()}`);
        });
    };

    const selectClass = (c: string) => updateUrl({ class: c, subject: null, chapter: null, year: null, type: null, modal: null });
    const selectSubject = (s: string) => updateUrl({ subject: s, chapter: null, year: null, type: null, modal: null });
    const selectChapter = (c: string) => updateUrl({ chapter: c, year: null, type: null, modal: null });
    const selectYear = (y: string) => updateUrl({ year: y, modal: 'type' });
    const selectType = (t: string) => updateUrl({ type: t, modal: null });
    const closeModal = () => updateUrl({ modal: null });

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const isAdmin = userProfile?.role === 'admin';
    const isLoggedIn = !!user;

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatContext, setChatContext] = useState<any>(null);
    const [chatSelectedText, setChatSelectedText] = useState<string | undefined>(undefined);
    const [visibleCount, setVisibleCount] = useState(1);
    const [boardFilter, setBoardFilter] = useState('');

    // Reset pagination when filters change
    useMemo(() => {
        setVisibleCount(1);
        setBoardFilter('');
    }, [classLevel, subject, chapter, year, type]);

    // --- DATA QUERIES (all from database, zero hardcoded data) ---

    // Step 1: Fetch all data to extract unique classes (initial load)
    const classQuery = useMemoFirebase(() => (!classLevel && firestore) ? query(collection(firestore, 'boardQuestions'), limit(500)) : null, [firestore, classLevel]);
    const { data: classPoolCq, isLoading: classPoolLoading } = useCollection(classQuery);

    const classQueryMcq = useMemoFirebase(() => (!classLevel && firestore) ? query(collection(firestore, 'mcqs'), limit(500)) : null, [firestore, classLevel]);
    const { data: classPoolMcq } = useCollection(classQueryMcq);

    // Step 2: Fetch by class to get subjects
    const subjectQueryCq = useMemoFirebase(() => (classLevel && !subject && firestore) ? query(collection(firestore, 'boardQuestions'), where('class', '==', classLevel), limit(500)) : null, [firestore, classLevel, subject]);
    const { data: subjectPoolCq, isLoading: subjectPoolLoading } = useCollection(subjectQueryCq);

    const subjectQueryMcq = useMemoFirebase(() => (classLevel && !subject && firestore) ? query(collection(firestore, 'mcqs'), where('class', '==', classLevel), limit(500)) : null, [firestore, classLevel, subject]);
    const { data: subjectPoolMcq } = useCollection(subjectQueryMcq);

    // Step 3: Fetch by class+subject to get chapters and years
    const chapterQueryCq = useMemoFirebase(() => (classLevel && subject && firestore) ? query(collection(firestore, 'boardQuestions'), where('class', '==', classLevel), where('subject', '==', subject), limit(500)) : null, [firestore, classLevel, subject]);
    const { data: chapterPoolCq, isLoading: chapterPoolLoading } = useCollection(chapterQueryCq);

    const chapterQueryMcq = useMemoFirebase(() => (classLevel && subject && firestore) ? query(collection(firestore, 'mcqs'), where('class', '==', classLevel), where('subject', '==', subject), limit(500)) : null, [firestore, classLevel, subject]);
    const { data: chapterPoolMcq } = useCollection(chapterQueryMcq);

    // Dynamic lists - all from database
    const dynamicClasses = useMemo(() => {
        const set = new Set<string>();
        [...(classPoolCq || []), ...(classPoolMcq || [])].forEach((q: any) => { if (q.class) set.add(q.class); });
        return Array.from(set).sort();
    }, [classPoolCq, classPoolMcq]);

    const dynamicSubjects = useMemo(() => {
        const set = new Set<string>();
        [...(subjectPoolCq || []), ...(subjectPoolMcq || [])].forEach((q: any) => { if (q.subject) set.add(q.subject); });
        return Array.from(set).sort();
    }, [subjectPoolCq, subjectPoolMcq]);

    const dynamicChapters = useMemo(() => {
        const set = new Set<string>();
        [...(chapterPoolCq || []), ...(chapterPoolMcq || [])].forEach((q: any) => { if (q.chapter) set.add(q.chapter); });
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [chapterPoolCq, chapterPoolMcq]);

    const dynamicYears = useMemo(() => {
        if (!chapter) return [];
        const set = new Set<string>();
        [...(chapterPoolCq || []), ...(chapterPoolMcq || [])].forEach((q: any) => {
            if (q.chapter === chapter && q.year) set.add(String(q.year));
        });
        return Array.from(set).sort((a, b) => Number(b) - Number(a));
    }, [chapterPoolCq, chapterPoolMcq, chapter]);

    // Final question list (client-filtered from already-fetched data)
    const questionsList = useMemo((): Question[] => {
        if (!type || !chapter || !year) return [];
        const sourceData = type === 'cq' ? chapterPoolCq : chapterPoolMcq;
        if (!sourceData) return [];
        
        // Filter by common criteria
        let list = sourceData
            .filter((q: any) => q.chapter === chapter && String(q.year) === year)
            .map((q: any) => ({ ...q, type: type as 'cq' | 'mcq', class: q.class || 'N/A' }));

        // Apply Board Filter if set
        if (boardFilter && boardFilter !== 'All') {
            list = list.filter((q: any) => q.board === boardFilter);
        }

        return list as Question[];
    }, [chapterPoolCq, chapterPoolMcq, type, chapter, year, boardFilter]);

    // Available boards for the current set of questions (for the filter UI)
    const availableBoards = useMemo(() => {
        if (!type || !chapter || !year) return [];
        const sourceData = type === 'cq' ? chapterPoolCq : chapterPoolMcq;
        if (!sourceData) return [];
        const boards = new Set<string>();
        sourceData
            .filter((q: any) => q.chapter === chapter && String(q.year) === year)
            .forEach((q: any) => { if (q.board) boards.add(q.board); });
        return Array.from(boards).sort();
    }, [chapterPoolCq, chapterPoolMcq, type, chapter, year]);

    const displayedQuestions = questionsList.slice(0, visibleCount);

    const handleAskAI = useCallback((questionContext: any, selectedText?: string) => {
        setChatContext(questionContext);
        setChatSelectedText(selectedText);
        setIsChatOpen(true);
    }, []);

    // Loading state
    if (isUserLoading) {
        return <PageLoader text="অনুগ্রহ করে অপেক্ষা করুন..." />;
    }

    // Login wall
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen">
                <section className="relative overflow-hidden border-b border-border/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                    <div className="container mx-auto px-4 py-16 md:py-24 relative">
                        <div className="flex flex-col items-center text-center max-w-2xl mx-auto animate-fade-in">
                            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6"><Lock className="h-10 w-10 text-primary" /></div>
                            <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">লগইন প্রয়োজন</h1>
                            <p className="text-muted-foreground text-lg mb-8 max-w-md">প্রশ্ন ব্যাংক দেখতে এবং AI সাহায্য পেতে আপনাকে প্রথমে লগইন করতে হবে।</p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/login" className="liquid-btn liquid-btn-primary"><LogIn className="h-5 w-5" />লগইন করুন</Link>
                                <Link href="/signup" className="liquid-btn"><UserPlus className="h-5 w-5" />নতুন একাউন্ট খুলুন</Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Breadcrumb */}
            <div className="sticky top-14 z-40 bg-background/80 backdrop-blur-md border-b border-border/40 px-4 py-4">
               <div className="container mx-auto max-w-5xl flex items-center gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap text-sm font-medium">
                   <Link href="/question-bank" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 focus:outline-none"><Home className="h-4 w-4" /> হোম</Link>
                   <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                   <button onClick={() => updateUrl({ class: null, subject: null, chapter: null, year: null, type: null, modal: null })} className={`hover:text-primary transition-colors focus:outline-none ${!classLevel ? 'text-primary drop-shadow-[0_0_8px_rgba(79,156,249,0.5)]' : 'text-muted-foreground'}`}>বোর্ড প্রশ্ন</button>

                   {classLevel && (<><ChevronRight className="h-4 w-4 text-muted-foreground/40" /><button onClick={() => updateUrl({ subject: null, chapter: null, year: null, type: null, modal: null })} className={`hover:text-primary transition-colors focus:outline-none ${!subject ? 'text-primary drop-shadow-[0_0_8px_rgba(79,156,249,0.5)]' : 'text-muted-foreground'}`}>{classLevel}</button></>)}
                   {subject && (<><ChevronRight className="h-4 w-4 text-muted-foreground/40" /><button onClick={() => updateUrl({ chapter: null, year: null, type: null, modal: null })} className={`hover:text-primary transition-colors focus:outline-none ${!chapter ? 'text-primary drop-shadow-[0_0_8px_rgba(79,156,249,0.5)]' : 'text-muted-foreground'}`}>{subject}</button></>)}
                   {chapter && (<><ChevronRight className="h-4 w-4 text-muted-foreground/40" /><button onClick={() => updateUrl({ year: null, type: null, modal: null })} className={`hover:text-primary transition-colors focus:outline-none ${!year ? 'text-primary drop-shadow-[0_0_8px_rgba(79,156,249,0.5)]' : 'text-muted-foreground'}`}>{chapter}</button></>)}
                   {year && (<><ChevronRight className="h-4 w-4 text-muted-foreground/40" /><button onClick={() => updateUrl({ type: null, modal: 'type' })} className={`hover:text-primary transition-colors focus:outline-none ${!type ? 'text-primary drop-shadow-[0_0_8px_rgba(79,156,249,0.5)]' : 'text-muted-foreground'}`}>{year}</button></>)}
                   {type && (<><ChevronRight className="h-4 w-4 text-muted-foreground/40" /><span className="text-primary drop-shadow-[0_0_8px_rgba(79,156,249,0.5)] uppercase">{type}</span></>)}
               </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-5xl">

                {/* STEP 1: শ্রেণী নির্বাচন করুন */}
                {!classLevel && (
                    <div className="animate-fade-in">
                        <h2 className="text-xl md:text-2xl font-bold font-headline mb-6 text-foreground/90">শ্রেণী নির্বাচন করুন</h2>
                        {classPoolLoading ? (
                             <div className="flex flex-col items-center justify-center py-20">
                               <LwaiLogo size="default" className="animate-pulse" />
                               <p className="text-muted-foreground mt-6 font-medium">তথ্য লোড হচ্ছে...</p>
                             </div>
                        ) : dynamicClasses.length === 0 ? (
                            <div className="text-muted-foreground text-center py-20 bg-muted/10 rounded-2xl">ডাটাবেসে কোনো শ্রেণী পাওয়া যায়নি।</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {dynamicClasses.map((c, i) => (
                                    <button key={c} onClick={() => selectClass(c)} className="text-left w-full group stagger-item" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <div className="liquid-card p-4 flex items-center gap-4">
                                            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors border border-primary/20">
                                                <GraduationCap className="h-5 w-5 text-primary" />
                                            </div>
                                            <span className="font-medium text-foreground/80 group-hover:text-foreground text-sm transition-colors">{c}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 2: বিষয় নির্বাচন করুন */}
                {classLevel && !subject && (
                    <div className="animate-slide-in-up">
                        <h2 className="text-xl md:text-2xl font-bold font-headline mb-6 text-foreground/90">বিষয় নির্বাচন করুন</h2>
                        {subjectPoolLoading ? (
                             <div className="flex flex-col items-center justify-center py-20">
                               <LwaiLogo size="default" className="animate-pulse" />
                               <p className="text-muted-foreground mt-6 font-medium">তথ্য লোড হচ্ছে...</p>
                             </div>
                        ) : dynamicSubjects.length === 0 ? (
                            <div className="text-muted-foreground text-center py-20 bg-muted/10 rounded-2xl">এই শ্রেণীর জন্য কোনো বিষয় পাওয়া যায়নি।</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {dynamicSubjects.map((s, i) => (
                                    <button key={s} onClick={() => selectSubject(s)} className="text-left w-full group stagger-item" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <div className="liquid-card p-4 flex items-center gap-4">
                                            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors border border-primary/20">
                                                <BookText className="h-5 w-5 text-primary" />
                                            </div>
                                            <span className="font-medium text-foreground/80 group-hover:text-foreground text-sm leading-tight transition-colors">{s}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: অধ্যায় নির্বাচন করুন */}
                {classLevel && subject && !chapter && (
                    <div className="animate-slide-in-up">
                        <h2 className="text-xl md:text-2xl font-bold font-headline mb-6 text-foreground/90">অধ্যায় নির্বাচন করুন</h2>
                        {chapterPoolLoading ? (
                             <div className="flex flex-col items-center justify-center py-20">
                               <LwaiLogo size="default" className="animate-pulse" />
                               <p className="text-muted-foreground mt-6 font-medium">তথ্য লোড হচ্ছে...</p>
                             </div>
                        ) : dynamicChapters.length === 0 ? (
                            <div className="text-muted-foreground text-center py-20 bg-muted/10 rounded-2xl">এই বিষয়ে কোনো অধ্যায় পাওয়া যায়নি।</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {dynamicChapters.map((c, i) => (
                                    <button key={c} onClick={() => selectChapter(c)} className="text-left w-full group stagger-item" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <div className="liquid-card p-4 flex items-center gap-4">
                                            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors border border-primary/20">
                                                <Library className="h-5 w-5 text-primary" />
                                            </div>
                                            <span className="font-medium text-foreground/80 group-hover:text-foreground text-sm transition-colors">{c}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 4: সাল নির্বাচন করুন */}
                {classLevel && subject && chapter && !year && (
                    <div className="animate-slide-in-up">
                        <h2 className="text-xl md:text-2xl font-bold font-headline mb-6 text-foreground/90">সাল নির্বাচন করুন</h2>
                        {chapterPoolLoading ? (
                             <div className="flex flex-col items-center justify-center py-20">
                               <LwaiLogo size="default" className="animate-pulse" />
                               <p className="text-muted-foreground mt-6 font-medium">তথ্য লোড হচ্ছে...</p>
                             </div>
                        ) : dynamicYears.length === 0 ? (
                            <div className="text-muted-foreground text-center py-20 bg-muted/10 rounded-2xl">এই অধ্যায়ের জন্য কোনো সাল পাওয়া যায়নি।</div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {dynamicYears.map((y, i) => (
                                    <button key={y} onClick={() => selectYear(y)} className="group stagger-item" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <div className="liquid-card aspect-square flex flex-col items-center justify-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors border border-primary/20">
                                                <Calendar className="h-6 w-6 text-primary" />
                                            </div>
                                            <span className="font-bold text-lg text-foreground/80 group-hover:text-foreground transition-colors">{y}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 5: FINAL QUESTION LIST */}
                {classLevel && subject && chapter && year && type && (
                    <div className="animate-slide-in-up space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold font-headline text-foreground">প্রশ্ন তালিকা</h2>
                                <Badge variant="secondary" className="rounded-full px-3">{questionsList.length} টি প্রশ্ন</Badge>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {/* Board Filter Dropdown */}
                                {availableBoards.length > 1 && (
                                    <div className="flex items-center gap-2 mr-2">
                                        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">বোর্ড:</span>
                                        <Select value={boardFilter || 'All'} onValueChange={setBoardFilter}>
                                            <SelectTrigger className="h-8 w-[140px] text-xs glass border-white/10">
                                                <SelectValue placeholder="সব বোর্ড" />
                                            </SelectTrigger>
                                            <SelectContent className="glass-strong">
                                                <SelectItem value="All">সব বোর্ড</SelectItem>
                                                {availableBoards.map(board => (
                                                    <SelectItem key={board} value={board}>{board}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <button onClick={() => updateUrl({ type: null, modal: 'type' })} className="liquid-btn text-xs py-2 px-4 shadow-sm">ধরণ পরিবর্তন করুন</button>
                            </div>
                        </div>

                        {chapterPoolLoading ? (
                             <div className="flex flex-col items-center justify-center py-20">
                               <LwaiLogo size="default" className="animate-pulse" />
                               <p className="text-muted-foreground mt-6 font-medium">প্রশ্ন লোড হচ্ছে...</p>
                             </div>
                        ) : questionsList.length === 0 ? (
                            <div className="text-center py-20 bg-muted/5 border border-white/5 rounded-3xl animate-fade-in">
                                <AlertCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                                <h3 className="text-xl font-bold mb-2">কোনো প্রশ্ন পাওয়া যায়নি</h3>
                                <p className="text-muted-foreground text-sm">আপাতত এই ফিল্টারে কোনো প্রশ্ন যুক্ত করা হয়নি।</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {displayedQuestions.map((q, idx) => {
                                    return q.type === 'mcq'
                                        ? <McqCard key={q.id} mcq={q as MCQ} index={idx + 1} isAdmin={isAdmin} onAskAI={handleAskAI} />
                                        : <CqCard key={q.id} cq={q as BoardQuestion} index={idx + 1} isAdmin={isAdmin} onAskAI={handleAskAI} />
                                })}
                                
                                {visibleCount < questionsList.length && (
                                    <div className="flex justify-center pt-4 pb-10">
                                        <Button 
                                            onClick={() => setVisibleCount(prev => prev + 1)}
                                            size="lg"
                                            className="liquid-btn h-14 px-10 rounded-2xl group relative overflow-hidden"
                                        >
                                            <div className="flex items-center gap-3 relative z-10">
                                                <span className="text-base font-bold">পরবর্তী প্রশ্ন দেখুন</span>
                                                <ChevronDown className="h-5 w-5 transition-transform group-hover:translate-y-1" />
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-10 transition-opacity" />
                                        </Button>
                                    </div>
                                )}

                                {visibleCount >= questionsList.length && questionsList.length > 0 && (
                                    <p className="text-center text-muted-foreground text-sm font-medium py-10 italic">
                                        এই অধ্যায়ের সকল প্রশ্ন দেখানো হয়েছে।
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Type selection modal — NOW CLOSES ON OUTSIDE CLICK */}
            <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); }}>
                <DialogContent 
                  className="sm:max-w-[425px] glass-strong border-white/10"
                  onInteractOutside={(e) => e.preventDefault()}
                  onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold font-headline text-center">প্রশ্নের ধরণ নির্বাচন করুন</DialogTitle>
                        <p className="text-xs text-muted-foreground text-center mt-1">{classLevel} · {subject} · {chapter} · {year}</p>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                         <button onClick={() => selectType('mcq')} className="text-left group">
                             <div className="liquid-card p-4 flex items-center gap-4 group-hover:border-primary/30">
                                 <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                     <div className="flex flex-col gap-1 items-center justify-center">
                                         <span className="text-[10px] uppercase font-bold text-primary">MCQ</span>
                                         <div className="w-4 h-1 bg-primary/40 rounded-full" />
                                     </div>
                                 </div>
                                 <div><h3 className="font-bold text-foreground">MCQ</h3><p className="text-xs text-muted-foreground mt-0.5">বহুনির্বাচনী প্রশ্নমালা</p></div>
                             </div>
                         </button>
                         <button onClick={() => selectType('cq')} className="text-left group">
                             <div className="liquid-card p-4 flex items-center gap-4 group-hover:border-accent/30">
                                 <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                                     <div className="flex flex-col gap-1 items-center justify-center">
                                         <span className="text-[10px] uppercase font-bold text-accent">CQ</span>
                                         <div className="w-4 h-1 bg-accent/40 rounded-full" />
                                     </div>
                                 </div>
                                 <div><h3 className="font-bold text-foreground">CQ</h3><p className="text-xs text-muted-foreground mt-0.5">সৃজনশীল প্রশ্নমালা</p></div>
                             </div>
                         </button>
                    </div>
                </DialogContent>
            </Dialog>

            <AiChatButton onClick={() => { setChatContext(null); setChatSelectedText(undefined); setIsChatOpen(true); }} />
            <AiChatPanel isOpen={isChatOpen} onClose={() => { setIsChatOpen(false); setChatSelectedText(undefined); }} onClear={() => { setChatContext(null); setChatSelectedText(undefined); }} questionContext={chatContext} selectedText={chatSelectedText} />
            
            {/* Global navigation loading overlay */}
            {isPending && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
                    <div className="flex flex-col items-center">
                        <LwaiLogo size="lg" className="animate-pulse scale-125 md:scale-150" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BoardQuestionsPage() {
    return (
        <Suspense fallback={<PageLoader text="প্রশ্ন লোড হচ্ছে..." />}>
            <BoardQuestionsWizard />
        </Suspense>
    )
}
