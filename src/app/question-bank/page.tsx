'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Database, Landmark, ClipboardList, GraduationCap, Lightbulb } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { PageLoader } from '@/components/ui/page-loader';

// Default categories as fallback
const DEFAULT_CATEGORIES = [
  { id: 'chapter-wise', title: 'অধ্যায় ভিত্তিক প্রস্তুতি', icon: 'BookOpen', href: '/question-bank/chapter-wise' },
  { id: 'board-questions', title: 'বোর্ড প্রশ্ন', icon: 'Database', href: '/board-questions' }, // Main connection to the flow
  { id: 'college-questions', title: 'কলেজ প্রশ্ন', icon: 'Landmark', href: '/question-bank/college-questions' },
  { id: 'model-test', title: 'মডেল টেস্ট', icon: 'ClipboardList', href: '/question-bank/model-test' },
  { id: 'university-questions', title: 'ইউনিভার্সিটি প্রশ্ন', icon: 'GraduationCap', href: '/question-bank/university-questions' },
  { id: 'suggestion', title: 'সাজেশন', icon: 'Lightbulb', href: '/question-bank/suggestion' },
];

function getIconComponent(iconName: string) {
    switch (iconName) {
        case 'BookOpen': return BookOpen;
        case 'Database': return Database;
        case 'Landmark': return Landmark;
        case 'ClipboardList': return ClipboardList;
        case 'GraduationCap': return GraduationCap;
        case 'Lightbulb': return Lightbulb;
        default: return BookOpen;
    }
}

export default function QuestionBankHubPage() {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    // Query categories from the database as requested
    const categoriesQuery = useMemoFirebase(() => 
        firestore ? collection(firestore, 'educationCategories') : null, 
    [firestore]);
    
    // The collection might not exist yet, we handle fallback gracefully
    const { data: dbCategories, isLoading } = useCollection(categoriesQuery);

    const categories = useMemo(() => {
        if (dbCategories && dbCategories.length > 0) {
            // Sort by order field if it exists
            return [...dbCategories].sort((a, b) => (a.order || 0) - (b.order || 0)).map(doc => ({
                id: doc.id,
                title: doc.title || 'অজানা বিভাগ',
                icon: doc.icon || 'BookOpen',
                href: doc.href || `/question-bank/${doc.id}`
            }));
        }
        return DEFAULT_CATEGORIES;
    }, [dbCategories]);

    const filteredCategories = categories.filter(c => 
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return <PageLoader text="প্রশ্ন ব্যাংক লোড হচ্ছে..." />;
    }

    return (
        <div className="min-h-screen bg-transparent">
            <div className="container mx-auto px-4 py-8 md:py-16 max-w-5xl animate-fade-in">
                {/* Search Bar */}
                <div className="relative mb-12 max-w-2xl mx-auto group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="প্রশ্ন বা কীওয়ার্ড অনুসন্ধান করুন..." 
                        className="pl-12 h-14 text-base rounded-2xl bg-white/5 border-white/10 hover:border-white/15 focus:border-primary/50 shadow-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Categories Grid — Liquid Glass */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {filteredCategories.map((category, i) => {
                        const Icon = getIconComponent(category.icon);
                        return (
                            <Link key={category.id} href={category.href}>
                                <div 
                                    className="liquid-card h-[160px] md:h-[180px] flex flex-col items-center justify-center p-6 space-y-4 cursor-pointer group stagger-item"
                                    style={{ animationDelay: `${i * 0.08}s` }}
                                >
                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors border border-primary/20 group-hover:border-primary/30">
                                        <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                                    </div>
                                    <h3 className="font-headline font-semibold text-base md:text-lg text-foreground/90 group-hover:text-foreground text-center">
                                        {category.title}
                                    </h3>
                                </div>
                            </Link>
                        );
                    })}
                </div>
                
                {filteredCategories.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground">
                        কোনো ফলাফল পাওয়া যায়নি।
                    </div>
                )}
            </div>
        </div>
    );
}
