'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { 
  Pencil, 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  X,
  FileQuestion,
  Layers,
  BookOpen,
  Calendar,
  School,
  RotateCcw
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Subject } from '@/types';

// Define types for our questions
type BoardQuestion = { id: string; text: string; board: string; year: number; subject: string; class: string; chapter: string; type: 'cq' };
type MCQ = { id: string; text: string; board: string; year: number; subject: string; class: string; chapter: string; type: 'mcq' };
type Question = BoardQuestion | MCQ;

const years = ["2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"];
const ITEMS_PER_PAGE = 15;

function PaginationControls({ currentPage, totalPages, onPageChange, totalItems, startItem, endItem }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void; totalItems: number; startItem: number; endItem: number }) {
  if (totalPages <= 1) return null;
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4 mt-4">
      <p className="text-sm text-muted-foreground">
        দেখাচ্ছে <span className="font-medium text-foreground">{startItem}-{endItem}</span> / <span className="font-medium">{totalItems}</span> টি প্রশ্ন
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="gap-1 h-8">
          <ChevronLeft className="h-4 w-4" />আগে
        </Button>
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, i) => typeof page === 'string' ? (
            <span key={`e-${i}`} className="px-2 text-muted-foreground">...</span>
          ) : (
            <Button key={page} variant={currentPage === page ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => onPageChange(page)}>
              {page}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="gap-1 h-8">
          পরে<ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ManageQuestionsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<{ board: string, year: string, class: string, subject: string, chapter: string }>({
    board: 'all',
    year: 'all',
    class: 'all',
    subject: 'all',
    chapter: 'all',
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'mcq' | 'cq' } | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Fetch both collections
  const cqQuery = useMemoFirebase(() => firestore ? collection(firestore, 'boardQuestions') : null, [firestore]);
  const { data: cqData, isLoading: cqLoading } = useCollection(cqQuery);

  const mcqQuery = useMemoFirebase(() => firestore ? collection(firestore, 'mcqs') : null, [firestore]);
  const { data: mcqData, isLoading: mcqLoading } = useCollection(mcqQuery);

  // Fetch data for filters
  const boardsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'boards') : null, [firestore]);
  const { data: boardsData, isLoading: boardsLoading } = useCollection(boardsQuery);
  
  const classesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classesData, isLoading: classesLoading } = useCollection(classesQuery);

  const subjectsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
  const { data: subjectsData, isLoading: subjectsLoading } = useCollection<Omit<Subject, 'id'>>(subjectsQuery);

  // Combine and memoize the questions
  const allQuestions = useMemo((): Question[] => {
    const cqs = (cqData || []).map(q => ({ ...q, type: 'cq' as const, class: q.class || 'N/A' }));
    const mcqs = (mcqData || []).map(q => ({ ...q, type: 'mcq' as const, class: q.class || 'N/A' }));
    return [...cqs, ...mcqs].sort((a, b) => b.year - a.year);
  }, [cqData, mcqData]);

  // Auto-detect available filter options from uploaded data
  const { availableClasses, availableBoards, availableSubjects, availableChapters } = useMemo(() => {
    const classSet = new Set<string>();
    const boardSet = new Set<string>();
    const yearSet = new Set<string>();
    const subjectSet = new Set<string>();
    const chapterSet = new Set<string>();

    allQuestions.forEach(q => {
      if (q.class && q.class !== 'N/A') classSet.add(q.class);
      if (q.board) boardSet.add(q.board);
      if (q.year) yearSet.add(String(q.year));
      if (q.subject) subjectSet.add(q.subject);
      // Only add chapters if no subject filter or matching subject
      if (q.chapter && (filters.subject === 'all' || q.subject === filters.subject)) {
        chapterSet.add(q.chapter);
      }
    });

    // Also get data from filter collections
    classesData?.forEach((c: any) => { if (c.name) classSet.add(c.name); });
    boardsData?.forEach((b: any) => { if (b.name) boardSet.add(b.name); });
    subjectsData?.forEach((s: any) => { 
      if (s.subjectName) subjectSet.add(s.subjectName);
      if (s.chapters && (filters.subject === 'all' || s.subjectName === filters.subject)) {
        s.chapters.forEach((chap: any) => {
          if (chap.name) chapterSet.add(chap.name);
        });
      }
    });

    return {
      availableClasses: Array.from(classSet).sort(),
      availableBoards: Array.from(boardSet).sort(),
      availableSubjects: Array.from(subjectSet).sort(),
      availableChapters: Array.from(chapterSet).sort()
    };
  }, [allQuestions, classesData, boardsData, subjectsData, filters.subject]);

  const availableYears = useMemo(() => {
    const yearSet = new Set<string>();
    allQuestions.forEach(q => { if (q.year) yearSet.add(String(q.year)); });
    return Array.from(yearSet).sort().reverse();
  }, [allQuestions]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: allQuestions.length,
      mcq: allQuestions.filter(q => q.type === 'mcq').length,
      cq: allQuestions.filter(q => q.type === 'cq').length,
    };
  }, [allQuestions]);

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      const searchLower = searchTerm.toLowerCase().trim();
      const searchMatch = searchLower === '' ||
        (q.text && q.text.toLowerCase().includes(searchLower)) ||
        (q.subject && q.subject.toLowerCase().includes(searchLower)) ||
        (q.chapter && q.chapter.toLowerCase().includes(searchLower));
      
      const boardMatch = filters.board === 'all' || 
        q.board === filters.board || 
        (q.board && q.board.toLowerCase() === filters.board.toLowerCase());
      
      const yearMatch = filters.year === 'all' || String(q.year) === filters.year;
      
      const classMatch = filters.class === 'all' || 
        q.class === filters.class ||
        (q.class && q.class.toLowerCase() === filters.class.toLowerCase());
      
      const subjectMatch = filters.subject === 'all' || 
        q.subject === filters.subject ||
        (q.subject && q.subject.toLowerCase() === filters.subject.toLowerCase());
      
      const chapterMatch = filters.chapter === 'all' || 
        q.chapter === filters.chapter ||
        (q.chapter && q.chapter.toLowerCase() === filters.chapter.toLowerCase());

      return searchMatch && boardMatch && yearMatch && classMatch && subjectMatch && chapterMatch;
    });
  }, [allQuestions, searchTerm, filters]);

  const isFilterActive = searchTerm !== '' || Object.values(filters).some(v => v !== 'all');

  // Reset page when filters/search change
  useMemo(() => { setCurrentPage(1); }, [searchTerm, filters]);

  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredQuestions.length);
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  
  const handleFilterChange = (type: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [type]: value };
      if (type === 'subject') {
        newFilters.chapter = 'all';
      }
      return newFilters;
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      board: 'all',
      year: 'all',
      class: 'all',
      subject: 'all',
      chapter: 'all',
    });
  };

  const handleDelete = () => {
    if (!firestore || !deleteTarget) return;

    const collectionName = deleteTarget.type === 'mcq' ? 'mcqs' : 'boardQuestions';
    const docRef = doc(firestore, collectionName, deleteTarget.id);

    deleteDoc(docRef)
        .then(() => {
            toast({ title: 'সফল', description: 'প্রশ্নটি মুছে ফেলা হয়েছে।' });
            setDeleteTarget(null);
        })
        .catch(() => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete'
            }));
             setDeleteTarget(null);
        });
  };

  const handleDeleteAll = async () => {
    if (!firestore || filteredQuestions.length === 0) return;
    setIsDeletingAll(true);
    try {
      const chunks = [];
      for (let i = 0; i < filteredQuestions.length; i += 500) {
        chunks.push(filteredQuestions.slice(i, i + 500));
      }
      
      for (const chunk of chunks) {
        const batch = writeBatch(firestore);
        chunk.forEach(q => {
          const collectionName = q.type === 'mcq' ? 'mcqs' : 'boardQuestions';
          batch.delete(doc(firestore, collectionName, q.id));
        });
        await batch.commit();
      }
      
      toast({ title: 'সফল', description: `${filteredQuestions.length} টি প্রশ্ন মুছে ফেলা হয়েছে।` });
      setShowDeleteAllConfirm(false);
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'multiple',
        operation: 'delete'
      }));
    } finally {
      setIsDeletingAll(false);
    }
  };

  const isLoading = cqLoading || mcqLoading || boardsLoading || classesLoading || subjectsLoading;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              fill
              className="object-contain p-2"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">প্রশ্ন ব্যাংক পরিচালনা</h1>
            <p className="text-muted-foreground">সমস্ত প্রশ্ন সন্ধান, ফিল্টার, সম্পাদনা এবং মুছুন</p>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="flex gap-3">
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileQuestion className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">মোট প্রশ্ন</p>
            </div>
          </div>
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.mcq}</p>
              <p className="text-xs text-muted-foreground">MCQ</p>
            </div>
          </div>
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.cq}</p>
              <p className="text-xs text-muted-foreground">সৃজনশীল</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">ফিল্টার ও অনুসন্ধান</CardTitle>
            </div>
            {isFilterActive && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-destructive">
                <RotateCcw className="h-4 w-4 mr-1" />
                রিসেট
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="প্রশ্ন, বিষয় বা অধ্যায় অনুসন্ধান করুন..." 
              className="h-12 pl-12 pr-4 rounded-xl border-border/60 focus:border-primary/50 focus:ring-primary/20 text-base"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <School className="h-3 w-3" /> শ্রেণী
              </label>
              <Select onValueChange={(value) => handleFilterChange('class', value)} value={filters.class}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="সকল শ্রেণী" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল শ্রেণী</SelectItem>
                  {availableClasses.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> বিষয়
              </label>
              <Select onValueChange={(value) => handleFilterChange('subject', value)} value={filters.subject}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="সকল বিষয়" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল বিষয়</SelectItem>
                  {availableSubjects.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">অধ্যায়</label>
              <Select onValueChange={(value) => handleFilterChange('chapter', value)} value={filters.chapter} disabled={filters.subject === 'all'}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="সকল অধ্যায়" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল অধ্যায়</SelectItem>
                  {availableChapters.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">বোর্ড</label>
              <Select onValueChange={(value) => handleFilterChange('board', value)} value={filters.board}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="সকল বোর্ড" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল বোর্ড</SelectItem>
                  {availableBoards.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3" /> সাল
              </label>
              <Select onValueChange={(value) => handleFilterChange('year', value)} value={filters.year}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="সকল সাল" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল সাল</SelectItem>
                  {availableYears.map((y: string) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1.5 text-sm bg-card">
              <span className="font-bold text-primary">{filteredQuestions.length}</span> টি প্রশ্ন পাওয়া গেছে
            </Badge>
          </div>
          {filteredQuestions.length > 0 && (
            <Button 
                variant="destructive" 
                onClick={() => setShowDeleteAllConfirm(true)}
                disabled={isLoading || isDeletingAll}
                className="rounded-lg"
            >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeletingAll ? 'মুছছে...' : `সব মুছুন (${filteredQuestions.length})`}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">প্রশ্ন</TableHead>
                  <TableHead className="font-semibold">ধরণ</TableHead>
                  <TableHead className="font-semibold">শ্রেণী</TableHead>
                  <TableHead className="font-semibold">বিষয়</TableHead>
                  <TableHead className="font-semibold">অধ্যায়</TableHead>
                  <TableHead className="font-semibold">বোর্ড</TableHead>
                  <TableHead className="font-semibold">সাল</TableHead>
                  <TableHead className="text-right font-semibold">কার্যক্রম</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-56" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredQuestions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                          <Search className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">কোনো প্রশ্ন পাওয়া যায়নি</p>
                        <Button variant="outline" size="sm" onClick={resetFilters} className="rounded-lg">
                          ফিল্টার রিসেট করুন
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && paginatedQuestions.map((q) => (
                  <TableRow key={q.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium max-w-sm truncate">{q.text}</TableCell>
                    <TableCell>
                      <Badge variant={q.type === 'mcq' ? 'default' : 'secondary'} className="rounded-full">
                        {q.type === 'mcq' ? 'MCQ' : 'সৃজনশীল'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{q.class}</TableCell>
                    <TableCell className="text-muted-foreground">{q.subject}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">{q.chapter}</TableCell>
                    <TableCell className="text-muted-foreground">{q.board}</TableCell>
                    <TableCell className="font-medium">{q.year}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                            <Link href={`/admin/add-new-content?id=${q.id}&type=${q.type}`}>
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget({id: q.id, type: q.type})}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {!isLoading && filteredQuestions.length > 0 && (
            <div className="p-6">
              <PaginationControls 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
                totalItems={filteredQuestions.length}
                startItem={startItem}
                endItem={endItem}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>প্রশ্ন মুছবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই প্রশ্নটি স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">
              মুছুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>সব প্রশ্ন মুছবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি {filteredQuestions.length} টি প্রশ্ন মুছে ফেলতে চাইছেন। এই কাজটি স্থায়ী এবং পূর্বাবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">
              {isDeletingAll ? 'মুছছে...' : 'সব মুছুন'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}