import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, User, ArrowRight, LibraryBig } from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export interface Textbook {
  id: string;
  metadata?: {
    class?: string;
    subject?: string;
    subject_paper?: string;
    chapter_no?: number;
    chapter_name?: string;
    chapter_name_english?: string;
    book_name?: string;
    author?: string;
    edition?: string;
  };
  // other fields might be present, but we mainly need metadata for the card
}

interface TextbookCardProps {
  textbook: Textbook;
  index: number;
}

export function TextbookCard({ textbook, index }: TextbookCardProps) {
  const meta = textbook.metadata || {};
  
  return (
    <Card className="group relative overflow-hidden bg-card/40 border-border/40 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 animate-slide-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-500" />
      
      <CardHeader className="pb-3 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 rounded-lg px-2.5 py-0.5">
              <LibraryBig className="w-3.5 h-3.5 mr-1" />
              অধ্যায় {meta.chapter_no || '-'}
            </Badge>
            {meta.subject && (
              <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5 shadow-sm">
                {meta.subject}
              </Badge>
            )}
            {meta.class && (
              <Badge variant="outline" className="rounded-lg px-2.5 py-0.5">
                <GraduationCap className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                {meta.class}
              </Badge>
            )}
          </div>
          
          <div>
            <h3 className="font-headline text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
              {meta.chapter_name || 'অধ্যায়ের নাম নেই'}
            </h3>
            {meta.chapter_name_english && (
              <p className="text-sm font-medium text-muted-foreground/80 mt-1 uppercase tracking-wide">
                {meta.chapter_name_english}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {meta.book_name && (
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary/70" />
                <span>বই: <span className="font-medium text-foreground/80">{meta.book_name}</span></span>
                {meta.subject_paper && <span className="text-xs border-l pl-2 border-border">({meta.subject_paper})</span>}
              </div>
            )}
            {meta.author && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary/70" />
                <span>লেখক: <span className="font-medium text-foreground/80">{meta.author}</span></span>
              </div>
            )}
            {meta.edition && (
              <p className="text-xs text-muted-foreground/70 pl-6">
                সংস্করণ: {meta.edition}
              </p>
            )}
          </div>
          
          <div className="pt-2 md:pt-0">
            <Link href={`/textbooks/${textbook.id}`}>
              <Button className="w-full md:w-auto rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-0.5 transition-all duration-300 group/btn">
                <BookOpen className="w-4 h-4 mr-2" />
                পড়তে শুরু করুন
                <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
