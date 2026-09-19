'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { collection, doc, limit, query, where } from 'firebase/firestore';
import { AlertCircle, Calendar, CheckCircle2, ChevronDown, ChevronRight, GraduationCap, Home, Lock, LogIn, RotateCcw, UserPlus } from 'lucide-react';

import { AiChatButton, AiChatPanel } from '@/components/questions/ai-chat-panel';
import { CqCard, type BoardQuestion } from '@/components/questions/cq-card';
import { McqCard, type MCQ } from '@/components/questions/mcq-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LwaiLogo } from '@/components/ui/lwai-logo';
import { PageLoader } from '@/components/ui/page-loader';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { UserProfile } from '@/types';

type UniversityQuestion = (BoardQuestion | MCQ) & {
  type: 'cq' | 'mcq';
  universityName?: string;
  university?: string;
  institution?: string;
};

const ITEMS_PER_STEP = 20;

function getUniversityName(question: any): string {
  return question.universityName || question.university || question.institution || question.board || 'Unknown University';
}

function UniversityQuestionsWizard() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const university = searchParams.get('university') || '';
  const year = searchParams.get('year') || '';
  const [isPending, startTransition] = useTransition();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<any>(null);
  const [chatSelectedText, setChatSelectedText] = useState<string | undefined>(undefined);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_STEP);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const updateUrl = (params: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    for (const [key, value] of Object.entries(params)) {
      if (value === null) current.delete(key);
      else current.set(key, value);
    }
    const queryString = current.toString();
    startTransition(() => {
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    });
  };

  const selectUniversity = (name: string) => updateUrl({ university: name, year: null });
  const selectYear = (selectedYear: string) => updateUrl({ year: selectedYear });

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const isAdmin = userProfile?.role === 'admin';
  const isLoggedIn = !!user;

  const cqQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'boardQuestions'), where('questionType', '==', 'university-questions'), limit(1000)) : null,
    [firestore]
  );
  const { data: universityCqs, isLoading: cqLoading } = useCollection(cqQuery);

  const mcqQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'mcqs'), where('questionType', '==', 'university-questions'), limit(1000)) : null,
    [firestore]
  );
  const { data: universityMcqs, isLoading: mcqLoading } = useCollection(mcqQuery);

  const allQuestions = useMemo((): UniversityQuestion[] => {
    const cqs = (universityCqs || []).map((q: any) => ({ ...q, type: 'cq' as const, board: getUniversityName(q) }));
    const mcqs = (universityMcqs || []).map((q: any) => ({ ...q, type: 'mcq' as const, board: getUniversityName(q) }));
    return [...cqs, ...mcqs];
  }, [universityCqs, universityMcqs]);

  const universities = useMemo(() => {
    const names = new Set<string>();
    allQuestions.forEach((question) => names.add(getUniversityName(question)));
    return Array.from(names).sort();
  }, [allQuestions]);

  const years = useMemo(() => {
    if (!university) return [];
    const values = new Set<string>();
    allQuestions
      .filter((question) => getUniversityName(question) === university)
      .forEach((question) => {
        if (question.year) values.add(String(question.year));
      });
    return Array.from(values).sort((a, b) => Number(b) - Number(a));
  }, [allQuestions, university]);

  const questionsList = useMemo(() => {
    if (!university || !year) return [];
    return allQuestions.filter((question) => (
      getUniversityName(question) === university && String(question.year) === year
    ));
  }, [allQuestions, university, year]);

  const displayedQuestions = questionsList.slice(0, visibleCount);
  const displayedMcqs = useMemo(
    () => displayedQuestions.filter((question) => question.type === 'mcq') as (UniversityQuestion & MCQ)[],
    [displayedQuestions]
  );
  const testScore = useMemo(() => {
    return displayedMcqs.reduce((score, question) => {
      const correctAnswerIndex = Number.isInteger(question.correctAnswerIndex) ? question.correctAnswerIndex : 0;
      return selectedAnswers[question.id] === correctAnswerIndex ? score + 1 : score;
    }, 0);
  }, [displayedMcqs, selectedAnswers]);
  const isLoading = cqLoading || mcqLoading;

  useEffect(() => {
    setVisibleCount(ITEMS_PER_STEP);
    setIsTestMode(false);
    setTestSubmitted(false);
    setSelectedAnswers({});
  }, [university, year]);

  const startTestMode = () => {
    setIsTestMode(true);
    setTestSubmitted(false);
    setSelectedAnswers({});
  };

  const exitTestMode = () => {
    setIsTestMode(false);
    setTestSubmitted(false);
    setSelectedAnswers({});
  };

  const loadMoreQuestions = () => {
    setVisibleCount((previous) => previous + ITEMS_PER_STEP);
    setTestSubmitted(false);
    setSelectedAnswers({});
  };

  const handleAskAI = useCallback((questionContext: any, selectedText?: string) => {
    setChatContext(questionContext);
    setChatSelectedText(selectedText);
    setIsChatOpen(true);
  }, []);

  if (isUserLoading) {
    return <PageLoader text="অনুগ্রহ করে অপেক্ষা করুন..." />;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen">
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="container mx-auto px-4 py-16 md:py-24 relative">
            <div className="flex flex-col items-center text-center max-w-2xl mx-auto animate-fade-in">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6">
                <Lock className="h-10 w-10 text-primary" />
              </div>
              <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">লগইন প্রয়োজন</h1>
              <p className="text-muted-foreground text-lg mb-8 max-w-md">ইউনিভার্সিটি প্রশ্ন দেখতে আপনাকে প্রথমে লগইন করতে হবে।</p>
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
      <div className="sticky top-14 z-40 bg-background/80 backdrop-blur-md border-b border-border/40 px-4 py-4">
        <div className="container mx-auto max-w-5xl flex items-center gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap text-sm font-medium">
          <Link href="/question-bank" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 focus:outline-none">
            <Home className="h-4 w-4" /> হোম
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          <button onClick={() => updateUrl({ university: null, year: null })} className={`hover:text-primary transition-colors focus:outline-none ${!university ? 'text-primary drop-shadow-[0_0_8px_rgba(79,156,249,0.5)]' : 'text-muted-foreground'}`}>
            ইউনিভার্সিটি প্রশ্ন
          </button>
          {university && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              <button onClick={() => updateUrl({ year: null })} className={`hover:text-primary transition-colors focus:outline-none ${!year ? 'text-primary drop-shadow-[0_0_8px_rgba(79,156,249,0.5)]' : 'text-muted-foreground'}`}>
                {university}
              </button>
            </>
          )}
          {year && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              <span className="text-primary drop-shadow-[0_0_8px_rgba(79,156,249,0.5)]">{year}</span>
            </>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {!university && (
          <div className="animate-fade-in">
            <h2 className="text-xl md:text-2xl font-bold font-headline mb-6 text-foreground/90">ইউনিভার্সিটি নির্বাচন করুন</h2>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <LwaiLogo size="default" className="animate-pulse" />
                <p className="text-muted-foreground mt-6 font-medium">তথ্য লোড হচ্ছে...</p>
              </div>
            ) : universities.length === 0 ? (
              <div className="text-muted-foreground text-center py-20 bg-muted/10 rounded-2xl">ডাটাবেসে কোনো ইউনিভার্সিটি প্রশ্ন পাওয়া যায়নি।</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {universities.map((name, index) => (
                  <button key={name} onClick={() => selectUniversity(name)} className="text-left w-full group stagger-item" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="liquid-card p-4 flex items-center gap-4">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors border border-primary/20">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground/80 group-hover:text-foreground text-sm transition-colors">{name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {university && !year && (
          <div className="animate-slide-in-up">
            <h2 className="text-xl md:text-2xl font-bold font-headline mb-6 text-foreground/90">প্রশ্নের সাল নির্বাচন করুন</h2>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <LwaiLogo size="default" className="animate-pulse" />
                <p className="text-muted-foreground mt-6 font-medium">তথ্য লোড হচ্ছে...</p>
              </div>
            ) : years.length === 0 ? (
              <div className="text-muted-foreground text-center py-20 bg-muted/10 rounded-2xl">এই ইউনিভার্সিটির জন্য কোনো সাল পাওয়া যায়নি।</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {years.map((item, index) => (
                  <button key={item} onClick={() => selectYear(item)} className="group stagger-item" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="liquid-card aspect-square flex flex-col items-center justify-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors border border-primary/20">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <span className="font-bold text-lg text-foreground/80 group-hover:text-foreground transition-colors">{item}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {university && year && (
          <div className="animate-slide-in-up space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold font-headline text-foreground">{university} {year}</h2>
                <Badge variant="secondary" className="rounded-full px-3">{questionsList.length} টি প্রশ্ন</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {displayedMcqs.length > 0 && (
                  isTestMode ? (
                    <Button variant="outline" size="sm" onClick={exitTestMode} className="gap-2 rounded-full">
                      <RotateCcw className="h-4 w-4" />
                      লার্ন মোড
                    </Button>
                  ) : (
                    <Button size="sm" onClick={startTestMode} className="gap-2 rounded-full">
                      <CheckCircle2 className="h-4 w-4" />
                      Test yourself
                    </Button>
                  )
                )}
                <button onClick={() => updateUrl({ year: null })} className="liquid-btn text-xs py-2 px-4 shadow-sm">সাল পরিবর্তন করুন</button>
              </div>
            </div>

            {isTestMode && displayedMcqs.length > 0 && (
              <div className="liquid-card p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">Test yourself</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    উত্তর লুকানো আছে। {displayedMcqs.length} টি MCQ শেষ করে স্কোর দেখুন।
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3">
                    উত্তর দিয়েছেন {Object.keys(selectedAnswers).length}/{displayedMcqs.length}
                  </Badge>
                  {testSubmitted && (
                    <Badge className="rounded-full px-3">
                      স্কোর {testScore}/{displayedMcqs.length}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setTestSubmitted(true)}
                    disabled={testSubmitted}
                    className="rounded-full"
                  >
                    স্কোর দেখুন
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
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
                {displayedQuestions.map((question, index) => (
                  question.type === 'mcq'
                    ? (
                      <McqCard
                        key={`${question.id}-${isTestMode ? 'test' : 'learn'}-${testSubmitted ? 'done' : 'open'}`}
                        mcq={question as MCQ}
                        index={index + 1}
                        isAdmin={isAdmin}
                        onAskAI={handleAskAI}
                        collectionName="mcqs"
                        showAnswerByDefault={!isTestMode}
                        testMode={isTestMode && !testSubmitted}
                        selectedAnswer={selectedAnswers[question.id] ?? null}
                        onSelectAnswer={(optionIndex) => {
                          if (testSubmitted) return;
                          setSelectedAnswers((previous) => ({ ...previous, [question.id]: optionIndex }));
                        }}
                        revealAnswer={testSubmitted}
                      />
                    )
                    : <CqCard key={question.id} cq={question as BoardQuestion} index={index + 1} isAdmin={isAdmin} onAskAI={handleAskAI} collectionName="boardQuestions" />
                ))}

                {visibleCount < questionsList.length && (
                  <div className="flex justify-center pt-4 pb-10">
                    <Button onClick={loadMoreQuestions} size="lg" className="liquid-btn h-14 px-10 rounded-2xl group relative overflow-hidden">
                      <div className="flex items-center gap-3 relative z-10">
                        <span className="text-base font-bold">আরও ২০টি প্রশ্ন দেখুন</span>
                        <ChevronDown className="h-5 w-5 transition-transform group-hover:translate-y-1" />
                      </div>
                    </Button>
                  </div>
                )}

                {visibleCount >= questionsList.length && questionsList.length > 0 && (
                  <p className="text-center text-muted-foreground text-sm font-medium py-10 italic">
                    এই বছরের সকল প্রশ্ন দেখানো হয়েছে।
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <AiChatButton onClick={() => { setChatContext(null); setChatSelectedText(undefined); setIsChatOpen(true); }} />
      <AiChatPanel isOpen={isChatOpen} onClose={() => { setIsChatOpen(false); setChatSelectedText(undefined); }} onClear={() => { setChatContext(null); setChatSelectedText(undefined); }} questionContext={chatContext} selectedText={chatSelectedText} />

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

export default function UniversityQuestionsPage() {
  return (
    <Suspense fallback={<PageLoader text="প্রশ্ন লোড হচ্ছে..." />}>
      <UniversityQuestionsWizard />
    </Suspense>
  );
}
