'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type BoardQuestion = {
    createdAt?: Timestamp;
};
type MCQ = {
    createdAt?: Timestamp;
};

export default function AdminDashboard() {
  const firestore = useFirestore();
  
  const [stats, setStats] = useState({
    totalQuestions: 0,
    newQuestionsToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const boardQuestionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'boardQuestions') : null, [firestore]);
  const { data: boardQuestions, isLoading: boardQuestionsLoading } = useCollection<BoardQuestion>(boardQuestionsQuery);

  const mcqsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'mcqs') : null, [firestore]);
  const { data: mcqs, isLoading: mcqsLoading } = useCollection<MCQ>(mcqsQuery);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (firestore && !boardQuestionsLoading && !mcqsLoading) {
      const totalBoardQuestions = boardQuestions?.length ?? 0;
      const totalMcqs = mcqs?.length ?? 0;
      const totalQuestions = totalBoardQuestions + totalMcqs;

      const newBoardQuestions = boardQuestions?.filter(q => q.createdAt && q.createdAt.toDate() >= today).length ?? 0;
      const newMcqs = mcqs?.filter(m => m.createdAt && m.createdAt.toDate() >= today).length ?? 0;

      const newQuestionsToday = newBoardQuestions + newMcqs;
      
      setStats({
        totalQuestions,
        newQuestionsToday,
      });
      setIsLoading(false);
    }
  }, [firestore, boardQuestions, mcqs, boardQuestionsLoading, mcqsLoading]);


  return (
    <div>
        <h1 className="text-2xl font-semibold mb-4">Dashboard Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Questions
                    </CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats.totalQuestions}</div>}
                    <p className="text-xs text-muted-foreground">
                        Total questions in the database
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">New Questions Today</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">+{stats.newQuestionsToday}</div>}
                    <p className="text-xs text-muted-foreground">
                        Uploaded in the last 24 hours
                    </p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
