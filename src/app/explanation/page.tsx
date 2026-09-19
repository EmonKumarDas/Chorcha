'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import MathRenderer from '@/components/MathRenderer';

type Question = {
    text: string;
    board: string;
    year: number;
    subject: string;
    explanation: string;
}

function ExplanationContent() {
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const questionId = searchParams.get('questionId');
    const questionType = searchParams.get('type');

    const collectionName = useMemo(() => {
        if (questionType === 'mcq') return 'mcqs';
        if (questionType === 'cq') return 'boardQuestions';
        return null;
    }, [questionType]);

    const questionDocRef = useMemoFirebase(() => {
        if (!firestore || !questionId || !collectionName) return null;
        return doc(firestore, collectionName, questionId);
    }, [firestore, questionId, collectionName]);

    const { data: question, isLoading } = useDoc<Question>(questionDocRef);

    if (isLoading) {
        return (
             <div className="container mx-auto max-w-3xl px-4 py-12">
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/4 mb-8" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-10 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                       <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!question) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>The requested explanation could not be found. Please check the URL or go back.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-3xl px-4 py-12">
            <div>
                <div className="mb-8">
                    <div className="font-headline text-2xl md:text-3xl leading-relaxed"><MathRenderer content={question.text} /></div>
                     <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                        <Badge variant="outline">{question.subject}</Badge>
                        <span>|</span>
                        <span>{question.board} বোর্ড</span>
                        <span>|</span>
                        <span>{question.year}</span>
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">Explanation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-muted-foreground"><MathRenderer content={question.explanation} /></div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function ExplanationPage() {
  return (
    <Suspense fallback={<div>Loading explanation...</div>}>
      <ExplanationContent />
    </Suspense>
  );
}
