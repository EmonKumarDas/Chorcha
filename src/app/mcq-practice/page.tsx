"use client";

import { useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { doc, collection, getDocs, query, limit } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import MathRenderer from '@/components/MathRenderer';

type MCQ = {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
};

function McqPracticeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const questionId = searchParams.get('questionId');
    const firestore = useFirestore();
    
    const [nextQuestionId, setNextQuestionId] = useState<string | null>(null);

    const mcqDocRef = useMemoFirebase(() => {
        if (!firestore || !questionId) return null;
        return doc(firestore, 'mcqs', questionId);
    }, [firestore, questionId]);

    const { data: mcqQuestion, isLoading } = useDoc<Omit<MCQ, 'id'>>(mcqDocRef);

    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    useMemo(() => {
      async function findNextQuestion() {
        if (firestore) {
          const q = query(collection(firestore, 'mcqs'), limit(1));
          const snapshot = await getDocs(q);
          if (!snapshot.empty && snapshot.docs[0].id !== questionId) {
             setNextQuestionId(snapshot.docs[0].id);
          } else if(snapshot.docs.length > 1 && snapshot.docs[0].id === questionId) {
             setNextQuestionId(snapshot.docs[1].id);
          }
        }
      }
      findNextQuestion();
    }, [firestore, questionId]);


    const handleAnswer = (index: number) => {
        if (isAnswered) return;
        setSelectedAnswer(index);
        setIsAnswered(true);
    };

    const handleNextQuestion = () => {
        if (nextQuestionId) {
            router.push(`/mcq-practice?questionId=${nextQuestionId}`);
            // Reset state for the new question
            setSelectedAnswer(null);
            setIsAnswered(false);
        }
    }


    if (isLoading) {
        return (
            <div className="container mx-auto max-w-3xl px-4 py-12">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-4 w-16" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-12 w-full mb-8" />
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <div className="flex w-full justify-between">
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    if (!mcqQuestion) {
        return (
            <div className="container mx-auto max-w-3xl px-4 py-12">
                <Card>
                    <CardHeader>
                        <CardTitle>Question not found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>The requested MCQ question could not be found. Please make sure you have loaded the sample data.</p>
                         <Button asChild className="mt-4"><a href="/">Go Home</a></Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-3xl px-4 py-12">
        <Card>
            <CardHeader>
            <CardTitle className="font-headline text-3xl">MCQ Practice</CardTitle>
            <CardDescription>প্রশ্ন ১</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="mb-8 font-headline text-2xl md:text-3xl leading-relaxed">
                <MathRenderer content={mcqQuestion.text} />
            </div>
            <div className="space-y-4">
                {mcqQuestion.options.map((option, index) => {
                const isCorrect = index === mcqQuestion.correctAnswerIndex;
                const isSelected = index === selectedAnswer;
                
                return (
                    <Button
                    key={index}
                    variant="outline"
                    size="lg"
                    className={cn(
                        "w-full justify-start h-auto py-4 text-lg font-normal whitespace-normal text-left",
                        isAnswered && isCorrect && "bg-green-100 border-green-400 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900",
                        isAnswered && isSelected && !isCorrect && "bg-red-100 border-red-400 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
                    )}
                    onClick={() => handleAnswer(index)}
                    disabled={isAnswered}
                    >
                    <span className="mr-4 flex h-6 w-6 items-center justify-center rounded-full border border-primary text-primary">
                        {String.fromCharCode(0x0995 + index)} {/* ক, খ, গ, ঘ */}
                    </span>
                    <MathRenderer content={option} inline />
                    {isAnswered && isCorrect && <CheckCircle className="ml-auto h-6 w-6 text-green-600" />}
                    {isAnswered && isSelected && !isCorrect && <XCircle className="ml-auto h-6 w-6 text-red-600" />}
                    </Button>
                );
                })}
            </div>
            </CardContent>
            <CardFooter className="flex-col items-start">
            {isAnswered && (
                <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="explanation">
                    <AccordionTrigger className="text-xl">Explanation</AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <div className="text-muted-foreground"><MathRenderer content={mcqQuestion.explanation} /></div>
                    </AccordionContent>
                </AccordionItem>
                </Accordion>
            )}
            <div className="mt-8 flex w-full justify-between">
                <Button variant="outline" disabled><ArrowLeft className="mr-2 h-4 w-4" /> আগের প্রশ্ন</Button>
                <Button onClick={handleNextQuestion} disabled={!nextQuestionId}>পরবর্তী প্রশ্ন <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
            </CardFooter>
        </Card>
        </div>
    );
}

export default function McqPracticePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <McqPracticeContent />
        </Suspense>
    );
}
