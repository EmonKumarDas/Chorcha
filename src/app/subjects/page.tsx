'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, GraduationCap, HelpCircle, Calculator, Globe, Code, PenTool, FlaskConical, Atom, Binary, Compass, Book, Briefcase, Search } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import type { Subject } from '@/types';

// Selected specific icons for faster loading (prevents the 1400+ icon import crash)
const iconComponents: { [key: string]: React.ElementType } = {
  Search, BookOpen, GraduationCap, HelpCircle, Calculator, Globe, Code,
  PenTool, FlaskConical, Atom, Binary, Compass, Book, Briefcase
};

const SubjectCard = ({ subject }: { subject: Subject }) => {
  const Icon = iconComponents[subject.icon] || HelpCircle;
  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/30">
      <Accordion type="single" collapsible>
        <AccordionItem value={subject.id} className="border-b-0">
          <AccordionTrigger className="p-4 hover:no-underline">
            <div className="flex w-full items-center gap-4 text-left">
              <div className="rounded-lg bg-primary/10 p-3">
                <Icon className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline text-lg font-bold">
                    {subject.class.toUpperCase()} - {subject.subjectName}
                  </h3>
                  {subject.isFree && <Badge variant="destructive">Free</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{subject.chapters?.length || 0}টি অধ্যায়</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {subject.chapters && subject.chapters.length > 0 ? (
              <ul className="space-y-2 pl-2">
                {subject.chapters.map((chapter, index) => (
                  <li key={index}>
                    <Link
                      href={`/subjects/${subject.id}/chapters/${encodeURIComponent(chapter.name)}`}
                      className="flex items-center gap-3 text-muted-foreground transition-colors hover:text-primary"
                    >
                      <BookOpen size={16} className="text-primary/70 shrink-0" />
                      <span>{chapter.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No chapters have been added for this subject yet.</p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

const SubjectCardSkeleton = () => (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4 p-4">
        <Skeleton className="h-14 w-14 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </CardHeader>
    </Card>
);

export default function SubjectsPage() {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const firestore = useFirestore();
  const subjectsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'subjects') : null),
    [firestore]
  );
  const { data: subjects, isLoading } = useCollection<Omit<Subject, 'id'>>(subjectsQuery);
  
  const { availableClasses, availableGroups } = useMemo(() => {
    if (!subjects) return { availableClasses: [], availableGroups: [] };
    const classSet = new Set<string>();
    const groupSet = new Set<string>();
    subjects.forEach(subject => {
        classSet.add(subject.class);
        groupSet.add(subject.group);
    });
    return {
        availableClasses: Array.from(classSet).sort(),
        availableGroups: Array.from(groupSet).sort()
    };
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    return subjects.filter(subject => {
      const classMatch = selectedClass === 'all' || subject.class === selectedClass;
      const groupMatch = selectedGroup === 'all' || subject.group === selectedGroup;
      return classMatch && groupMatch;
    });
  }, [subjects, selectedClass, selectedGroup]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-8">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
          <Select onValueChange={(value: string) => setSelectedClass(value)} defaultValue="all">
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="শ্রেণী নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল শ্রেণী</SelectItem>
              {availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={(value: string) => setSelectedGroup(value)} defaultValue="all">
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল বিভাগ</SelectItem>
              {availableGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {isLoading && Array.from({length: 6}).map((_, i) => <SubjectCardSkeleton key={i} />)}
        {!isLoading && filteredSubjects.map(subject => (
            <SubjectCard key={subject.id} subject={subject as Subject} />
        ))}
         {!isLoading && filteredSubjects.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground">
            No subjects found for the selected filters.
          </p>
        )}
      </div>
    </div>
  );
}
