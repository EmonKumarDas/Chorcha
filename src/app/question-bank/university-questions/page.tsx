'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { collection, doc, limit, query, where } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowUp,
  Award,
  BookOpen,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Compass,
  Dna,
  Eye,
  FlaskConical,
  GraduationCap,
  Home,
  Languages,
  Layers,
  Lock,
  LogIn,
  RotateCcw,
  Search,
  Sparkles,
  UserPlus,
  Zap,
} from 'lucide-react';

import { AiChatButton, AiChatPanel } from '@/components/questions/ai-chat-panel';
import { CqCard, type BoardQuestion } from '@/components/questions/cq-card';
import { McqCard, type MCQ } from '@/components/questions/mcq-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface SubjectConfig {
  canonicalEn: string;
  canonicalBn: string;
  IconComponent: any;
  colorName: string;
  borderClass: string;
  bgGradient: string;
  iconBg: string;
  iconColor: string;
  badgeStyle: string;
  glowShadow: string;
}

const SUBJECT_ORDER = [
  'chemistry',
  'রসায়ন',
  'রসায়ন',
  'physics',
  'পদার্থবিজ্ঞান',
  'biology',
  'জীববিজ্ঞান',
  'higher math',
  'higher mathematics',
  'উচ্চতর গণিত',
  'math',
  'mathematics',
  'গণিত',
  'english',
  'ইংরেজি',
  'bangla',
  'বাংলা',
  'general knowledge',
  'সাধারণ জ্ঞান',
];

const UNIVERSITY_INFO: Record<string, { short: string; fullName: string; gradient: string }> = {
  CUET: {
    short: 'CUET',
    fullName: 'চট্টগ্রাম প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়',
    gradient: 'from-blue-600/20 via-cyan-500/15 to-indigo-600/20',
  },
  BUET: {
    short: 'BUET',
    fullName: 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়',
    gradient: 'from-amber-600/20 via-orange-500/15 to-red-600/20',
  },
  DU: {
    short: 'DU',
    fullName: 'ঢাকা বিশ্ববিদ্যালয়',
    gradient: 'from-emerald-600/20 via-teal-500/15 to-cyan-600/20',
  },
  RUET: {
    short: 'RUET',
    fullName: 'রাজশাহী প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়',
    gradient: 'from-rose-600/20 via-pink-500/15 to-purple-600/20',
  },
  KUET: {
    short: 'KUET',
    fullName: 'খুলনা প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়',
    gradient: 'from-violet-600/20 via-indigo-500/15 to-blue-600/20',
  },
  JU: {
    short: 'JU',
    fullName: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়',
    gradient: 'from-lime-600/20 via-green-500/15 to-emerald-600/20',
  },
  RU: {
    short: 'RU',
    fullName: 'রাজশাহী বিশ্ববিদ্যালয়',
    gradient: 'from-sky-600/20 via-blue-500/15 to-indigo-600/20',
  },
  CU: {
    short: 'CU',
    fullName: 'চট্টগ্রাম বিশ্ববিদ্যালয়',
    gradient: 'from-teal-600/20 via-cyan-500/15 to-blue-600/20',
  },
  GST: {
    short: 'GST',
    fullName: 'সাধারণ ও বিজ্ঞান প্রযুক্তি গুচ্ছ বিশ্ববিদ্যালয়',
    gradient: 'from-fuchsia-600/20 via-pink-500/15 to-purple-600/20',
  },
  Medical: {
    short: 'MED',
    fullName: 'মেডিকেল ও ডেন্টাল ভর্তি পরীক্ষা',
    gradient: 'from-red-600/20 via-rose-500/15 to-pink-600/20',
  },
};

function getUniversityName(question: any): string {
  return (
    question.universityName ||
    question.university ||
    question.institution ||
    question.board ||
    'Unknown University'
  );
}

function getSubjectName(question: any): string {
  return question.subject?.trim() || 'অন্যান্য';
}

function getSubjectSortIndex(subject: string): number {
  const normalized = subject.trim().toLowerCase();
  const index = SUBJECT_ORDER.findIndex((item) => normalized.includes(item.toLowerCase()));
  return index === -1 ? SUBJECT_ORDER.length : index;
}

function getSubjectConfig(subjectRaw: string): SubjectConfig {
  const lower = subjectRaw.trim().toLowerCase();

  if (lower.includes('chem') || lower.includes('রসায়ন') || lower.includes('রসায়ন')) {
    return {
      canonicalEn: 'Chemistry',
      canonicalBn: 'রসায়ন',
      IconComponent: FlaskConical,
      colorName: 'emerald',
      borderClass: 'border-emerald-500/30 hover:border-emerald-500/50',
      bgGradient: 'from-emerald-500/15 via-teal-500/5 to-transparent',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30 shadow-emerald-500/10',
      iconColor: 'text-emerald-400',
      badgeStyle: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      glowShadow: 'shadow-[0_0_25px_rgba(16,185,129,0.12)]',
    };
  }

  if (lower.includes('phy') || lower.includes('পদার্থ')) {
    return {
      canonicalEn: 'Physics',
      canonicalBn: 'পদার্থবিজ্ঞান',
      IconComponent: Zap,
      colorName: 'blue',
      borderClass: 'border-cyan-500/30 hover:border-cyan-500/50',
      bgGradient: 'from-cyan-500/15 via-blue-500/5 to-transparent',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30 shadow-cyan-500/10',
      iconColor: 'text-cyan-400',
      badgeStyle: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      glowShadow: 'shadow-[0_0_25px_rgba(6,182,212,0.12)]',
    };
  }

  if (lower.includes('bio') || lower.includes('জীব')) {
    return {
      canonicalEn: 'Biology',
      canonicalBn: 'জীববিজ্ঞান',
      IconComponent: Dna,
      colorName: 'green',
      borderClass: 'border-green-500/30 hover:border-green-500/50',
      bgGradient: 'from-green-500/15 via-emerald-500/5 to-transparent',
      iconBg: 'bg-green-500/15 border-green-500/30 shadow-green-500/10',
      iconColor: 'text-green-400',
      badgeStyle: 'bg-green-500/15 text-green-400 border-green-500/30',
      glowShadow: 'shadow-[0_0_25px_rgba(34,197,94,0.12)]',
    };
  }

  if (lower.includes('higher math') || lower.includes('উচ্চতর')) {
    return {
      canonicalEn: 'Higher Math',
      canonicalBn: 'উচ্চতর গণিত',
      IconComponent: Calculator,
      colorName: 'amber',
      borderClass: 'border-amber-500/30 hover:border-amber-500/50',
      bgGradient: 'from-amber-500/15 via-orange-500/5 to-transparent',
      iconBg: 'bg-amber-500/15 border-amber-500/30 shadow-amber-500/10',
      iconColor: 'text-amber-400',
      badgeStyle: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      glowShadow: 'shadow-[0_0_25px_rgba(245,158,11,0.12)]',
    };
  }

  if (lower.includes('math') || lower.includes('গণিত')) {
    return {
      canonicalEn: 'Mathematics',
      canonicalBn: 'গণিত',
      IconComponent: Calculator,
      colorName: 'amber',
      borderClass: 'border-amber-500/30 hover:border-amber-500/50',
      bgGradient: 'from-amber-500/15 via-yellow-500/5 to-transparent',
      iconBg: 'bg-amber-500/15 border-amber-500/30 shadow-amber-500/10',
      iconColor: 'text-amber-400',
      badgeStyle: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      glowShadow: 'shadow-[0_0_25px_rgba(245,158,11,0.12)]',
    };
  }

  if (lower.includes('eng') || lower.includes('ইংরেজি')) {
    return {
      canonicalEn: 'English',
      canonicalBn: 'ইংরেজি',
      IconComponent: Languages,
      colorName: 'purple',
      borderClass: 'border-purple-500/30 hover:border-purple-500/50',
      bgGradient: 'from-purple-500/15 via-indigo-500/5 to-transparent',
      iconBg: 'bg-purple-500/15 border-purple-500/30 shadow-purple-500/10',
      iconColor: 'text-purple-400',
      badgeStyle: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      glowShadow: 'shadow-[0_0_25px_rgba(168,85,247,0.12)]',
    };
  }

  if (lower.includes('bang') || lower.includes('বাংলা')) {
    return {
      canonicalEn: 'Bangla',
      canonicalBn: 'বাংলা',
      IconComponent: BookOpen,
      colorName: 'rose',
      borderClass: 'border-rose-500/30 hover:border-rose-500/50',
      bgGradient: 'from-rose-500/15 via-pink-500/5 to-transparent',
      iconBg: 'bg-rose-500/15 border-rose-500/30 shadow-rose-500/10',
      iconColor: 'text-rose-400',
      badgeStyle: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      glowShadow: 'shadow-[0_0_25px_rgba(244,63,94,0.12)]',
    };
  }

  if (lower.includes('gk') || lower.includes('সাধারণ জ্ঞান') || lower.includes('সাধারণজ্ঞান')) {
    return {
      canonicalEn: 'General Knowledge',
      canonicalBn: 'সাধারণ জ্ঞান',
      IconComponent: Compass,
      colorName: 'indigo',
      borderClass: 'border-indigo-500/30 hover:border-indigo-500/50',
      bgGradient: 'from-indigo-500/15 via-blue-500/5 to-transparent',
      iconBg: 'bg-indigo-500/15 border-indigo-500/30 shadow-indigo-500/10',
      iconColor: 'text-indigo-400',
      badgeStyle: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      glowShadow: 'shadow-[0_0_25px_rgba(99,102,241,0.12)]',
    };
  }

  return {
    canonicalEn: subjectRaw,
    canonicalBn: subjectRaw,
    IconComponent: GraduationCap,
    colorName: 'blue',
    borderClass: 'border-primary/30 hover:border-primary/50',
    bgGradient: 'from-primary/15 via-primary/5 to-transparent',
    iconBg: 'bg-primary/15 border-primary/30 shadow-primary/10',
    iconColor: 'text-primary',
    badgeStyle: 'bg-primary/15 text-primary border-primary/30',
    glowShadow: 'shadow-[0_0_25px_rgba(59,130,246,0.12)]',
  };
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

  const [isTestMode, setIsTestMode] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const isAdmin = userProfile?.role === 'admin';
  const isLoggedIn = !!user;

  const cqQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, 'boardQuestions'),
            where('questionType', '==', 'university-questions'),
            limit(1000)
          )
        : null,
    [firestore]
  );
  const { data: universityCqs, isLoading: cqLoading } = useCollection(cqQuery);

  const mcqQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, 'mcqs'),
            where('questionType', '==', 'university-questions'),
            limit(1000)
          )
        : null,
    [firestore]
  );
  const { data: universityMcqs, isLoading: mcqLoading } = useCollection(mcqQuery);

  const allQuestions = useMemo((): UniversityQuestion[] => {
    const cqs = (universityCqs || []).map((q: any) => ({
      ...q,
      type: 'cq' as const,
      board: getUniversityName(q),
    }));
    const mcqs = (universityMcqs || []).map((q: any) => ({
      ...q,
      type: 'mcq' as const,
      board: getUniversityName(q),
    }));
    return [...cqs, ...mcqs];
  }, [universityCqs, universityMcqs]);

  // Universities statistics and list
  const universitiesData = useMemo(() => {
    const map = new Map<string, { total: number; years: Set<string> }>();
    allQuestions.forEach((q) => {
      const u = getUniversityName(q);
      if (!map.has(u)) {
        map.set(u, { total: 0, years: new Set<string>() });
      }
      const item = map.get(u)!;
      item.total += 1;
      if (q.year) item.years.add(String(q.year));
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        years: Array.from(data.years).sort((a, b) => Number(b) - Number(a)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allQuestions]);

  const filteredUniversities = useMemo(() => {
    if (!searchQuery.trim()) return universitiesData;
    const q = searchQuery.toLowerCase().trim();
    return universitiesData.filter((u) => {
      const info = UNIVERSITY_INFO[u.name];
      return (
        u.name.toLowerCase().includes(q) ||
        (info && (info.fullName.toLowerCase().includes(q) || info.short.toLowerCase().includes(q)))
      );
    });
  }, [universitiesData, searchQuery]);

  // Available years for selected university
  const yearsData = useMemo(() => {
    if (!university) return [];
    const yearCounts = new Map<string, number>();
    allQuestions
      .filter((q) => getUniversityName(q) === university)
      .forEach((q) => {
        if (q.year) {
          const y = String(q.year);
          yearCounts.set(y, (yearCounts.get(y) || 0) + 1);
        }
      });

    return Array.from(yearCounts.entries())
      .map(([yr, count]) => ({ year: yr, count }))
      .sort((a, b) => Number(b.year) - Number(a.year));
  }, [allQuestions, university]);

  // Questions for currently selected university and year
  const questionsList = useMemo(() => {
    if (!university || !year) return [];
    return allQuestions
      .filter(
        (q) => getUniversityName(q) === university && String(q.year) === year
      )
      .sort((a, b) => {
        const subjectA = getSubjectName(a);
        const subjectB = getSubjectName(b);
        const sortA = getSubjectSortIndex(subjectA);
        const sortB = getSubjectSortIndex(subjectB);

        if (sortA !== sortB) return sortA - sortB;
        if (subjectA !== subjectB) return subjectA.localeCompare(subjectB, 'bn');
        if (a.type !== b.type) return a.type === 'cq' ? -1 : 1;
        return String(a.id).localeCompare(String(b.id));
      });
  }, [allQuestions, university, year]);

  // Group questions by subject with count
  const subjectGroups = useMemo(() => {
    const map = new Map<string, UniversityQuestion[]>();
    questionsList.forEach((q) => {
      const s = getSubjectName(q);
      const arr = map.get(s) || [];
      arr.push(q);
      map.set(s, arr);
    });

    return Array.from(map.entries()).map(([subject, questions]) => ({
      subject,
      questions,
      total: questions.length,
      config: getSubjectConfig(subject),
    }));
  }, [questionsList]);

  // Filtered subject groups based on tab selection
  const displayedGroups = useMemo(() => {
    if (selectedSubjectFilter === 'all') return subjectGroups;
    return subjectGroups.filter((g) => g.subject === selectedSubjectFilter);
  }, [subjectGroups, selectedSubjectFilter]);

  const allMcqs = useMemo(
    () => questionsList.filter((q) => q.type === 'mcq') as (UniversityQuestion & MCQ)[],
    [questionsList]
  );

  const testScore = useMemo(() => {
    return allMcqs.reduce((score, q) => {
      const correct = Number.isInteger(q.correctAnswerIndex) ? q.correctAnswerIndex : 0;
      return selectedAnswers[q.id] === correct ? score + 1 : score;
    }, 0);
  }, [allMcqs, selectedAnswers]);

  // Per-subject test score calculation
  const subjectScores = useMemo(() => {
    const result: Record<string, { answered: number; correct: number; total: number }> = {};
    subjectGroups.forEach((group) => {
      const mcqs = group.questions.filter((q) => q.type === 'mcq') as (UniversityQuestion & MCQ)[];
      let answered = 0;
      let correct = 0;
      mcqs.forEach((q) => {
        if (selectedAnswers[q.id] !== undefined) {
          answered += 1;
          const ansIndex = Number.isInteger(q.correctAnswerIndex) ? q.correctAnswerIndex : 0;
          if (selectedAnswers[q.id] === ansIndex) correct += 1;
        }
      });
      result[group.subject] = { answered, correct, total: mcqs.length };
    });
    return result;
  }, [subjectGroups, selectedAnswers]);

  const isLoading = cqLoading || mcqLoading;

  useEffect(() => {
    setIsTestMode(false);
    setTestSubmitted(false);
    setSelectedAnswers({});
    setSelectedSubjectFilter('all');
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

  const handleAskAI = useCallback((questionContext: any, selectedText?: string) => {
    setChatContext(questionContext);
    setChatSelectedText(selectedText);
    setIsChatOpen(true);
  }, []);

  const handleJumpToSubject = (subjectName: string) => {
    setSelectedSubjectFilter('all');
    setTimeout(() => {
      const element = document.getElementById(`subject-${encodeURIComponent(subjectName)}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

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
              <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">
                লগইন প্রয়োজন
              </h1>
              <p className="text-muted-foreground text-lg mb-8 max-w-md">
                ইউনিভার্সিটি প্রশ্ন দেখতে আপনাকে প্রথমে লগইন করতে হবে।
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login" className="liquid-btn liquid-btn-primary">
                  <LogIn className="h-5 w-5" />
                  লগইন করুন
                </Link>
                <Link href="/signup" className="liquid-btn">
                  <UserPlus className="h-5 w-5" />
                  নতুন একাউন্ট খুলুন
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const selectedUniInfo = university ? UNIVERSITY_INFO[university] : null;

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-b from-background via-background/95 to-background">
      {/* Top Breadcrumb Navigation */}
      <div className="sticky top-14 z-40 bg-background/85 backdrop-blur-xl border-b border-border/40 px-4 py-3.5 shadow-sm">
        <div className="container mx-auto max-w-5xl flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap text-sm font-medium">
          <div className="flex items-center gap-2">
            <Link
              href="/question-bank"
              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 focus:outline-none"
            >
              <Home className="h-4 w-4" /> প্রশ্ন ব্যাংক
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            <button
              onClick={() => updateUrl({ university: null, year: null })}
              className={`hover:text-primary transition-colors focus:outline-none font-semibold ${
                !university
                  ? 'text-primary drop-shadow-[0_0_8px_rgba(79,156,249,0.5)]'
                  : 'text-muted-foreground'
              }`}
            >
              ইউনিভার্সিটি প্রশ্ন
            </button>
            {university && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                <button
                  onClick={() => updateUrl({ year: null })}
                  className={`hover:text-primary transition-colors focus:outline-none font-semibold ${
                    !year
                      ? 'text-primary drop-shadow-[0_0_8px_rgba(79,156,249,0.5)]'
                      : 'text-muted-foreground'
                  }`}
                >
                  {university}
                </button>
              </>
            )}
            {year && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                <span className="text-primary font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  {year}
                </span>
              </>
            )}
          </div>

          {university && year && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                মোট প্রশ্ন:{' '}
                <strong className="text-foreground font-bold">{questionsList.length}</strong>
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                বিষয়: <strong className="text-foreground font-bold">{subjectGroups.length}</strong> টি
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* VIEW 1: SELECT UNIVERSITY */}
        {!university && (
          <div className="animate-fade-in space-y-8">
            {/* Hero Header */}
            <div className="text-center max-w-2xl mx-auto space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold tracking-wide uppercase">
                <GraduationCap className="h-4 w-4" />
                বিশ্ববিদ্যালয় অ্যাডমিশন প্রশ্ন ব্যাংক
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold font-headline tracking-tight text-foreground">
                বিশ্ববিদ্যালয় নির্বাচন করুন
              </h1>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                বিভিন্ন বিশ্ববিদ্যালয়ের বিগত বছরের প্রশ্ন সমাধান, বিষয়ভিত্তিক শ্রেণিবিন্যাস এবং
                ব্যাখ্যাসহ অনুশীলন করুন।
              </p>

              {/* Search Bar */}
              <div className="relative max-w-md mx-auto pt-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="বিশ্ববিদ্যালয় খুঁজুন... (যেমন: CUET, BUET, DU)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 rounded-2xl bg-card/60 backdrop-blur-md border-border/60 focus:border-primary text-sm shadow-sm"
                />
              </div>
            </div>

            {/* University Cards Grid */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <LwaiLogo size="default" className="animate-pulse" />
                <p className="text-muted-foreground mt-6 font-medium">তথ্য লোড হচ্ছে...</p>
              </div>
            ) : filteredUniversities.length === 0 ? (
              <div className="text-center py-16 bg-muted/10 border border-border/40 rounded-3xl space-y-3">
                <AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-foreground font-semibold text-lg">কোনো বিশ্ববিদ্যালয় পাওয়া যায়নি</p>
                <p className="text-muted-foreground text-sm">
                  অন্য কোনো নাম লিখে খুঁজুন অথবা ডাটাবেসে প্রশ্ন যুক্ত করুন।
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                {filteredUniversities.map((item, index) => {
                  const info = UNIVERSITY_INFO[item.name] || {
                    short: item.name.slice(0, 4).toUpperCase(),
                    fullName: item.name,
                    gradient: 'from-primary/20 via-primary/10 to-accent/10',
                  };
                  return (
                    <button
                      key={item.name}
                      onClick={() => selectUniversity(item.name)}
                      className="text-left w-full group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-lg p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${info.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                      />

                      <div className="relative z-10 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-14 w-14 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-primary font-black tracking-wider group-hover:scale-105 group-hover:bg-primary/20 transition-all shadow-inner">
                            <span className="text-sm">{info.short}</span>
                            <span className="text-[9px] opacity-70">ADMISSION</span>
                          </div>
                          <div>
                            <h3 className="font-headline font-bold text-base md:text-lg text-foreground group-hover:text-primary transition-colors">
                              {item.name}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {info.fullName}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                      </div>

                      <div className="relative z-10 mt-4 pt-3.5 border-t border-border/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {item.years.length > 0 ? `${item.years.join(', ')}` : 'প্রশ্ন উপলব্ধ'}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="rounded-full px-2.5 py-0.5 font-bold bg-primary/10 text-primary border-primary/20"
                        >
                          {item.total} টি প্রশ্ন
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: SELECT YEAR */}
        {university && !year && (
          <div className="animate-slide-in-up space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-card/80 via-card/50 to-primary/5 border border-border/60 rounded-3xl p-6 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-black text-xl shadow-inner">
                  {selectedUniInfo?.short || university.slice(0, 4).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black font-headline text-foreground">{university}</h2>
                    <Badge variant="outline" className="rounded-full">
                      বিশ্ববিদ্যালয়
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedUniInfo?.fullName || university}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateUrl({ university: null })}
                className="rounded-full gap-1.5 self-start sm:self-auto"
              >
                বিশ্ববিদ্যালয় পরিবর্তন করুন
              </Button>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-xl font-bold font-headline text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                প্রশ্নের সাল নির্বাচন করুন
              </h3>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <LwaiLogo size="default" className="animate-pulse" />
                  <p className="text-muted-foreground mt-6 font-medium">তথ্য লোড হচ্ছে...</p>
                </div>
              ) : yearsData.length === 0 ? (
                <div className="text-muted-foreground text-center py-20 bg-muted/10 rounded-2xl">
                  এই বিশ্ববিদ্যালয়ের জন্য কোনো সাল পাওয়া যায়নি।
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {yearsData.map((item, index) => (
                    <button
                      key={item.year}
                      onClick={() => selectYear(item.year)}
                      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-md p-5 text-center transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="h-12 w-12 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all mb-3 text-primary">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <span className="block font-black text-xl text-foreground group-hover:text-primary transition-colors">
                        {item.year}
                      </span>
                      <span className="inline-block text-xs font-semibold text-muted-foreground mt-1 px-2.5 py-0.5 rounded-full bg-muted/50">
                        {item.count} টি প্রশ্ন
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: QUESTIONS LIST (SUBJECT-WISE) */}
        {university && year && (
          <div className="animate-slide-in-up space-y-6">
            {/* Header Card with Exam Paper Details */}
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/50 to-primary/5 p-6 backdrop-blur-xl shadow-md">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center text-primary font-black text-xl shadow-inner">
                    {selectedUniInfo?.short || university.slice(0, 4).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl md:text-3xl font-black font-headline tracking-tight text-foreground">
                        {university} {year}
                      </h1>
                      <Badge className="rounded-full px-3 py-1 font-bold bg-primary text-primary-foreground shadow-sm">
                        {questionsList.length} টি প্রশ্ন
                      </Badge>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {selectedUniInfo?.fullName || university} • বিশ্ববিদ্যালয় ভর্তি পরীক্ষা প্রশ্নপত্র
                    </p>

                    {/* Subject Distribution Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {subjectGroups.map((g) => {
                        const Icon = g.config.IconComponent;
                        return (
                          <button
                            key={g.subject}
                            onClick={() => handleJumpToSubject(g.subject)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all hover:scale-105 ${g.config.badgeStyle}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>
                              {g.config.canonicalEn}: {g.total}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                  {allMcqs.length > 0 && (
                    isTestMode ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exitTestMode}
                        className="gap-2 rounded-full border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                      >
                        <RotateCcw className="h-4 w-4" />
                        লার্ন মোড
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={startTestMode}
                        className="gap-2 rounded-full shadow-md shadow-primary/20"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Test yourself
                      </Button>
                    )
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateUrl({ year: null })}
                    className="rounded-full text-xs hover:bg-muted"
                  >
                    সাল পরিবর্তন
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateUrl({ university: null, year: null })}
                    className="rounded-full text-xs hover:bg-muted"
                  >
                    বিশ্ববিদ্যালয় পরিবর্তন
                  </Button>
                </div>
              </div>
            </div>

            {/* Test Yourself Stats Banner */}
            {isTestMode && allMcqs.length > 0 && (
              <div className="liquid-card p-5 border-primary/30 bg-primary/5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <p className="text-base font-extrabold text-foreground">
                      Test yourself মোড সক্রিয়
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    উত্তরগুলো নির্বাচন করুন। সকল প্রশ্ন শেষ করে নিচে বা এখানে স্কোর দেখতে বাটনে ক্লিক
                    করুন।
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-bold">
                    উত্তর দিয়েছেন: {Object.keys(selectedAnswers).length} / {allMcqs.length}
                  </Badge>
                  {testSubmitted && (
                    <Badge className="rounded-full px-3 py-1 text-xs font-bold bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                      স্কোর: {testScore} / {allMcqs.length} (
                      {Math.round((testScore / allMcqs.length) * 100)}%)
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setTestSubmitted(true)}
                    disabled={testSubmitted}
                    className="rounded-full gap-1.5"
                  >
                    <Award className="h-4 w-4" />
                    {testSubmitted ? 'স্কোর দেওয়া হয়েছে' : 'স্কোর দেখুন'}
                  </Button>
                  {testSubmitted && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTestSubmitted(false);
                        setSelectedAnswers({});
                      }}
                      className="rounded-full gap-1"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      পুনরায় দিন
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Sticky Subject Navigation Bar */}
            {subjectGroups.length > 0 && (
              <div className="sticky top-14 z-30 -mx-2 px-2 py-2.5 bg-background/90 backdrop-blur-xl border-y border-border/50 shadow-sm">
                <div className="flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedSubjectFilter('all')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        selectedSubjectFilter === 'all'
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                          : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      সকল বিষয় ({questionsList.length})
                    </button>

                    {subjectGroups.map((group) => {
                      const Icon = group.config.IconComponent;
                      const scoreData = subjectScores[group.subject];
                      const isActive = selectedSubjectFilter === group.subject;
                      return (
                        <button
                          key={group.subject}
                          onClick={() => {
                            if (selectedSubjectFilter === group.subject) {
                              setSelectedSubjectFilter('all');
                            } else {
                              handleJumpToSubject(group.subject);
                            }
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
                            isActive
                              ? `${group.config.badgeStyle} shadow-md scale-105`
                              : 'bg-card/70 hover:bg-muted/60 border-border/60 text-foreground/80 hover:text-foreground'
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${group.config.iconColor}`} />
                          <span>
                            {group.config.canonicalEn} ({group.total})
                          </span>
                          {isTestMode && scoreData && (
                            <span className="text-[10px] opacity-75 font-mono ml-0.5">
                              {testSubmitted
                                ? `(${scoreData.correct}/${scoreData.total})`
                                : `(${scoreData.answered}/${scoreData.total})`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="shrink-0 pl-2">
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="p-1.5 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                      title="পৃষ্ঠার শীর্ষে যান"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Questions Rendering */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <LwaiLogo size="default" className="animate-pulse" />
                <p className="text-muted-foreground mt-6 font-medium">প্রশ্ন লোড হচ্ছে...</p>
              </div>
            ) : questionsList.length === 0 ? (
              <div className="text-center py-20 bg-muted/5 border border-white/5 rounded-3xl animate-fade-in">
                <AlertCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">কোনো প্রশ্ন পাওয়া যায়নি</h3>
                <p className="text-muted-foreground text-sm">
                  আপাতত এই বিশ্ববিদ্যালয়ের ফিল্টারে কোনো প্রশ্ন যুক্ত করা হয়নি।
                </p>
              </div>
            ) : (
              <div className="space-y-12 pt-2">
                {displayedGroups.map((group) => {
                  const Icon = group.config.IconComponent;
                  const scoreData = subjectScores[group.subject];

                  return (
                    <section
                      key={group.subject}
                      id={`subject-${encodeURIComponent(group.subject)}`}
                      className="space-y-5 scroll-mt-28"
                    >
                      {/* PROMINENT SUBJECT HEADING CARD */}
                      <div
                        className={`relative overflow-hidden rounded-3xl border ${group.config.borderClass} bg-gradient-to-br ${group.config.bgGradient} p-5 sm:p-6 backdrop-blur-xl ${group.config.glowShadow}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center border ${group.config.iconBg}`}
                            >
                              <Icon className={`h-7 w-7 ${group.config.iconColor}`} />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2.5">
                                <h2 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-foreground">
                                  {group.config.canonicalEn} ({group.total})
                                </h2>
                                {group.config.canonicalBn && (
                                  <span className="text-base sm:text-lg font-bold text-muted-foreground">
                                    • {group.config.canonicalBn}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                প্রশ্ন ১ হতে {group.total} পর্যন্ত • {group.config.canonicalBn}{' '}
                                বিষয়ভিত্তিক প্রশ্নাবলি
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {isTestMode && scoreData && (
                              <Badge
                                variant="outline"
                                className={`rounded-full px-3 py-1 font-bold text-xs ${
                                  testSubmitted
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-primary/10 text-primary border-primary/20'
                                }`}
                              >
                                {testSubmitted
                                  ? `স্কোর: ${scoreData.correct} / ${scoreData.total}`
                                  : `উত্তর: ${scoreData.answered} / ${scoreData.total}`}
                              </Badge>
                            )}

                            <Badge
                              className={`rounded-full px-3.5 py-1 text-xs font-extrabold ${group.config.badgeStyle}`}
                            >
                              মোট {group.total} টি প্রশ্ন
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* QUESTIONS OF THIS SUBJECT (NUMBERED 1 TO N) */}
                      <div className="space-y-6">
                        {group.questions.map((question, qIndex) =>
                          question.type === 'mcq' ? (
                            <McqCard
                              key={`${question.id}-${isTestMode ? 'test' : 'learn'}-${
                                testSubmitted ? 'done' : 'open'
                              }`}
                              mcq={question as MCQ}
                              index={qIndex + 1}
                              isAdmin={isAdmin}
                              onAskAI={handleAskAI}
                              collectionName="mcqs"
                              showAnswerByDefault={!isTestMode}
                              testMode={isTestMode && !testSubmitted}
                              selectedAnswer={selectedAnswers[question.id] ?? null}
                              onSelectAnswer={(optionIndex) => {
                                if (testSubmitted) return;
                                setSelectedAnswers((prev) => ({
                                  ...prev,
                                  [question.id]: optionIndex,
                                }));
                              }}
                              revealAnswer={testSubmitted}
                            />
                          ) : (
                            <CqCard
                              key={question.id}
                              cq={question as BoardQuestion}
                              index={qIndex + 1}
                              isAdmin={isAdmin}
                              onAskAI={handleAskAI}
                              collectionName="boardQuestions"
                            />
                          )
                        )}
                      </div>
                    </section>
                  );
                })}

                {/* Footer Section Summary */}
                <div className="pt-6 pb-12 text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/40 border border-border/50 text-xs font-semibold text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {university} {year} এর সকল বিষয়ের মোট {questionsList.length} টি প্রশ্ন সমাপ্ত
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="rounded-full gap-2 text-xs"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      পৃষ্ঠার শীর্ষে ফিরে যান
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AiChatButton
        onClick={() => {
          setChatContext(null);
          setChatSelectedText(undefined);
          setIsChatOpen(true);
        }}
      />
      <AiChatPanel
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatSelectedText(undefined);
        }}
        onClear={() => {
          setChatContext(null);
          setChatSelectedText(undefined);
        }}
        questionContext={chatContext}
        selectedText={chatSelectedText}
      />

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
