'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, FileQuestion, MessageCircleQuestion, Search, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Subject, UserProfile } from '@/types';
import MathRenderer from '@/components/MathRenderer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';

interface TextbookSection {
  section_no: string;
  title: string;
  title_english?: string;
  period?: string;
  content?: string;
  classification?: any;
  conductor_types_by_method?: any;
  definitions?: any;
  types_of_conductance?: any;
  mcq_4_1?: any;
}

interface TextbookData {
  metadata: {
    class: string;
    subject: string;
    subject_paper: string;
    chapter_no: number;
    chapter_name: string;
    chapter_name_english: string;
    book_name: string;
    author: string;
    edition: string;
  };
  key_words: { title: string; words: string[] };
  learning_objectives: { title: string; objectives: string[] };
  introduction: { section: string; title: string; content: string };
  sections: TextbookSection[];
}

const CHAPTER_JSON_MAP: Record<string, string> = {
  'তড়িৎ রসায়ন': '/electrochemistry_chapter8.json',
  'electrochemistry': '/electrochemistry_chapter8.json',
};

function getTextbookJsonPath(chapterName: string, subjectName?: string): string | null {
  const key = chapterName.toLowerCase();
  if (CHAPTER_JSON_MAP[key]) return CHAPTER_JSON_MAP[key];
  if (CHAPTER_JSON_MAP[chapterName]) return CHAPTER_JSON_MAP[chapterName];
  for (const [k, v] of Object.entries(CHAPTER_JSON_MAP)) {
    if (key.includes(k.toLowerCase())) return v;
  }
  return null;
}

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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6 mt-6">
      <p className="text-sm text-muted-foreground">মোট {totalItems}টি প্রশ্নের মধ্যে {startItem}-{endItem} দেখানো হচ্ছে</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="gap-1"><ChevronLeft className="h-4 w-4" />আগে</Button>
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, i) => typeof page === 'string' ? (<span key={`e-${i}`} className="px-2 text-muted-foreground">...</span>) : (<Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" className="h-9 w-9 p-0" onClick={() => onPageChange(page)}>{page}</Button>))}
        </div>
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="gap-1">পরে<ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

import { McqCard, type MCQ, type MCQDoc } from '@/components/questions/mcq-card';
import { CqCard, type BoardQuestion, type BoardQuestionDoc } from '@/components/questions/cq-card';

function ChapterQuestionsContent() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    
    // Fetch user profile to check admin role
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    
    // Only admins can edit questions
    const isAdmin = userProfile?.role === 'admin';

    const subjectId = params.subjectId as string;
    const chapterName = useMemo(() => {
        try {
            return decodeURIComponent(params.chapterName as string);
        } catch (e) {
            return params.chapterName as string;
        }
    }, [params.chapterName]);

    const [questionTypeFilter, setQuestionTypeFilter] = useState<'all' | 'mcq' | 'cq'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 400);
    const [currentPage, setCurrentPage] = useState(1);
    const [sectionFilter, setSectionFilter] = useState<string>('all');
    const [textbookData, setTextbookData] = useState<TextbookData | null>(null);
    const [textbookLoading, setTextbookLoading] = useState(false);

    const subjectRef = useMemoFirebase(() => (firestore && subjectId ? doc(firestore, 'subjects', subjectId) : null), [firestore, subjectId]);
    const { data: subject, isLoading: isLoadingSubject } = useDoc<Subject>(subjectRef);

    const textbooksQuery = useMemoFirebase(() => {
        if (!firestore || !chapterName) return null;
        return query(
            collection(firestore, 'textbooks'),
            where('chapterName', '==', chapterName)
        );
    }, [firestore, chapterName]);
    const { data: textbookDocs } = useCollection<{chapterName: string; content: TextbookData; class: string; subjectName: string}>(textbooksQuery);

    useEffect(() => {
        const loadTextbookData = async () => {
            setTextbookLoading(true);
            let data: TextbookData | null = null;
            const jsonPath = getTextbookJsonPath(chapterName, subject?.subjectName);
            if (jsonPath) {
                try {
                    const res = await fetch(jsonPath);
                    data = await res.json();
                } catch (e) {
                    console.error('Failed to load JSON:', e);
                }
            }
            if (!data && textbookDocs && textbookDocs.length > 0) {
                data = textbookDocs[0].content;
            }
            setTextbookData(data);
            setTextbookLoading(false);
        };
        loadTextbookData();
    }, [chapterName, textbookDocs]);

    const availableSections = useMemo(() => {
        if (!textbookData?.sections) return [];
        return [{ no: 'intro', title: textbookData.introduction.title }, ...textbookData.sections.map(s => ({ no: s.section_no, title: s.title }))];
    }, [textbookData]);

    const filteredSections = useMemo(() => {
        if (!textbookData) return [];
        if (sectionFilter === 'all') return textbookData.sections;
        const allSections = [{ section_no: 'intro', title: textbookData.introduction.title, content: textbookData.introduction.content }, ...textbookData.sections];
        return allSections.filter(s => s.section_no === sectionFilter);
    }, [textbookData, sectionFilter]);
    
    const allSubjectsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: allSubjects, isLoading: isLoadingAllSubjects } = useCollection<Subject>(allSubjectsQuery);


    const cqsQuery = useMemoFirebase(() => {
        if (!firestore || !subject || !chapterName) return null;
        return query(
            collection(firestore, 'boardQuestions'),
            where('subject', '==', subject.subjectName),
            where('chapter', '==', chapterName)
        );
    }, [firestore, subject, chapterName]);
    const { data: cqs, isLoading: isLoadingCQs } = useCollection<BoardQuestionDoc>(cqsQuery);

    const mcqsQuery = useMemoFirebase(() => {
        if (!firestore || !subject || !chapterName) return null;
        return query(
            collection(firestore, 'mcqs'),
            where('subject', '==', subject.subjectName),
            where('chapter', '==', chapterName)
        );
    }, [firestore, subject, chapterName]);
    const { data: mcqs, isLoading: isLoadingMCQs } = useCollection<MCQDoc>(mcqsQuery);
    
    const isLoading = isLoadingSubject || isLoadingCQs || isLoadingMCQs || isLoadingAllSubjects;

    const filteredQuestions = useMemo(() => {
        if (isLoading || !cqs || !mcqs) return [];
        const combined = [
            ...cqs.map(q => ({ ...q, type: 'cq' as const })),
            ...mcqs.map(q => ({ ...q, type: 'mcq' as const }))
        ];
        const sorted = combined.sort((a, b) => (b.year || 0) - (a.year || 0));

        return sorted.filter(q => {
            const typeMatch = questionTypeFilter === 'all' || q.type === questionTypeFilter;
            const searchMatch = debouncedSearchTerm === '' || q.text.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
            return typeMatch && searchMatch;
        });

    }, [cqs, mcqs, isLoading, questionTypeFilter, debouncedSearchTerm]);

    // Reset page when filters change
    useMemo(() => { setCurrentPage(1); }, [questionTypeFilter, debouncedSearchTerm]);

    const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
    const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleSubjectChange = (newSubjectId: string) => {
        const newSubject = allSubjects?.find(s => s.id === newSubjectId);
        if (newSubject && newSubject.chapters && newSubject.chapters.length > 0) {
            const firstChapterName = encodeURIComponent(newSubject.chapters[0].name);
            router.push(`/subjects/${newSubjectId}/chapters/${firstChapterName}`);
        } else {
            toast({
                variant: 'destructive',
                title: 'No Chapters',
                description: 'This subject does not have any chapters to display.',
            });
        }
    };

    const handleChapterChange = (newChapterName: string) => {
        if (newChapterName !== chapterName) {
            router.push(`/subjects/${subjectId}/chapters/${encodeURIComponent(newChapterName)}`);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <Skeleton className="h-8 w-1/2 mb-2" />
                        <Skeleton className="h-6 w-1/3" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                 {subject && (
                     <>
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold font-headline">{subject.subjectName}</h1>
                            <p className="text-xl text-muted-foreground">{chapterName}</p>
                        </div>
                        <Card className="mb-8">
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div>
                                        <Label className="mb-2 block">বিষয়</Label>
                                        <Select onValueChange={handleSubjectChange} value={subjectId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="বিষয় নির্বাচন করুন" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allSubjects?.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.class} - {s.subjectName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="mb-2 block">অধ্যায়</Label>
                                         <Select onValueChange={handleChapterChange} value={chapterName}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="অধ্যায় নির্বাচন করুন" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {subject.chapters?.map((chap, index) => (
                                                    <SelectItem key={index} value={chap.name}>
                                                        {chap.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="mb-2 block">টপিক / অধ্যায়</Label>
                                        <Select value={sectionFilter} onValueChange={setSectionFilter}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="সব অধ্যায়" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">সব অধ্যায়</SelectItem>
                                                {availableSections.map((s, i) => (
                                                    <SelectItem key={i} value={s.no}>
                                                        {s.no} - {s.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="mb-2 block">প্রশ্ন সার্���</Label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                placeholder="এখানে খুঁজুন" 
                                                className="pl-10"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex flex-wrap items-center gap-2">
                                    <Button variant={questionTypeFilter === 'all' ? 'default' : 'outline'} className="rounded-full" onClick={() => setQuestionTypeFilter('all')}>All</Button>
                                    <Button variant={questionTypeFilter === 'mcq' ? 'default' : 'outline'} className="rounded-full" onClick={() => setQuestionTypeFilter('mcq')}>MCQ</Button>
                                    <Button variant={questionTypeFilter === 'cq' ? 'default' : 'outline'} className="rounded-full" onClick={() => setQuestionTypeFilter('cq')}>CQ</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {textbookLoading && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <Skeleton className="h-6 w-1/3" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {textbookData && !textbookLoading && filteredSections.length > 0 && (
                    <div className="space-y-6">
                        {filteredSections.map((section) => (
                            <Card key={section.section_no}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-sm font-mono">{section.section_no}</Badge>
                                        <CardTitle className="text-xl font-headline">{section.title}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {section.content && (
                                        <div className="prose prose-gray dark:prose-invert max-w-none">
                                            <MathRenderer content={section.content} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="space-y-6">
                    {filteredQuestions.length === 0 && (
                        <Card>
                            <CardContent className="pt-6 text-center text-muted-foreground">
                                No questions found for this chapter yet. Please check back later.
                            </CardContent>
                        </Card>
                    )}

                    {paginatedQuestions.map((q, idx) => {
                        const serialIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                        return q.type === 'mcq' 
                            ? <McqCard key={q.id} mcq={q as MCQ} index={serialIndex} isAdmin={isAdmin} /> 
                            : <CqCard key={q.id} cq={q as BoardQuestion} index={serialIndex} isAdmin={isAdmin} />
                    })}
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredQuestions.length} />
            </div>
        </div>
    );
}

export default function ChapterPage() {
    return <ChapterQuestionsContent />;
}
