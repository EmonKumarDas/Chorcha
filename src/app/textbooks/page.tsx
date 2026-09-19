'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, BookOpen, X, Filter, Lock, LogIn, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TextbookCard, type Textbook } from '@/components/textbooks/textbook-card';
import { useDebounce } from '@/hooks/use-debounce';
import Link from 'next/link';

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
        মোট <span className="text-primary font-bold">{totalItems}</span> টি বইয়ের মধ্যে <span className="font-bold text-foreground">{startItem}-{endItem}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="gap-1 rounded-full hover:bg-primary/5">
          <ChevronLeft className="h-4 w-4" />আগে
        </Button>
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, i) => typeof page === 'string' ? (
            <span key={`e-${i}`} className="px-2 text-muted-foreground">...</span>
          ) : (
            <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm"
              className={`h-9 w-9 p-0 rounded-full ${currentPage === page ? 'shadow-md shadow-primary/20' : 'hover:bg-primary/5'}`}
              onClick={() => onPageChange(page)}>
              {page}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="gap-1 rounded-full hover:bg-primary/5">
          পরে<ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function FilterContent({
  filters,
  handleFilterChange,
  resetFilters,
  availableClasses,
  availableSubjects,
  availablePapers
}: any) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">শ্রেণী</Label>
        <Select onValueChange={(v) => handleFilterChange('class', v)} value={filters.class}>
          <SelectTrigger className="w-full bg-background rounded-xl"><SelectValue placeholder="সকল শ্রেণী" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল শ্রেণী</SelectItem>
            {availableClasses.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">বিষয়</Label>
        <Select onValueChange={(v) => handleFilterChange('subject', v)} value={filters.subject}>
          <SelectTrigger className="w-full bg-background rounded-xl"><SelectValue placeholder="সকল বিষয়" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল বিষয়</SelectItem>
            {availableSubjects.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">পত্র (Paper)</Label>
        <Select onValueChange={(v) => handleFilterChange('paper', v)} value={filters.paper}>
          <SelectTrigger className="w-full bg-background rounded-xl"><SelectValue placeholder="সকল পত্র" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল পত্র</SelectItem>
            {availablePapers.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      
      <Button
        variant="outline"
        className="w-full rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
        onClick={resetFilters}
      >
        ফিল্টার রিসেট করুন
      </Button>
    </div>
  );
}

export default function TextbooksPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const isLoggedIn = !!user;

    // Fetch Data
    const textbooksQuery = useMemoFirebase(() => firestore ? collection(firestore, 'textbooks') : null, [firestore]);
    const { data: textbooksData, isLoading } = useCollection(textbooksQuery);

    // States
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 400);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState<{ class: string, subject: string, paper: string }>({
        class: 'all',
        subject: 'all',
        paper: 'all'
    });
    
    // Auto-detect available filter options
    const {
        availableClasses,
        availableSubjects,
        availablePapers
    } = useMemo(() => {
        const classSet = new Set<string>();
        const subjectSet = new Set<string>();
        const paperSet = new Set<string>();

        (textbooksData || []).forEach((t: any) => {
            const meta = t.metadata || {};
            if (meta.class) classSet.add(meta.class);
            if (meta.subject) subjectSet.add(meta.subject);
            if (meta.subject_paper) paperSet.add(meta.subject_paper);
        });

        return {
            availableClasses: Array.from(classSet).sort(),
            availableSubjects: Array.from(subjectSet).sort(),
            availablePapers: Array.from(paperSet).sort()
        };
    }, [textbooksData]);

    const handleFilterChange = (type: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [type]: value }));
    };

    const resetFilters = () => {
        setFilters({ class: 'all', subject: 'all', paper: 'all' });
        setSearchTerm('');
    };

    const activeFilterCount = Object.values(filters).filter(v => v !== 'all').length;

    const filteredTextbooks = useMemo(() => {
        if (!textbooksData) return [];
        return textbooksData.filter((t: any) => {
            const meta = t.metadata || {};
            const searchMatch = debouncedSearchTerm === '' ||
                (meta.chapter_name || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                (meta.subject || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                (meta.book_name || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                (meta.author || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
            
            const classMatch = filters.class === 'all' || meta.class === filters.class;
            const subjectMatch = filters.subject === 'all' || meta.subject === filters.subject;
            const paperMatch = filters.paper === 'all' || meta.subject_paper === filters.paper;

            return searchMatch && classMatch && subjectMatch && paperMatch;
        }).sort((a: any, b: any) => (a.metadata?.chapter_no || 0) - (b.metadata?.chapter_no || 0));
    }, [textbooksData, debouncedSearchTerm, filters]);

    // Reset pagination
    useMemo(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, filters]);

    const totalPages = Math.ceil(filteredTextbooks.length / ITEMS_PER_PAGE);
    const paginatedTextbooks = filteredTextbooks.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const filterProps = {
        filters,
        handleFilterChange,
        resetFilters,
        availableClasses,
        availableSubjects,
        availablePapers,
        activeFilterCount,
    };

    if (!isUserLoading && !isLoggedIn) {
        return (
            <div className="min-h-screen">
                <section className="relative overflow-hidden border-b border-border/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                    <div className="container mx-auto px-4 py-16 md:py-24 relative">
                        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
                            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6">
                                <Lock className="h-10 w-10 text-primary" />
                            </div>
                            <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">
                                লগইন প্রয়োজন
                            </h1>
                            <p className="text-muted-foreground text-lg mb-8 max-w-md">
                                পাঠ্যবই পড়তে এবং AI সাহায্য পেতে আপনাকে প্রথমে লগইন করতে হবে। এটি আপনার শিক্ষার অগ্রগতি ট্র্যাক করতে সাহায্য করবে।
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button size="lg" className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20" asChild>
                                    <Link href="/login">
                                        <LogIn className="mr-2 h-5 w-5" />
                                        লগইন করুন
                                    </Link>
                                </Button>
                                <Button size="lg" variant="outline" className="h-12 px-8 rounded-2xl" asChild>
                                    <Link href="/signup">
                                        <UserPlus className="mr-2 h-5 w-5" />
                                        নতুন একাউন্ট খুলুন
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header Section */}
            <div className="bg-muted/30 border-b border-border/40 pb-8 pt-10">
              <div className="container mx-auto px-4">
                <div className="max-w-2xl">
                    <h1 className="font-headline text-3xl font-extrabold flex items-center gap-3">
                        <BookOpen className="text-primary h-8 w-8" />
                        পাঠ্যবই লাইব্রেরি
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        আপনার কাঙ্ক্ষিত বিষয়ের অধ্যায়গুলো নিচে থেকে ফিল্টার করে পড়ুন।
                    </p>
                </div>
              </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col gap-6 lg:flex-row">
                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:block w-full lg:w-72 xl:w-80 shrink-0">
                        <div className="sticky top-24 space-y-4 max-h-[85vh] overflow-y-auto pr-1 pb-4 custom-scrollbar">
                            <Card className="shadow-lg border-border/40 overflow-hidden">
                                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b border-border/40">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <SlidersHorizontal className="h-4 w-4 text-primary" />
                                        </div>
                                        ফিল্টার
                                        {activeFilterCount > 0 && (
                                            <Badge className="ml-auto rounded-full h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                                                {activeFilterCount}
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <FilterContent {...filterProps} />
                                </CardContent>
                            </Card>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="w-full lg:flex-1 flex flex-col min-h-[50vh]">
                        {/* Search Bar */}
                        <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input 
                                    placeholder="বইয়ের নাম বা অধ্যায় খুঁজুন..." 
                                    className="pl-11 h-12 text-base rounded-2xl shadow-sm bg-background border-border/60 group-focus-within:border-primary/50 group-focus-within:shadow-md group-focus-within:shadow-primary/5 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex gap-2 items-center">
                                {/* Mobile filter trigger could go here if implemented, keeping simple for now */}
                                {!isLoading && (
                                    <Badge variant="outline" className="px-4 py-2.5 text-sm bg-card whitespace-nowrap rounded-2xl border-border/60">
                                        <span className="font-bold text-primary mr-1">{filteredTextbooks.length}</span> টি অধ্যায়
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Textbooks List */}
                        <div className="space-y-4 flex-1">
                            {isLoading && Array.from({ length: 4 }).map((_, i) => (
                                <Card key={i} className="overflow-hidden">
                                    <CardHeader className="flex px-6 pt-6 pb-6">
                                        <div className="flex gap-4">
                                            <Skeleton className="h-10 w-10 rounded-xl" />
                                            <div className="space-y-3 w-full">
                                                <Skeleton className="h-5 w-full max-w-[400px]" />
                                                <Skeleton className="h-4 w-3/4 max-w-[300px]" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))}
                            
                            {!isLoading && filteredTextbooks.length === 0 && (
                                <div className="flex flex-col items-center justify-center p-16 text-center bg-card rounded-2xl border border-dashed border-border/60 min-h-[300px] animate-fade-in">
                                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
                                        <BookOpen className="h-7 w-7 text-muted-foreground opacity-50" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 font-headline">কোনো পাঠ্যবই পাওয়া যায়নি</h3>
                                    <p className="text-muted-foreground max-w-sm">
                                        আপনার নির্বাচিত ফিল্টারের সাথে মিলে এমন কোনো অধ্যায় ডাটাবেসে নেই।
                                    </p>
                                    <Button variant="outline" className="mt-6 rounded-xl" onClick={resetFilters}>
                                        ফিল্টার রিসেট করুন
                                    </Button>
                                </div>
                            )}

                            {!isLoading && paginatedTextbooks.map((t: any, idx) => {
                                const serialIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                                return <TextbookCard key={t.id} textbook={t as Textbook} index={serialIndex} />
                            })}
                        </div>

                        {!isLoading && totalPages > 1 && (
                            <div className="mt-auto">
                                <PaginationControls 
                                    currentPage={currentPage} 
                                    totalPages={totalPages} 
                                    onPageChange={setCurrentPage} 
                                    totalItems={filteredTextbooks.length} 
                                />
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
